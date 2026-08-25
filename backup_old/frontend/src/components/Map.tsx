import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Segment {
  name: string; status: string; coordinates: number[][];
  landslide_risk?: number; flood_risk?: number; surface?: string;
  bridge_limit_tonnes?: number; notes?: string;
}

interface LNSMapProps {
  segments: Record<string, Segment>;
  routeCoords?: number[][];
  routeStatus?: string;
  locations?: Record<string, any>;
  onSegmentClick?: (id: string) => void;
}

function statusColor(status: string): number[] {
  if (status === 'CLOSED') return [239, 68, 68, 255];
  if (status === 'SUSPECTED') return [245, 158, 11, 255];
  return [34, 197, 94, 255];
}

export default function LNSMap({ segments, routeCoords, routeStatus, locations = {}, onSegmentClick }: LNSMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          }
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
      },
      center: [91.97, 25.85], zoom: 8.5, pitch: 30
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      // Base corridor source
      map.addSource('corridors', { type: 'geojson', data: buildGeoJson(segments) });
      map.addLayer({ id: 'corridor-glow', type: 'line', source: 'corridors',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['match', ['get', 'status'], 'CLOSED', '#ef4444', 'SUSPECTED', '#f59e0b', '#22c55e'],
          'line-width': 16, 'line-opacity': 0.2, 'line-blur': 8
        }
      });
      map.addLayer({ id: 'corridors', type: 'line', source: 'corridors',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['match', ['get', 'status'], 'CLOSED', '#ef4444', 'SUSPECTED', '#f59e0b', '#22c55e'],
          'line-width': 4, 'line-dasharray': ['match', ['get', 'status'], 'CLOSED', ['literal', [4, 4]], ['literal', [1]]]
        }
      });

      map.on('click', 'corridors', (e) => {
        if (e.features && e.features[0] && onSegmentClick) {
          onSegmentClick(e.features[0].properties.id);
        }
      });
      map.on('mouseenter', 'corridors', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'corridors', () => { map.getCanvas().style.cursor = ''; });

      // City hubs
      map.addSource('hubs', { type: 'geojson', data: buildHubGeoJson(locations) });
      map.addLayer({ id: 'hub-glow', type: 'circle', source: 'hubs',
        paint: { 'circle-radius': 16, 'circle-color': '#3b82f6', 'circle-opacity': 0.2 }
      });
      map.addLayer({ id: 'hub-dots', type: 'circle', source: 'hubs',
        paint: { 'circle-radius': 7, 'circle-color': '#3b82f6', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
      });
      map.addLayer({ id: 'hub-labels', type: 'symbol', source: 'hubs',
        layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-anchor': 'top', 'text-offset': [0, 1.2] },
        paint: { 'text-color': '#e2e8f0', 'text-halo-color': '#0a0a0f', 'text-halo-width': 1.5 }
      });

      // Active route highlight layer (empty initially)
      map.addSource('active-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'route-highlight-glow', type: 'line', source: 'active-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#a78bfa', 'line-width': 20, 'line-opacity': 0.25, 'line-blur': 10 }
      });
      map.addLayer({ id: 'route-highlight', type: 'line', source: 'active-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#a78bfa', 'line-width': 5 }
      });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update corridors when LNS changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('corridors') as maplibregl.GeoJSONSource;
    if (src) src.setData(buildGeoJson(segments));
  }, [segments]);

  // Update hubs when locations change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('hubs') as maplibregl.GeoJSONSource;
    if (src) src.setData(buildHubGeoJson(locations));
  }, [locations]);

  // Update active route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('active-route') as maplibregl.GeoJSONSource;
    if (!src) return;
    if (routeCoords && routeCoords.length >= 2) {
      src.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoords }, properties: {} }]
      });
      // Auto-zoom to route
      const bounds = new maplibregl.LngLatBounds(routeCoords[0] as [number, number], routeCoords[0] as [number, number]);
      for (const coord of routeCoords) {
        bounds.extend(coord as [number, number]);
      }
      map.fitBounds(bounds, { padding: 80, duration: 1500 });
    } else {
      src.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [routeCoords]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={container} style={{ width: '100%', height: '100%' }} />
      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, background: 'rgba(14,14,20,0.92)', border: '1px solid #2a2a35', borderRadius: 10, padding: '12px 14px', fontSize: 11, color: '#9ca3af', backdropFilter: 'blur(8px)' }}>
        <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 8, fontSize: 12 }}>🛣️ NE-Setu Network State</div>
        {[['#22c55e','Open & Traversable'],['#f59e0b','Suspected Disruption'],['#ef4444','Closed — Hazard'],['#a78bfa','Selected Route']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 24, height: 3, background: c, borderRadius: 2, display:'inline-block' }} />
            <span>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildGeoJson(segments: Record<string, Segment>): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: Object.entries(segments).map(([id, s]) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: s.coordinates },
      properties: { id, name: s.name, status: s.status }
    }))
  };
}

function buildHubGeoJson(locations: Record<string, any>): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: Object.entries(locations).map(([name, loc]) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [loc.lon, loc.lat] },
      properties: { name }
    }))
  };
}
