import React from 'react';
import { Truck, Package, ShieldAlert, AlertTriangle, Activity, TrendingDown, Clock, ArrowRight } from 'lucide-react';
import { VehicleClass } from '../../types';
import { GeoCanvas } from '../map/GeoCanvas';

interface S1Props {
  vclass: VehicleClass;
  simHour: number;
  events: any[];
  onNavigate: (screen: string) => void;
}

export const CommandDashboard: React.FC<S1Props> = ({ vclass, simHour, events, onNavigate }) => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top KPI Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Active Vehicles</p>
            <h3 className="text-2xl font-bold text-white">12 / 12</h3>
            <span className="text-[10px] text-emerald-400 font-semibold">100% Operational</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Deliveries Queue</p>
            <h3 className="text-2xl font-bold text-white">35 Total</h3>
            <span className="text-[10px] text-blue-400 font-semibold">5 Emergency Pinned</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex items-center space-x-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Road Blockages</p>
            <h3 className="text-2xl font-bold text-white">2 Active</h3>
            <span className="text-[10px] text-rose-400 font-semibold">NH-6 Corridor Segment</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex items-center space-x-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Mean Accessibility</p>
            <h3 className="text-2xl font-bold text-white">78.4 / 100</h3>
            <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" /> Storm Degrading
            </span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Replan Cascade</p>
            <h3 className="text-2xl font-bold text-white">&lt; 2.4s SLA</h3>
            <span className="text-[10px] text-emerald-400 font-semibold">Deterministic CP-SAT</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Digital Twin + Alert Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Digital Twin Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Regional Digital Twin — Corridor Overview
            </h2>
            <button
              onClick={() => onNavigate('S2')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Open Full Map <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-[420px]">
            <GeoCanvas vclass={vclass} />
          </div>
        </div>

        {/* Right Col: Live Disruption Alert Feed */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Live Event Stream
          </h2>

          <div className="glass-panel p-4 rounded-2xl border border-gray-800 space-y-3 h-[420px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No active disruptions. Network is operating under baseline calm conditions.
              </div>
            ) : (
              events.map((evt, idx) => (
                <div key={idx} className="p-3 bg-gray-900/80 rounded-xl border border-gray-800 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-400 rounded-md uppercase">
                      {evt.type}
                    </span>
                    <span className="text-[10px] text-gray-500">Sim Hour {evt.received_sim}</span>
                  </div>
                  <p className="text-xs font-medium text-gray-200">
                    {evt.payload?.description || 'Landslide hazard reported on NH-6 trunk segment'}
                  </p>
                  <div className="flex justify-between text-[10px] text-gray-400 pt-1">
                    <span>Source: {evt.source_type}</span>
                    <span>Trust: {(evt.source_trust * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
