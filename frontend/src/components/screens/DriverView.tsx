import React from 'react';
import { Smartphone, MapPin, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const DriverView: React.FC = () => {
  return (
    <div className="p-4 max-w-sm mx-auto space-y-4">
      {/* Mobile Card Header */}
      <div className="glass-panel p-4 rounded-2xl border border-gray-800 text-center space-y-1">
        <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto">
          <Smartphone className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-white">Driver View (Rajesh Sharma)</h3>
        <p className="text-[11px] text-gray-400">Assigned Vehicle: <strong className="text-white">4X-01 (4x4)</strong></p>
      </div>

      {/* Hazard Plain-Language Warning */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-1 text-amber-300">
        <div className="flex items-center gap-1.5 font-bold">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Hazard Warning Ahead
        </div>
        <p className="text-[11px]">Landslide risk HIGH on next 12 km (NH-6 corridor near Nongpoh). Hold at Jowai safe point if rain exceeds 50 mm/h.</p>
      </div>

      {/* Today's Stops */}
      <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Today's Stop Sequence</h4>

        <div className="space-y-2 text-xs">
          <div className="p-2.5 bg-gray-900/80 rounded-xl border border-gray-800 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <div>
                <p className="font-bold text-white">1. Guwahati Central Depot</p>
                <p className="text-[10px] text-gray-400">Pickup 400 kg Medical Supplies</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">DEPARTED</span>
          </div>

          <div className="p-2.5 bg-gray-900/80 rounded-xl border border-gray-800 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              <div>
                <p className="font-bold text-white">2. Nongpoh Civil Hospital</p>
                <p className="text-[10px] text-gray-400">Delivery Anti-Venom (Emergency)</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-400">EN ROUTE</span>
          </div>
        </div>
      </div>

      {/* One-Tap Report Button */}
      <button className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        One-Tap Report Road Blockage
      </button>
    </div>
  );
};
