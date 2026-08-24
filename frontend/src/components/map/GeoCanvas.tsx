import React, { useEffect, useRef, useState } from 'react';
import { VehicleClass } from '../../types';

interface GeoCanvasProps {
  vclass: VehicleClass;
  segments?: any[];
  locations?: any[];
  vehicles?: any[];
  onSegmentClick?: (seg: any) => void;
}

// Score → color
function scoreColor(score: number, status: string): string {
  if (status === 'CLOSED') return '#EF4444';
  if (status === 'SUSPECTED') return '#F59E0B';
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#FBBF24';
  if (score >= 30) return '#F97316';
  return '#EF4444';
}

// Fallback synthetic corridor for when DB is empty
const SYNTHETIC_NODES: [number, number][] = [
  [26.1445, 91.7362], [26.1100, 91.8600], [26.0400, 91.8700],
  [25.9000, 91.8800], [25.7400, 91.8900], [25.6600, 91.9000],
  [25.5700, 91.8800], [25.5400, 91.9500], [25.5600, 92.0500],
  [25.4900, 92.1500], [25.4500, 92.2000], [25.4800, 92.3100]
];

export const GeoCanvas: React.FC<GeoCanvasProps> = ({
  vclass,
  segments = [],
  locations = [],
  vehicles = [],
  onSegmentClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedSeg, setSelectedSeg] = useState<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#0B0F19';
    ctx.fillRect(0, 0, width, height);

    // Bounding box: Guwahati ↔ Jowai corridor
    const minLat = 25.30, maxLat = 26.30;
    const minLon = 91.30, maxLon = 92.60;

    const project = (lat: number, lon: number): [number, number] => {
      const x = ((lon - minLon) / (maxLon - minLon)) * (width - 100) + 50;
      const y = height - (((lat - minLat) / (maxLat - minLat)) * (height - 100) + 50);
      return [x, y];
    };

    // Grid
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // ── Draw road segments from API data ──────────────────────────────────
    if (segments.length > 0) {
      for (const feat of segments) {
        const geom = feat.geometry;
        const props = feat.properties || feat;
        const score = props.accessibility_score ?? 85;
        const status = props.status ?? 'OPEN';
        const color = scoreColor(score, status);

        if (geom?.type === 'LineString' && geom.coordinates?.length >= 2) {
          const coords: [number, number][] = geom.coordinates; // [lon, lat]

          ctx.beginPath();
          const [x0, y0] = project(coords[0][1], coords[0][0]);
          ctx.moveTo(x0, y0);
          for (let i = 1; i < coords.length; i++) {
            const [xi, yi] = project(coords[i][1], coords[i][0]);
            ctx.lineTo(xi, yi);
          }
          ctx.strokeStyle = color;
          ctx.lineWidth = status === 'CLOSED' ? 5 : 3.5;
          ctx.stroke();

          // Hazard halo for closed segments
          if (status === 'CLOSED') {
            ctx.strokeStyle = 'rgba(239,68,68,0.25)';
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            for (let i = 1; i < coords.length; i++) {
              const [xi, yi] = project(coords[i][1], coords[i][0]);
              ctx.lineTo(xi, yi);
            }
            ctx.stroke();
          }
        }
      }
    } else {
      // ── Synthetic fallback corridor ───────────────────────────────────
      for (let i = 0; i < SYNTHETIC_NODES.length - 1; i++) {
        const [lat1, lon1] = SYNTHETIC_NODES[i];
        const [lat2, lon2] = SYNTHETIC_NODES[i + 1];
        const [x1, y1] = project(lat1, lon1);
        const [x2, y2] = project(lat2, lon2);
        const isClosed = i === 3 || i === 4;
        ctx.strokeStyle = isClosed ? '#EF4444' : '#10B981';
        ctx.lineWidth = isClosed ? 5 : 3.5;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        if (isClosed) {
          ctx.strokeStyle = 'rgba(239,68,68,0.25)';
          ctx.lineWidth = 14;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
      }
    }

    // ── Location markers ─────────────────────────────────────────────────
    for (const loc of locations) {
      const coords = loc.coordinates || [91.88, 25.57];
      const [x, y] = project(coords[1], coords[0]);
      const r = loc.kind === 'depot' ? 8 : loc.kind === 'health' ? 6 : 4;
      const fill = loc.kind === 'depot' ? '#3B82F6' : loc.kind === 'health' ? '#EC4899' : '#10B981';

      ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.fillStyle = '#E5E7EB'; ctx.font = '10px Inter';
      ctx.fillText(loc.name ?? '', x + 10, y + 3);
    }

    // ── Vehicle markers ───────────────────────────────────────────────────
    vehicles.forEach((v, idx) => {
      const lat = 26.14 - idx * 0.05;
      const lon = 91.73 + idx * 0.04;
      const [x, y] = project(lat, lon);

      ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = v.vclass === vclass ? '#8B5CF6' : '#6B7280';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();

      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 9px Inter';
      ctx.fillText(v.label ?? v.id?.slice(0, 5), x - 12, y - 10);
    });

  }, [vclass, segments, locations, vehicles]);

  // ── Click handler: find nearest segment ─────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSegmentClick || segments.length === 0) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Find the segment whose first coordinate is closest to click
    let closest: any = null;
    let minDist = 30; // pixel threshold
    const canvas = canvasRef.current!;
    const w = canvas.width, h = canvas.height;
    const minLat = 25.30, maxLat = 26.30, minLon = 91.30, maxLon = 92.60;
    const project = (lat: number, lon: number): [number, number] => {
      const x = ((lon - minLon) / (maxLon - minLon)) * (w - 100) + 50;
      const y = h - (((lat - minLat) / (maxLat - minLat)) * (h - 100) + 50);
      return [x, y];
    };
    for (const feat of segments) {
      const coords = feat.geometry?.coordinates;
      if (!coords?.length) continue;
      const mid = coords[Math.floor(coords.length / 2)];
      const [px, py] = project(mid[1], mid[0]);
      const d = Math.sqrt((px - mx) ** 2 + (py - my) ** 2);
      if (d < minDist) { minDist = d; closest = feat.properties || feat; }
    }
    if (closest) { setSelectedSeg(closest); onSegmentClick(closest); }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px] bg-[#0B0F19] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
      <canvas ref={canvasRef} className="w-full h-full block cursor-pointer" onClick={handleCanvasClick} />

      {/* Layer legend */}
      <div className="absolute top-4 left-4 glass-panel p-3 rounded-xl border border-gray-800 text-xs space-y-1.5 shadow-xl">
        <div className="font-semibold text-gray-200 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          Guwahati → Shillong → Jowai Corridor
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-1 bg-emerald-500 rounded" /> Open ≥80</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1 bg-amber-400 rounded" /> Mod 50–79</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1 bg-orange-500 rounded" /> Diff 30–49</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1 bg-rose-500 rounded" /> Critical / Closed</span>
        </div>
        <div className="text-[11px] text-gray-500">
          {segments.length > 0 ? `${segments.length} segments loaded from DB` : 'Synthetic corridor (no DB data)'}
        </div>
      </div>

      {/* Selected segment detail */}
      {selectedSeg && (
        <div className="absolute bottom-4 right-4 glass-panel p-4 rounded-xl border border-gray-800 w-72 text-xs text-gray-200 shadow-2xl">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-blue-400">Segment #{selectedSeg.id}</h4>
            <button onClick={() => setSelectedSeg(null)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <p>Status: <span className={`font-semibold ${selectedSeg.status === 'OPEN' ? 'text-emerald-400' : selectedSeg.status === 'CLOSED' ? 'text-rose-400' : 'text-amber-400'}`}>{selectedSeg.status}</span></p>
          <p>Accessibility ({vclass.toUpperCase()}): <span className="font-bold">{selectedSeg.accessibility_score} / 100</span></p>
          <p>Landslide Risk 24h: <span className="font-semibold text-amber-400">{((selectedSeg.p_landslide_24h ?? 0) * 100).toFixed(0)}%</span></p>
          <p>Highway: <span className="text-gray-300">{selectedSeg.highway_class ?? 'N/A'}</span></p>
          <p>Surface: <span className="text-gray-300">{selectedSeg.surface ?? 'N/A'}</span></p>
          <p>Length: <span className="text-gray-300">{selectedSeg.length_m ? `${(selectedSeg.length_m / 1000).toFixed(1)} km` : 'N/A'}</span></p>
        </div>
      )}
    </div>
  );
};
