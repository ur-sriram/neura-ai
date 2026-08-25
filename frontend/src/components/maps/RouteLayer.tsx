import React from 'react';
import { Polyline, Popup } from 'react-leaflet';
import { RouteOption } from '../../types';
import { Badge } from '../common/Badge';
import { Route, Gauge, ShieldAlert, Sparkles } from 'lucide-react';

interface RouteLayerProps {
  routes: RouteOption[];
  showRiverways?: boolean;
  showRailways?: boolean;
  onSelectRoute?: (route: RouteOption) => void;
}

export const RouteLayer: React.FC<RouteLayerProps> = ({
  routes,
  showRiverways = true,
  showRailways = true,
  onSelectRoute,
}) => {
  // Additional specialized Multi-modal networks for full Northeast coverage
  const specializedCorridors: {
    id: string;
    name: string;
    type: 'river' | 'rail';
    coordinates: [number, number][];
    status: string;
    description: string;
  }[] = [
    {
      id: 'spec-nw2',
      name: 'National Waterway 2 (Brahmaputra River Corridor)',
      type: 'river',
      coordinates: [
        [26.0200, 89.9700], // Dhubri Gateway
        [26.1100, 90.6200], // Goalpara
        [26.1700, 91.7000], // Pandu Port (Guwahati)
        [26.2500, 92.1000], // Morigaon
        [26.6338, 92.7926], // Tezpur River Port
        [26.7200, 93.5500], // Silghat
        [26.9800, 94.2500], // Majuli Island sector
        [27.4728, 94.9120], // Bogibeel Port (Dibrugarh)
      ],
      status: 'Optimal 2.8m Draft',
      description: 'Primary inland heavy freight water arterial. Low-carbon bypass for hill terrain bottlenecks.',
    },
    {
      id: 'spec-rail-agt',
      name: 'Northeast Frontier Railway Lumding-Badarpur-Agartala Trunk',
      type: 'rail',
      coordinates: [
        [26.1445, 91.7362], // Guwahati
        [25.7500, 93.1700], // Lumding Junction
        [25.1800, 93.0100], // Jatinga Valley Hill Section
        [24.8967, 92.5714], // Badarpur Junction
        [24.3800, 92.1600], // Dharmanagar
        [24.0500, 92.0100], // Kumarghat
        [23.8315, 91.2868], // Agartala Rail Terminal
      ],
      status: 'Active Freight Operations',
      description: 'Critical broad-gauge hill railway lifeline connecting Assam, Barak Valley, and Tripura.',
    },
  ];

  const getRouteColor = (route: RouteOption) => {
    if (route.modes.includes('Water')) return '#06b6d4'; // Riverway Cyan
    if (route.riskLevel === 'Critical' || route.activeHazardsCount >= 2) return '#f43f5e'; // Rose
    if (route.riskLevel === 'High' || route.activeHazardsCount === 1) return '#f59e0b'; // Amber
    return '#10b981'; // Emerald
  };

  return (
    <>
      {/* Dynamic Main Logistics Routes */}
      {routes.map((route) => {
        const color = getRouteColor(route);
        const isHazardProne = route.riskLevel === 'High' || route.riskLevel === 'Critical';

        return (
          <Polyline
            key={route.id}
            positions={route.coordinates}
            pathOptions={{
              color,
              weight: isHazardProne ? 5 : 4,
              opacity: 0.85,
              dashArray: isHazardProne ? '8, 6' : undefined,
              lineCap: 'round',
              lineJoin: 'round',
            }}
            eventHandlers={{
              click: () => {
                if (onSelectRoute) onSelectRoute(route);
              },
            }}
          >
            <Popup className="nesetu-leaflet-popup" minWidth={260} maxWidth={320}>
              <div className="p-1 space-y-2.5 font-sans text-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded bg-brand-50 text-brand-600">
                      <Route className="w-4 h-4" />
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-900 leading-tight">{route.code}: {route.name}</h4>
                  </div>
                  <Badge
                    variant={route.riskLevel === 'Low' ? 'success' : route.riskLevel === 'Medium' ? 'warning' : 'danger'}
                    size="xs"
                  >
                    {route.riskLevel} Risk
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-600 font-medium">{route.pathDescription}</p>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Gauge className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>{route.distanceKm} km (~{route.etaHours} hrs)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{route.accessibilityScore}/100 Access</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{route.activeHazardsCount} Hazards</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-brand-700">
                    <span>{route.modes.join(' + ')}</span>
                  </div>
                </div>

                {route.whyRecommended && (
                  <p className="text-[10px] text-slate-500 italic bg-amber-50/60 p-1.5 rounded-lg border border-amber-200/60">
                    💡 {route.whyRecommended}
                  </p>
                )}
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {/* Riverway NW-2 Overlay */}
      {showRiverways &&
        specializedCorridors
          .filter((c) => c.type === 'river')
          .map((c) => (
            <Polyline
              key={c.id}
              positions={c.coordinates}
              pathOptions={{
                color: '#06b6d4',
                weight: 5,
                opacity: 0.9,
                dashArray: '3, 6',
              }}
            >
              <Popup className="nesetu-leaflet-popup" minWidth={260}>
                <div className="p-1 space-y-2 font-sans">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h4 className="font-extrabold text-xs text-cyan-900">{c.name}</h4>
                    <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{c.description}</p>
                </div>
              </Popup>
            </Polyline>
          ))}

      {/* Railway Overlay */}
      {showRailways &&
        specializedCorridors
          .filter((c) => c.type === 'rail')
          .map((c) => (
            <Polyline
              key={c.id}
              positions={c.coordinates}
              pathOptions={{
                color: '#a855f7',
                weight: 4,
                opacity: 0.85,
                dashArray: '8, 8',
              }}
            >
              <Popup className="nesetu-leaflet-popup" minWidth={260}>
                <div className="p-1 space-y-2 font-sans">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h4 className="font-extrabold text-xs text-purple-900">{c.name}</h4>
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{c.description}</p>
                </div>
              </Popup>
            </Polyline>
          ))}
    </>
  );
};
