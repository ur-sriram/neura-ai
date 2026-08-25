import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AIDecisionCenter: React.FC = () => {
  const {
    aiRecommendations,
    acceptAIRecommendation,
    rejectAIRecommendation,
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('All');

  const filteredRecs = aiRecommendations.filter((rec) => {
    if (filterStatus === 'All') return true;
    return rec.status === filterStatus;
  });

  const pendingCount = aiRecommendations.filter((r) => r.status === 'Pending').length;
  const acceptedCount = aiRecommendations.filter((r) => r.status === 'Accepted').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Decision & Adaptive Dispatch Center"
        description="Autonomous machine intelligence recommendations for real-time mountain terrain rerouting, modal shift arbitration, emergency convoy priority, and delivery risk mitigation."
        badge="Autonomous Logistics AI"
        badgeType="info"
      >
        <button
          onClick={() => {
            aiRecommendations
              .filter((r) => r.status === 'Pending')
              .forEach((r) => acceptAIRecommendation(r.id));
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Accept All Pending ({pendingCount})</span>
        </button>
      </PageHeader>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="custom-card p-4 flex items-center justify-between border-l-4 border-l-brand-600">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{pendingCount} Decisions</p>
            <span className="text-[11px] text-brand-700 font-semibold">Real-time model inferences</span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Accepted & Executed</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{acceptedCount} Actions</p>
            <span className="text-[11px] text-emerald-600 font-semibold">Average latency saved: 2.8 hrs</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between border-l-4 border-l-purple-500">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model Accuracy Index</p>
            <p className="text-3xl font-black text-purple-600 mt-1">94.6%</p>
            <span className="text-[11px] text-purple-700 font-semibold">Trained on 10-year NE terrain data</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs">
        <button
          onClick={() => setFilterStatus('All')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
            filterStatus === 'All'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Decisions ({aiRecommendations.length})
        </button>
        <button
          onClick={() => setFilterStatus('Pending')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
            filterStatus === 'Pending'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilterStatus('Accepted')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
            filterStatus === 'Accepted'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Accepted ({acceptedCount})
        </button>
      </div>

      {/* AI Recommendation Cards Grid */}
      <div className="space-y-4">
        {filteredRecs.map((rec) => {
          const isPending = rec.status === 'Pending';
          const isAccepted = rec.status === 'Accepted';

          return (
            <div
              key={rec.id}
              className={`custom-card p-6 transition-all duration-200 border ${
                isPending
                  ? 'border-brand-300 shadow-md bg-white'
                  : isAccepted
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-slate-200 bg-slate-50/50 opacity-75'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      {rec.code}
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900">{rec.title}</h3>
                    <Badge variant={rec.confidence > 85 ? 'success' : 'warning'} size="xs">
                      {rec.confidence}% Confidence
                    </Badge>
                    <Badge
                      variant={isAccepted ? 'success' : isPending ? 'info' : 'neutral'}
                      size="xs"
                      dot
                    >
                      {rec.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    <strong>Autonomous Rationale:</strong> {rec.reason}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Proposed Dispatch Action</span>
                      <p className="font-bold text-brand-800 mt-0.5">{rec.recommendedAction}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Corridor & Impact</span>
                      <p className="font-bold text-slate-800 mt-0.5">{rec.affectedRoute} • {rec.impact}</p>
                      {rec.delayAvoidedMinutes && (
                        <p className="text-emerald-600 font-semibold text-[11px] mt-0.5">
                          ✓ Prevents ~{(rec.delayAvoidedMinutes / 60).toFixed(1)} hrs transit delay
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Accept / Reject Buttons */}
                <div className="flex lg:flex-col items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => acceptAIRecommendation(rec.id)}
                        className="w-full sm:w-auto lg:w-36 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Authorize</span>
                      </button>
                      <button
                        onClick={() => rejectAIRecommendation(rec.id)}
                        className="w-full sm:w-auto lg:w-36 py-2.5 px-4 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-2 px-4 bg-white border border-slate-200 rounded-xl">
                      <span className="text-xs font-bold text-slate-600">Decision Logged</span>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.timestamp}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Explainability Policy Box */}
      <div className="custom-card p-5 bg-slate-900 text-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-400" />
          <h4 className="font-extrabold text-sm text-white">Explainable AI Policy & Governance Constraints</h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-medium">
          The NE-Setu dispatch AI uses weighted multi-objective optimization: <strong>40% Landslide Risk avoidance</strong>, <strong>30% Transit Time minimisation</strong>, <strong>20% Fuel/Barge Cost efficiency</strong>, and <strong>10% Hospital Cold-Chain protection</strong>. Human dispatcher overrides are recorded in the DoNER compliance audit trail.
        </p>
      </div>
    </div>
  );
};
