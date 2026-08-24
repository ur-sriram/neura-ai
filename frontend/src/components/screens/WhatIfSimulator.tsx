import React, { useState } from 'react';
import { Cpu, Play, CheckCircle, ArrowRight, Layers, Sliders } from 'lucide-react';
import { postWhatIf } from '../../services/api';

export const WhatIfSimulator: React.FC = () => {
  const [segmentId, setSegmentId] = useState<number>(100001);
  const [rainUplift, setRainUplift] = useState<number>(25);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [diffResult, setDiffResult] = useState<any>(null);

  const handleRunWhatIf = async () => {
    setIsSimulating(true);
    try {
      const res = await postWhatIf({
        closed_segment_ids: [segmentId],
        weather_uplift_mm: rainUplift,
        disabled_vehicle_ids: [],
        time_offset_h: 0
      });
      setDiffResult(res.diff);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            What-If Counterfactual Simulator (Sec 18 & 19 — Judge-Facing)
          </h2>
          <p className="text-xs text-gray-400">Run hypothetical disruptions on a Copy-on-Write LNS state fork with ZERO impact on live operations (SLA &lt; 3.0s)</p>
        </div>

        <button
          onClick={handleRunWhatIf}
          disabled={isSimulating}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-white" />
          {isSimulating ? 'Simulating Fork...' : 'Run Counterfactual What-If'}
        </button>
      </div>

      {/* Main Grid: Mutation Controls & Before/After Diff */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mutation Controls Panel */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            Mutation Builder
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-gray-400 font-medium block mb-1">Close Target Segment ID:</label>
              <input
                type="number"
                value={segmentId}
                onChange={(e) => setSegmentId(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-gray-400 font-medium block mb-1">Monsoon Rainfall Uplift (+{rainUplift} mm/h):</label>
              <input
                type="range"
                min="0"
                max="100"
                value={rainUplift}
                onChange={(e) => setRainUplift(Number(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Before/After Split Diff View */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Before vs After Counterfactual Impact Diff
          </h3>

          {diffResult ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-900/80 rounded-xl border border-gray-800">
                  <h4 className="font-bold text-blue-400 mb-1">BEFORE MUTATION</h4>
                  <p>Open Segments: {diffResult.before_state?.open_segments}</p>
                  <p>At-Risk Deliveries: {diffResult.before_state?.at_risk_deliveries}</p>
                  <p>Mean Accessibility: {diffResult.before_state?.mean_accessibility}</p>
                </div>
                <div className="p-3 bg-gray-900/80 rounded-xl border border-rose-900/40">
                  <h4 className="font-bold text-rose-400 mb-1">AFTER MUTATION</h4>
                  <p>Open Segments: {diffResult.after_state?.open_segments}</p>
                  <p>At-Risk Deliveries: {diffResult.after_state?.at_risk_deliveries}</p>
                  <p>Mean Accessibility: {diffResult.after_state?.mean_accessibility}</p>
                </div>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300">
                <p className="font-bold">IMPACT SUMMARY:</p>
                <p className="mt-1">{diffResult.narrative}</p>
                <div className="mt-2 flex space-x-4 text-[11px]">
                  <span>Deliveries Rerouted: <strong>{diffResult.delta?.deliveries_rerouted}</strong></span>
                  <span>Added ETA: <strong>+{diffResult.delta?.eta_delta_p50_min} min</strong></span>
                  <span>Risk Uplift: <strong>+{(diffResult.delta?.risk_delta * 100).toFixed(0)}%</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 text-xs">
              Select segment mutation and click "Run Counterfactual What-If" to evaluate impact diff in &lt; 3.0 seconds.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
