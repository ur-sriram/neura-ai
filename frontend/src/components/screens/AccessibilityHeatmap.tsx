import React, { useState, useEffect } from 'react';
import { VehicleClass } from '../../types';
import { Flame, Clock, AlertTriangle, ShieldCheck, ArrowUpRight, CheckCircle, RefreshCw } from 'lucide-react';
import { fetchHeatmap } from '../../services/api';

interface S3Props {
  vclass: VehicleClass;
  setVclass: (v: VehicleClass) => void;
}

export const AccessibilityHeatmap: React.FC<S3Props> = ({ vclass, setVclass }) => {
  const [horizon, setHorizon] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [approved, setApproved] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    fetchHeatmap(vclass, horizon).then((data) => {
      setHeatmapData(data);
      setLoading(false);
    });
  }, [vclass, horizon]);

  // Adjust risk levels dynamically based on horizon
  const atRiskLocations = [
    {
      name: 'Jowai Town Center',
      timeToIsolation: `${Math.max(2, 18 - Math.floor(horizon / 4))} hours`,
      riskLevel: horizon >= 24 ? 'CRITICAL' : 'HIGH',
      popClass: 'high',
      rec: 'Pre-position 2,000 kg food & medical stock'
    },
    {
      name: 'Shangpung PHC',
      timeToIsolation: `${Math.max(1, 12 - Math.floor(horizon / 4))} hours`,
      riskLevel: 'CRITICAL',
      popClass: 'medium',
      rec: 'Dispatch 4x4 anti-venom supply immediately'
    },
    {
      name: 'Mawryngkneng CHC',
      timeToIsolation: `${Math.max(4, 24 - Math.floor(horizon / 4))} hours`,
      riskLevel: horizon >= 48 ? 'HIGH' : 'MEDIUM',
      popClass: 'medium',
      rec: 'Monitor NH-6 bypass corridor'
    },
    {
      name: 'Laitlyngkot Village',
      timeToIsolation: `${Math.max(1, 8 - Math.floor(horizon / 4))} hours`,
      riskLevel: 'CRITICAL',
      popClass: 'low',
      rec: 'Pre-position emergency water purification'
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Forecast Slider */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Regional Accessibility & Reachability Heatmap (H3 Grid)
            </h2>
            <p className="text-xs text-gray-400">Forecast regional reachability cascade up to 72 hours ahead using antecedent rainfall & slope hazard models</p>
          </div>

          <div className="flex items-center space-x-3">
            {loading && <RefreshCw className="w-4 h-4 text-orange-400 animate-spin" />}
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold">
              Forecast Horizon: +{horizon} Hours
            </span>
          </div>
        </div>

        {/* Time Slider Controls */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400 font-medium">
            <span>Now (+0h)</span>
            <span>+6h</span>
            <span>+12h</span>
            <span>+24h</span>
            <span>+48h</span>
            <span>+72h</span>
          </div>
          <input
            type="range"
            min="0"
            max="72"
            step="6"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>
      </div>

      {/* Main Grid: At-Risk Table & Pre-positioning Advice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: At-Risk Locations Table */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              At-Risk Locations & Time-to-Isolation ({vclass.toUpperCase()} Vehicle Class)
            </h3>
            {heatmapData?.features && (
              <span className="text-[11px] text-gray-500 font-mono">
                {heatmapData.features.length} H3 cells evaluated
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-900/80 text-gray-400 font-semibold">
                <tr>
                  <th className="p-3">Location Name</th>
                  <th className="p-3">Est. Time to Isolation</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3">Population Class</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-200">
                {atRiskLocations.map((loc, idx) => (
                  <tr key={idx} className="hover:bg-gray-900/40 transition">
                    <td className="p-3 font-semibold text-white">{loc.name}</td>
                    <td className="p-3 font-mono text-amber-400">{loc.timeToIsolation}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        loc.riskLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {loc.riskLevel}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 capitalize">{loc.popClass}</td>
                    <td className="p-3">
                      <button className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                        Pre-position <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Pre-positioning Recommendation Card */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            AI Pre-Positioning Advisor
          </h3>

          <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800 space-y-3">
            <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded-md">
              RECOMMENDED ACTION
            </span>
            <p className="text-xs font-semibold text-white">
              Pre-position 2,500 kg Food & Medical Supplies to Jowai Sub-depot before +{Math.max(6, 18 - horizon)}h storm peak.
            </p>
            <p className="text-xs text-gray-400">
              NH-6 trunk segment #100001 carries an {(70 + horizon * 0.3).toFixed(0)}% predicted closure probability at +24h. Advise dispatching HT-01 before 18:00 sim time.
            </p>
            {approved ? (
              <div className="w-full py-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Stock Pre-positioning Order Issued
              </div>
            ) : (
              <button
                onClick={() => setApproved(true)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition"
              >
                Approve Stock Pre-positioning
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
