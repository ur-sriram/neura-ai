import React, { useState } from 'react';
import { VehicleClass } from '../../types';
import { GeoCanvas } from '../map/GeoCanvas';
import { Sliders, Info, ShieldCheck, AlertCircle } from 'lucide-react';

interface S2Props {
  vclass: VehicleClass;
  setVclass: (v: VehicleClass) => void;
  segments: any[];
  locations: any[];
  vehicles: any[];
}

export const LiveMap: React.FC<S2Props> = ({ vclass, setVclass, segments, locations, vehicles }) => {
  const [selectedSegment, setSelectedSegment] = useState<any>(null);

  return (
    <div className="relative w-full h-[calc(100vh-105px)] bg-[#0B0F19] overflow-hidden p-4 flex gap-4">
      {/* Map Canvas */}
      <div className="flex-1 relative">
        <GeoCanvas
          vclass={vclass}
          segments={segments}
          locations={locations}
          vehicles={vehicles}
          onSegmentClick={(seg) => setSelectedSegment(seg)}
        />
      </div>

      {/* Floating Side Control Panel */}
      <div className="w-80 glass-panel p-4 rounded-2xl border border-gray-800 flex flex-col justify-between overflow-y-auto space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-blue-400" />
            Digital Twin Controls
          </h3>

          {/* Vehicle Class Selector */}
          <div className="space-y-2 mb-4">
            <label className="text-xs text-gray-400 font-medium">Active Vehicle Class Filter:</label>
            <div className="grid grid-cols-2 gap-2">
              {(['heavy', 'mini', '4x4', 'special'] as VehicleClass[]).map((cls) => (
                <button
                  key={cls}
                  onClick={() => setVclass(cls)}
                  className={`p-2 rounded-xl text-xs font-semibold border transition ${
                    vclass === cls
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {cls.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* XAI Factor Decomposition Panel */}
          <div className="border-t border-gray-800 pt-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-purple-400" />
              XAI Factor Decomposition (Sec 13.2)
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-gray-900/60 p-2 rounded-lg">
                <span className="text-gray-400">Hazard Factor (f_hazard):</span>
                <span className="font-semibold text-emerald-400">0.95</span>
              </div>
              <div className="flex justify-between items-center bg-gray-900/60 p-2 rounded-lg">
                <span className="text-gray-400">Status Factor (f_status):</span>
                <span className="font-semibold text-blue-400">1.00 (OPEN)</span>
              </div>
              <div className="flex justify-between items-center bg-gray-900/60 p-2 rounded-lg">
                <span className="text-gray-400">Surface Factor (f_surface):</span>
                <span className="font-semibold text-purple-400">0.85 (Gravel)</span>
              </div>
              <div className="flex justify-between items-center bg-gray-900/60 p-2 rounded-lg">
                <span className="text-gray-400">Terrain Grade (f_terrain):</span>
                <span className="font-semibold text-amber-400">0.92 (7% grade)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800 text-xs space-y-1.5">
          <span className="font-bold text-gray-300">Accessibility Score Bands:</span>
          <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-400">
            <span className="text-emerald-400 font-semibold">● 80-100: Green</span>
            <span className="text-amber-400 font-semibold">● 50-79: Yellow</span>
            <span className="text-orange-400 font-semibold">● 30-49: Orange</span>
            <span className="text-rose-400 font-semibold">● 0-29: Red</span>
          </div>
        </div>
      </div>
    </div>
  );
};
