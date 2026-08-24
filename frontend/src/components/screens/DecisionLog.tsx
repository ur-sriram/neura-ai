import React from 'react';
import { FileText, CheckCircle, ShieldCheck, HelpCircle } from 'lucide-react';

export const DecisionLog: React.FC = () => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Decision Log & Explanation Audit Console (XAI Sec 35)
        </h2>
        <p className="text-xs text-gray-400">Complete, append-only decision record history. Every recommendation answers WHY with candidate comparisons and rejection reasons.</p>
      </div>

      <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
        <h3 className="text-sm font-bold text-white">Recent Audit Records</h3>

        <div className="bg-gray-950 p-4 rounded-xl border border-gray-900 font-mono text-xs text-gray-300 space-y-3">
          <div className="flex justify-between items-center text-blue-400 font-bold border-b border-gray-800 pb-2">
            <span>DECISION #rec-9012 — PLAN OPTIMIZATION</span>
            <span>Sim Hour 36 | Confidence: 92%</span>
          </div>

          <p className="text-emerald-400 font-semibold">Route B recommended because:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>Route A — closure probability 0.82 (risk tolerance 0.50 for MEDICAL cargo) → <span className="text-rose-400">REJECTED</span></li>
            <li>Route C — bridge B-31 limit 5t &lt; 10t vehicle weight → <span className="text-rose-400">REJECTED (Hard Feasibility Filter)</span></li>
            <li><strong className="text-white">Route B — open, risk 0.18, band 2h 50m–4h 30m, 4x4 suitability 0.91, confidence 0.85</strong></li>
          </ul>

          <div className="pt-2 text-gray-500 text-[11px]">
            Approved by: Operational Manager at 14:22 sim time | Audit Hash: e8f921a4bc
          </div>
        </div>
      </div>
    </div>
  );
};
