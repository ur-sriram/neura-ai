import React from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  IndianRupee,
  FileCheck,
  Clock,
  HardHat,
} from 'lucide-react';
import { DPRProject } from '../../types';

interface DPRDetailModalProps {
  project: DPRProject | null;
  onClose: () => void;
}

export const DPRDetailModal: React.FC<DPRDetailModalProps> = ({
  project,
  onClose,
}) => {
  if (!project) return null;

  const statusVariant =
    project.status === 'Completed'
      ? 'success'
      : project.status === 'Under Construction'
      ? 'info'
      : project.status === 'DPR Approved'
      ? 'warning'
      : 'neutral';

  return (
    <Modal
      isOpen={!!project}
      onClose={onClose}
      title={`DPR Record: ${project.code}`}
      subtitle={`${project.name} • ${project.state}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Executing Agency / Contractor</span>
            <p className="font-extrabold text-sm text-slate-900">{project.contractor}</p>
            <p className="text-xs text-slate-500 font-medium">Category: {project.category}</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="warning" size="sm">
              Priority: {project.priority}
            </Badge>
            <Badge variant={statusVariant} size="sm" dot>
              {project.status}
            </Badge>
          </div>
        </div>

        {/* Financials & Physical Progress */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Sanctioned Budget</span>
            <p className="text-xl font-black text-slate-900 flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-brand-600" />
              <span>₹ {project.estimatedCostCrores} Cr</span>
            </p>
            <span className="text-[10px] text-slate-400">DoNER Central Pool</span>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Physical Completion</span>
            <p className="text-xl font-black text-emerald-600">{project.completionPercent}%</p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${project.completionPercent}%` }} />
            </div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Accessibility Impact</span>
            <p className="text-xl font-black text-brand-700">+{project.accessibilityImpactScore} / 100</p>
            <span className="text-[10px] text-emerald-600 font-semibold">Cuts transit time 72%</span>
          </div>
        </div>

        {/* Narrative Description */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
          <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-brand-600" />
            <span>Strategic Engineering Scope</span>
          </h4>
          <p className="text-slate-600 font-medium leading-relaxed">{project.description}</p>
        </div>

        {/* Timeline & Beneficiary Districts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-bold">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>COMMISSIONING TIMELINE</span>
            </div>
            <p className="font-extrabold text-slate-900 text-sm">{project.timeline}</p>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-bold">
              <HardHat className="w-3.5 h-3.5 text-amber-600" />
              <span>BENEFICIARY DISTRICTS</span>
            </div>
            <p className="font-bold text-slate-800">{project.affectedDistricts.join(', ')}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => alert(`Full DPR Technical Dossier downloaded for ${project.code}`)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Download DPR Blueprint PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors"
          >
            Close Modal
          </button>
        </div>
      </div>
    </Modal>
  );
};
