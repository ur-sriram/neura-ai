import React, { useState, useEffect } from 'react';
import { Route, CheckCircle, XCircle, AlertTriangle, ShieldCheck, ToggleLeft, ToggleRight, ArrowRight } from 'lucide-react';
import { fetchActivePlan, approvePlan } from '../../services/api';

export const PlanDispatch: React.FC = () => {
  const [activePlan, setActivePlan] = useState<any>(null);
  const [naiveMode, setNaiveMode] = useState<boolean>(false);

  useEffect(() => {
    fetchActivePlan().then(data => setActivePlan(data));
  }, []);

  const handleApprove = async () => {
    if (activePlan?.plan?.id) {
      await approvePlan(activePlan.plan.id);
      setActivePlan((prev: any) => ({
        ...prev,
        plan: { ...prev.plan, status: 'APPROVED' }
      }));
    }
  };

  const plan = activePlan?.plan;
  const assignments = activePlan?.assignments || [];
  const record = activePlan?.decision_record;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Smart vs Naive Toggle */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Route className="w-5 h-5 text-blue-400" />
            Plan & Dispatch Console (CP-SAT Joint Optimizer)
          </h2>
          <p className="text-xs text-gray-400">Co-optimizes cargo payload $\rightarrow$ vehicle class $\rightarrow$ route feasibility under hazard constraints</p>
        </div>

        {/* Smart vs Naive Comparator Toggle */}
        <div className="flex items-center space-x-3 bg-gray-900/80 px-4 py-2 rounded-xl border border-gray-800">
          <span className="text-xs text-gray-400 font-semibold">Mode:</span>
          <button
            onClick={() => setNaiveMode(!naiveMode)}
            className="flex items-center space-x-2 text-xs font-bold"
          >
            {naiveMode ? (
              <span className="text-amber-400 flex items-center gap-1"><ToggleLeft className="w-5 h-5" /> Naive Distance-Only</span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1"><ToggleRight className="w-5 h-5" /> NE-Setu Smart Co-Optimization</span>
            )}
          </button>
        </div>
      </div>

      {/* Plan Status Banner */}
      {plan && (
        <div className={`p-4 rounded-2xl border flex justify-between items-center ${
          plan.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <div className="flex items-center space-x-3">
            {plan.status === 'APPROVED' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <div>
              <h4 className="text-sm font-bold">
                Plan #{plan.id.slice(0, 8)} — Status: <span className="uppercase">{plan.status}</span>
              </h4>
              <p className="text-xs text-gray-400">
                Mode: {plan.mode} | Objective Score: {plan.objective_value?.toFixed(1) || 'N/A'} | Created Sim Hour {plan.created_sim}
              </p>
            </div>
          </div>

          {plan.status === 'PROPOSED' && (
            <button
              onClick={handleApprove}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition"
            >
              Approve Dispatch Plan
            </button>
          )}
        </div>
      )}

      {/* Main Content: Assignments & Candidate Routes Table */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
        <h3 className="text-sm font-bold text-white">Active Vehicle Assignments & Candidates</h3>

        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-xs">
              No active vehicle assignments generated yet. Run optimization cascade from Command Hub.
            </div>
          ) : (
            assignments.map((asgn: any, idx: number) => (
              <div key={idx} className="bg-gray-900/80 p-4 rounded-xl border border-gray-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-400">Vehicle Assignment #{asgn.id.slice(0, 8)}</span>
                  <div className="flex space-x-3 text-xs">
                    <span className="text-gray-400">ETA p50: <strong className="text-white">{asgn.eta_p50}h</strong></span>
                    <span className="text-gray-400">ETA p90: <strong className="text-white">{asgn.eta_p90}h</strong></span>
                    <span className="text-gray-400">Risk Score: <strong className="text-emerald-400">{(asgn.risk_score * 100).toFixed(0)}%</strong></span>
                  </div>
                </div>

                {/* Stops */}
                <div className="text-xs text-gray-300">
                  <span className="font-semibold text-gray-400">Stops Queue ({asgn.stops.length}): </span>
                  {asgn.stops.map((s: any) => `Delivery #${s.delivery_id.slice(0, 6)} (Seq ${s.seq})`).join(' → ')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Audit XAI Explanation Summary */}
      {record && (
        <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-2">
          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">CP-SAT Explanation Audit Trail</h4>
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap bg-gray-950 p-4 rounded-xl border border-gray-900">
            {record.rationale_template || 'All candidate options evaluated. Hard feasibility filters removed weight-violating and closed segment candidates.'}
          </pre>
        </div>
      )}
    </div>
  );
};
