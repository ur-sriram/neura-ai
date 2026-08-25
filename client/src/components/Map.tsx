/**
 * MAP COMPONENT — Enhanced Leaflet (OpenStreetMap + ESRI + CartoDB)
 * No API key required. Supports 5 tile variants and Assam boundary overlay.
 * Provides a google.maps-compatible shim so existing overlay code works unchanged.
 */

import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

export type MapVariant = "street" | "dark" | "satellite" | "hybrid" | "topo";
type LatLngLiteral = { lat: number; lng: number };

// ─── Tile layer configurations ────────────────────────────────────────────────
const TILE_CONFIGS: Record<MapVariant, {
  url: string; attribution: string; maxZoom: number;
  subdomains?: string; overlay?: string;
}> = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, DigitalGlobe, GeoEye, i-cubed",
    maxZoom: 18,
  },
  hybrid: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 18,
    overlay: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
  },
  topo: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap",
    maxZoom: 18,
  },
};

const ASSAM_BOUNDARY_URL =
  "https://raw.githubusercontent.com/shijithpk/2024_maps_supplement/main/assam_ls_new_borders.geojson";

// ─── CDN loader helpers ───────────────────────────────────────────────────────
function ensureLeafletCSS() {
  if (document.getElementById("leaflet-css")) return;
  const link = document.createElement("link");
  link.id = "leaflet-css";
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

function loadLeaflet(): Promise<any> {
  if ((window as any).L) return Promise.resolve((window as any).L);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => resolve((window as any).L);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── LeafletMap: core map class ───────────────────────────────────────────────
export class LeafletMap {
  _map: any;
  private _baseLayer: any;
  private _overlayLayer: any;

  constructor(container: HTMLElement, opts: {
    zoom: number;
    center: LatLngLiteral;
    variant?: MapVariant;
    showBoundaries?: boolean;
    showLayerControl?: boolean;
  }) {
    const L = (window as any).L;
    const variant = opts.variant ?? "street";
    const cfg = TILE_CONFIGS[variant];

    this._map = L.map(container, { zoomControl: true }).setView(
      [opts.center.lat, opts.center.lng], opts.zoom
    );

    this._baseLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
      subdomains: cfg.subdomains ?? "abc",
    }).addTo(this._map);

    if (cfg.overlay) {
      this._overlayLayer = L.tileLayer(cfg.overlay, {
        attribution: "",
        maxZoom: 20,
        subdomains: "abcd",
        opacity: 0.85,
      }).addTo(this._map);
    }

    // ── Layer control switcher ──
    if (opts.showLayerControl) {
      const mkTile = (v: MapVariant) => {
        const c = TILE_CONFIGS[v];
        return L.tileLayer(c.url, { attribution: c.attribution, maxZoom: c.maxZoom, subdomains: c.subdomains ?? "abc" });
      };
      const baseMaps: Record<string, any> = {
        "🗺️ Street":    mkTile("street"),
        "🌑 Dark":      mkTile("dark"),
        "🛰️ Satellite": mkTile("satellite"),
        "🌐 Hybrid":    mkTile("hybrid"),
        "🗻 Terrain":   mkTile("topo"),
      };
      L.control.layers(baseMaps, {}, { position: "topright", collapsed: false }).addTo(this._map);
    }

    // ── Assam boundary GeoJSON ──
    if (opts.showBoundaries) {
      fetch(ASSAM_BOUNDARY_URL)
        .then(r => r.json())
        .then(data => {
          const isDark = variant === "dark" || variant === "satellite" || variant === "hybrid";
          L.geoJSON(data, {
            style: {
              color: "#b84b76",
              weight: isDark ? 1.5 : 2,
              fillColor: isDark ? "#b84b76" : "#ff7800",
              fillOpacity: 0.06,
              dashArray: "6 4",
            },
          }).addTo(this._map);
        })
        .catch(() => {/* network unavailable — silently skip */});
    }
  }

  fitBounds(bounds: LeafletLatLngBounds, padding: number) {
    const pts = bounds._get();
    if (pts.length > 1) this._map.fitBounds(pts, { padding: [padding, padding] });
  }
  setCenter(pos: LatLngLiteral) {
    this._map.setView([pos.lat, pos.lng]);
  }
}

// ─── google.maps shim classes ─────────────────────────────────────────────────

class LeafletLatLngBounds {
  private _pts: [number, number][] = [];
  extend(p: LatLngLiteral) { this._pts.push([p.lat, p.lng]); }
  _get() { return this._pts; }
}

class LeafletMarker {
  _marker: any;
  constructor(opts: {
    map: LeafletMap;
    position: LatLngLiteral;
    title?: string;
    label?: { text: string; color?: string; fontWeight?: string };
    icon?: { path: string; fillColor?: string; strokeColor?: string; strokeWeight?: number; scale?: number };
  }) {
    const L = (window as any).L;
    let icon: any;
    if (opts.icon?.path === "CIRCLE") {
      icon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:${opts.icon.fillColor ?? "#b84b76"};border:${opts.icon.strokeWeight ?? 2}px solid ${opts.icon.strokeColor ?? "#fff"};box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      });
    } else if (opts.label?.text) {
      icon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#b84b76;border:2.5px solid #fff;color:#fff;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.45);font-family:Arial">${opts.label.text}</div>`,
        iconSize: [32, 32], iconAnchor: [16, 16],
      });
    }
    this._marker = icon
      ? L.marker([opts.position.lat, opts.position.lng], { icon, title: opts.title ?? "" })
      : L.marker([opts.position.lat, opts.position.lng], { title: opts.title ?? "" });
    this._marker.addTo(opts.map._map);
  }
  setMap(m: LeafletMap | null) { m ? this._marker.addTo(m._map) : this._marker.remove(); }
  addListener(ev: string, cb: () => void) { this._marker.on(ev, cb); }
  getLatLng() { return this._marker.getLatLng(); }
}

class LeafletPolyline {
  private _line: any;
  constructor(opts: { path: LatLngLiteral[]; strokeColor?: string; strokeOpacity?: number; strokeWeight?: number; map: LeafletMap; geodesic?: boolean }) {
    this._line = (window as any).L.polyline(
      opts.path.map(p => [p.lat, p.lng]),
      { color: opts.strokeColor ?? "#b84b76", opacity: opts.strokeOpacity ?? 0.9, weight: opts.strokeWeight ?? 5 }
    ).addTo(opts.map._map);
  }
  setMap(m: LeafletMap | null) { m ? this._line.addTo(m._map) : this._line.remove(); }
}

class LeafletCircle {
  private _c: any;
  constructor(opts: { map: LeafletMap; center: LatLngLiteral; radius: number; fillColor?: string; fillOpacity?: number; strokeColor?: string; strokeWeight?: number }) {
    this._c = (window as any).L.circle([opts.center.lat, opts.center.lng], {
      radius: opts.radius,
      color: opts.strokeColor ?? "#b97820",
      fillColor: opts.fillColor ?? "#dba34b",
      fillOpacity: opts.fillOpacity ?? 0.16,
      weight: opts.strokeWeight ?? 1,
    }).addTo(opts.map._map);
  }
  setMap(m: LeafletMap | null) { m ? this._c.addTo(m._map) : this._c.remove(); }
}

class LeafletInfoWindow {
  private _popup: any;
  constructor() { this._popup = (window as any).L.popup({ maxWidth: 240 }); }
  setContent(html: string) { this._popup.setContent(html); }
  open(opts: { map: LeafletMap; anchor: LeafletMarker }) {
    this._popup.setLatLng(opts.anchor.getLatLng()).openOn(opts.map._map);
  }
}

// ─── Inject google.maps shim ──────────────────────────────────────────────────
function injectGoogleMapsShim() {
  if ((window as any).google?.maps) return;
  (window as any).google = {
    maps: {
      Marker: LeafletMarker,
      Polyline: LeafletPolyline,
      Circle: LeafletCircle,
      InfoWindow: LeafletInfoWindow,
      LatLngBounds: LeafletLatLngBounds,
      SymbolPath: { CIRCLE: "CIRCLE" },
      geometry: { encoding: { decodePath: (_: string) => [] as any[] } },
    },
  };
}

// ─── MapView component ────────────────────────────────────────────────────────
interface MapViewProps {
  className?: string;
  initialCenter?: LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: any) => void;
  variant?: MapVariant;
  showBoundaries?: boolean;
  showLayerControl?: boolean;
}

export function MapView({
  className,
  initialCenter = { lat: 26.5, lng: 92.85 },
  initialZoom = 7,
  onMapReady,
  variant = "street",
  showBoundaries = false,
  showLayerControl = false,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const init = usePersistFn(async () => {
    if (mapRef.current || !mapContainer.current) return;
    ensureLeafletCSS();
    await loadLeaflet();
    injectGoogleMapsShim();
    const lmap = new LeafletMap(mapContainer.current, {
      zoom: initialZoom,
      center: initialCenter,
      variant,
      showBoundaries,
      showLayerControl,
    });
    mapRef.current = lmap;
    if (onMapReady) onMapReady(lmap);
  });

  useEffect(() => { init(); }, [init]);

  return <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />;
}
