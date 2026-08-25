import React from 'react';
import { X, Truck, Phone, Navigation, MapPin, Radio } from 'lucide-react';
import { Vehicle } from '../../types';
import { Badge } from '../common/Badge';
import { useApp } from '../../context/AppContext';

interface VehicleDetailDrawerProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

export const VehicleDetailDrawer: React.FC<VehicleDetailDrawerProps> = ({ vehicle, onClose }) => {
  const { updateVehicleStatus } = useApp();

  if (!vehicle) return null;

  const statusVariant = {
    Active: 'success',
    Delayed: 'warning',
    Emergency: 'danger',
    Idle: 'neutral',
    Maintenance: 'neutral',
  }[vehicle.status] as any;

  const riskVariant = {
    Low: 'success',
    Medium: 'warning',
    High: 'danger',
    Critical: 'danger',
  }[vehicle.risk] as any;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div>
          <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black shadow-md shadow-brand-700/20">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">{vehicle.code}</h3>
                  <Badge variant={statusVariant} size="xs" dot>
                    {vehicle.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                  {vehicle.type}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Details Body */}
          <div className="p-6 space-y-6 text-xs text-slate-700">
            {/* Driver & Telemetry Banner */}
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Assigned Operator</p>
                  <p className="text-sm font-bold text-white mt-0.5">{vehicle.driver}</p>
                </div>
                <a
                  href={`tel:${vehicle.driverPhone}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-semibold transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call Driver</span>
                </a>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400">Current Speed</span>
                  <p className="font-bold text-emerald-400 text-sm mt-0.5">{vehicle.speedKmH} km/h</p>
                </div>
                <div>
                  <span className="text-slate-400">Fuel Level</span>
                  <p className="font-bold text-sky-400 text-sm mt-0.5">{vehicle.fuelPercent}%</p>
                </div>
                <div>
                  <span className="text-slate-400">Altitude</span>
                  <p className="font-bold text-amber-400 text-sm mt-0.5">{vehicle.telemetry.altitudeMeters}m</p>
                </div>
              </div>
            </div>

            {/* Live Location & Destination */}
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Sector</span>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5">{vehicle.currentLocation}</p>
                  <span className="text-[11px] text-slate-500">State: {vehicle.state}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200">
                <Navigation className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Final Destination</span>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5">{vehicle.destination}</p>
                  <p className="text-[11px] text-brand-700 font-medium mt-0.5">ETA: {vehicle.eta}</p>
                </div>
              </div>
            </div>

            {/* Cargo & Payload */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Consignment Payload</span>
              <p className="text-xs font-bold text-slate-900">{vehicle.cargo}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Payload Weight: <strong>{vehicle.cargoWeightKg.toLocaleString()} kg</strong></span>
                <span className="flex items-center gap-1">
                  Risk Rating:
                  <Badge variant={riskVariant} size="xs">{vehicle.risk}</Badge>
                </span>
              </div>
            </div>

            {/* Mesh Telemetry Diagnostic */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Satellite & IoT Telemetry</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                  <Radio className="w-3 h-3 animate-pulse" />
                  {vehicle.telemetry.satelliteSignal}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div>Engine Temp: <strong>{vehicle.telemetry.engineTempC}°C</strong></div>
                <div>Battery Health: <strong>{vehicle.telemetry.batteryHealthPercent}%</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls at Bottom */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/80 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                updateVehicleStatus(vehicle.id, 'Active');
                onClose();
              }}
              className="w-full py-2.5 px-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm text-center"
            >
              Resume Convoy
            </button>
            <button
              onClick={() => {
                updateVehicleStatus(vehicle.id, 'Emergency');
                onClose();
              }}
              className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm text-center"
            >
              Report Emergency
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
