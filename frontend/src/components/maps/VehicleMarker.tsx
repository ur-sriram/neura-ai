import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Vehicle } from '../../types';
import { Badge } from '../common/Badge';
import { Truck, Navigation, Gauge, Thermometer, ShieldAlert, ArrowUpRight } from 'lucide-react';

interface VehicleMarkerProps {
  vehicle: Vehicle;
  onSelect?: (vehicle: Vehicle) => void;
}

export const VehicleMarker: React.FC<VehicleMarkerProps> = ({ vehicle, onSelect }) => {
  const statusColor = useMemo(() => {
    switch (vehicle.status) {
      case 'Active':
        return { bg: '#10b981', border: '#059669', pulse: 'rgba(16, 185, 129, 0.45)', text: '#ffffff' };
      case 'Delayed':
        return { bg: '#f59e0b', border: '#d97706', pulse: 'rgba(245, 158, 11, 0.45)', text: '#ffffff' };
      case 'Emergency':
        return { bg: '#f43f5e', border: '#e11d48', pulse: 'rgba(244, 63, 94, 0.55)', text: '#ffffff' };
      default:
        return { bg: '#64748b', border: '#475569', pulse: 'transparent', text: '#ffffff' };
    }
  }, [vehicle.status]);

  const customIcon = useMemo(() => {
    const isWater = vehicle.type.toLowerCase().includes('barge') || vehicle.type.toLowerCase().includes('water');
    const isRail = vehicle.type.toLowerCase().includes('rail');

    const iconTypeSvg = isWater
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M2 12h20M5 19a7 7 0 0 0 14 0"/></svg>`
      : isRail
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3"/></svg>`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10Z"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;

    const html = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;">
        ${
          vehicle.status !== 'Idle'
            ? `<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${statusColor.pulse}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ''
        }
        <div style="
          position: relative;
          width: 28px;
          height: 28px;
          background: ${statusColor.bg};
          border: 2px solid #ffffff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          cursor: pointer;
          transition: transform 0.2s;
        ">
          ${iconTypeSvg}
        </div>
        <div style="
          position: absolute;
          bottom: -13px;
          background: #0f172a;
          color: #f8fafc;
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.2);
          white-space: nowrap;
          box-shadow: 0 2px 5px rgba(0,0,0,0.4);
          pointer-events: none;
        ">
          ${vehicle.code}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'nesetu-custom-vehicle-marker',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -18],
    });
  }, [vehicle.code, vehicle.status, vehicle.type, statusColor]);

  const statusVariant =
    vehicle.status === 'Active'
      ? 'success'
      : vehicle.status === 'Delayed'
      ? 'warning'
      : vehicle.status === 'Emergency'
      ? 'danger'
      : 'neutral';

  return (
    <Marker
      position={vehicle.coordinates}
      icon={customIcon}
      eventHandlers={{
        click: () => {
          if (onSelect) onSelect(vehicle);
        },
      }}
    >
      <Popup className="nesetu-leaflet-popup" minWidth={260} maxWidth={320}>
        <div className="p-1 space-y-3 font-sans text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{vehicle.code}</h4>
                <p className="text-[10px] text-slate-500">{vehicle.type}</p>
              </div>
            </div>
            <Badge variant={statusVariant} size="xs" dot>
              {vehicle.status}
            </Badge>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">Driver:</span>
              <span className="font-bold text-slate-900">{vehicle.driver}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">Cargo:</span>
              <span className="font-bold text-slate-900 text-right truncate max-w-[150px]">{vehicle.cargo}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">Destination:</span>
              <span className="font-bold text-brand-700 text-right truncate max-w-[150px]">{vehicle.destination}</span>
            </div>
          </div>

          {/* Telemetry Strip */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Gauge className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span className="font-semibold">{vehicle.speedKmH} km/h</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Thermometer className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="font-semibold">{vehicle.telemetry.engineTempC}°C</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{vehicle.telemetry.altitudeMeters}m Alt</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold">{vehicle.risk} Risk</span>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={() => onSelect && onSelect(vehicle)}
            className="w-full mt-2 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Inspect Full Telemetry</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </Popup>
    </Marker>
  );
};
