import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Incident } from '../../types';
import { Badge } from '../common/Badge';
import {
  AlertTriangle,
  Clock,
  Route,
  ShieldCheck,
  Truck,
  ExternalLink,
} from 'lucide-react';

interface IncidentMarkerProps {
  incident: Incident;
  onSelect?: (incident: Incident) => void;
  onResolve?: (incidentId: string) => void;
}

export const IncidentMarker: React.FC<IncidentMarkerProps> = ({ incident, onSelect, onResolve }) => {
  const isResolved = incident.status === 'Resolved';

  const severityTheme = useMemo(() => {
    switch (incident.severity) {
      case 'Critical':
        return { bg: '#e11d48', ring: 'rgba(225, 29, 72, 0.6)', text: '#ffffff' };
      case 'High':
        return { bg: '#ea580c', ring: 'rgba(234, 88, 12, 0.5)', text: '#ffffff' };
      case 'Medium':
        return { bg: '#d97706', ring: 'rgba(217, 119, 6, 0.45)', text: '#ffffff' };
      default:
        return { bg: '#2563eb', ring: 'rgba(37, 99, 235, 0.4)', text: '#ffffff' };
    }
  }, [incident.severity]);

  const customIcon = useMemo(() => {
    const isLandslide = incident.type === 'Landslide';
    const isFlood = incident.type === 'Flood';
    const isBridge = incident.type === 'Bridge Damage';

    const iconSvg = isLandslide
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`
      : isFlood
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 12h20M2 16h20M2 20h20M12 2a5 5 0 0 0-5 5c0 3 5 5 5 5s5-2 5-5a5 5 0 0 0-5-5z"/></svg>`
      : isBridge
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 17h18M3 12h18M6 8v9M18 8v9M12 8v9"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

    const html = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
        ${
          !isResolved
            ? `<div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: ${severityTheme.ring}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ''
        }
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
          background: ${isResolved ? '#10b981' : severityTheme.bg};
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          cursor: pointer;
        ">
          ${isResolved ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : iconSvg}
        </div>
        <div style="
          position: absolute;
          bottom: -13px;
          background: #7f1d1d;
          color: #ffffff;
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 8.5px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.3);
          white-space: nowrap;
          box-shadow: 0 2px 5px rgba(0,0,0,0.5);
          pointer-events: none;
        ">
          ${incident.type}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'nesetu-custom-incident-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  }, [incident.type, incident.severity, severityTheme, isResolved]);

  return (
    <Marker
      position={incident.coordinates}
      icon={customIcon}
      eventHandlers={{
        click: () => {
          if (onSelect) onSelect(incident);
        },
      }}
    >
      <Popup className="nesetu-leaflet-popup" minWidth={280} maxWidth={340}>
        <div className="p-1 space-y-3 font-sans text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold text-rose-600 uppercase tracking-wider">{incident.code}</span>
                <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{incident.title}</h4>
              </div>
            </div>
            <Badge variant={incident.severity === 'Critical' ? 'danger' : incident.severity === 'High' ? 'warning' : 'info'} size="xs">
              {incident.severity}
            </Badge>
          </div>

          <p className="text-xs text-slate-600 font-medium leading-relaxed">{incident.description}</p>

          {/* Details Table */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Route className="w-3.5 h-3.5 text-slate-400" /> Affected Corridor:
              </span>
              <span className="font-bold text-slate-900">{incident.affectedRoute}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Truck className="w-3.5 h-3.5 text-slate-400" /> Impacted Convoys:
              </span>
              <span className="font-bold text-rose-600">{incident.affectedVehiclesCount} vehicles held</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Clearance ETA:
              </span>
              <span className="font-bold text-amber-600">~{incident.clearanceEtaHours} hours</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onSelect && onSelect(incident)}
              className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <span>Full Details</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {!isResolved && onResolve && (
              <button
                onClick={() => onResolve(incident.id)}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Mark Clear</span>
              </button>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
