import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, Zap, ArrowRight } from 'lucide-react';
import { postEvent, approvePlan } from '../../services/api';

export const DisruptionConsole: React.FC = () => {
  const [isCascading, setIsCascading] = useState<boolean>(false);
  const [cascadeResult, setCascadeResult] = useState<any>(null);

  const steps = [
    '1. Sense: Incoming hazard alert received from Control Room',
    '2. Understand: Validated trust weight (0.95), mapped to NH-6 trunk segment',
    '3. Predict: Landslide probability computed for 6h/12h/24h/48h/72h horizons',
    '4. Assess: Living Network State (LNS v+1) overlays updated, H3 hex grid re-colored',
    '5. Route Engine: Edge costs re-computed, hard closed segment removed',
    '6. Vehicle Matcher: Vehicle payload & suitability matrix scored',
    '7. Priority Engine: Emergency medical delivery prioritized (Score 98.5)',
    '8. Plan Optimizer: CP-SAT solver executed (Deterministic seed 42)',
    '9. Explanation Layer: Audit explanation rendered with template fallback',
    '10. Human Approval Gate: Proposed plan held for Human Officer approval'
  ];

  const handleSimulateDisruption = async () => {
    setIsCascading(true);
    try {
      const res = await postEvent({
        type: 'landslide',
        payload: {
          segment_ids: [100001],
          description: 'Landslide confirmed on NH-6 corridor near Nongpoh hairpin bends'
        },
        source_type: 'control_room'
      });
      setCascadeResult(res.cascade);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCascading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            Disruption & Autonomous Re-route Console (Sec 16.1)
          </h2>
          <p className="text-xs text-gray-400">Continuous 9-stage disruption loop: Hazard Event $\rightarrow$ LNS Update $\rightarrow$ CP-SAT Re-plan $\rightarrow$ Human Gate</p>
        </div>

        <button
          onClick={handleSimulateDisruption}
          disabled={isCascading}
          className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Zap className="w-4 h-4" />
          {isCascading ? 'Executing Cascade...' : 'Simulate Landslide Disruption'}
        </button>
      </div>

      {/* 10-Stage Replan Cascade Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Replan Cascade Stepper (Execution SLA &lt; 5.0s)
          </h3>

          <div className="space-y-2 text-xs">
            {steps.map((stepText, idx) => (
              <div key={idx} className="flex items-center space-x-3 p-2.5 bg-gray-900/60 rounded-xl border border-gray-800">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-gray-300 font-medium">{stepText}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Replan Cascade Result & Human Gate */}
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Proposed Replan Diff & Risk Badges
            </h3>

            {cascadeResult ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
                  <p className="font-bold">STATUS: PROPOSED (Awaiting Human Gate Approval)</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    LNS Version Bump: v{cascadeResult.lns_version} | Execution Latency: {cascadeResult.total_sec}s
                  </p>
                </div>

                <div className="bg-gray-950 p-3 rounded-xl border border-gray-900 font-mono text-gray-300">
                  <pre className="whitespace-pre-wrap">{cascadeResult.explanation}</pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 text-xs">
                Click "Simulate Landslide Disruption" to trigger real-time hazard ingestion & 9-stage replan cascade.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
