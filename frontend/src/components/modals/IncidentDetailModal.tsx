import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';
import { Incident } from '../../types';
import { useApp } from '../../context/AppContext';

interface IncidentDetailModalProps {
  incident: Incident | null;
  onClose: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
}) => {
  const { resolveIncident, updateIncidentStatus } = useApp();
  const [isResolving, setIsResolving] = useState(false);

  if (!incident) return null;

  const sevVariant =
    incident.severity === 'Critical'
      ? 'danger'
      : incident.severity === 'High'
      ? 'danger'
      : incident.severity === 'Medium'
      ? 'warning'
      : 'success';

  const statusVariant =
    incident.status === 'Active'
      ? 'danger'
      : incident.status === 'Under Clearance'
      ? 'warning'
      : incident.status === 'Rerouted'
      ? 'info'
      : 'success';

  const handleResolve = () => {
    setIsResolving(true);
    setTimeout(() => {
      resolveIncident(incident.id);
      setIsResolving(false);
      onClose();
    }, 400);
  };

  const handleReroute = () => {
    updateIncidentStatus(incident.id, 'Rerouted');
    alert(`Traffic rerouted via contingency corridor for ${incident.code}. Fleet updated.`);
    onClose();
  };

  return (
    <Modal
      isOpen={!!incident}
      onClose={onClose}
      title={`Hazard Advisory: ${incident.code}`}
      subtitle={`${incident.type} • ${incident.location}`}
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Severity Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">{incident.title}</h3>
              <p className="text-xs text-slate-500 font-medium">State: {incident.state} • Corridor: {incident.corridor}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={sevVariant} size="sm" dot>
              {incident.severity} Severity
            </Badge>
            <Badge variant={statusVariant} size="sm">
              {incident.status}
            </Badge>
          </div>
        </div>

        {/* Narrative Description */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-1">
          <span className="font-bold text-slate-900 block">Incident Synopsis:</span>
          <p className="leading-relaxed">{incident.description}</p>
        </div>

        {/* Impact & Clearance Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-slate-400 font-medium block">Affected Fleets</span>
            <span className="font-black text-rose-600 text-sm">{incident.affectedVehiclesCount} Convoys</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-slate-400 font-medium block">Clearance ETA</span>
            <span className="font-black text-slate-900 text-sm">{incident.clearanceEtaHours} Hours</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-slate-400 font-medium block">Assigned Crew</span>
            <span className="font-black text-slate-900 text-sm">{incident.assignedTeam || 'BRO Team'}</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-slate-400 font-medium block">Telemetry Source</span>
            <span className="font-black text-brand-700 text-sm">{incident.reportedBy}</span>
          </div>
        </div>

        {/* AI Recommended Mitigation */}
        <div className="p-4 bg-brand-50/60 border border-brand-200 rounded-xl space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-brand-900">
            <GitBranch className="w-4 h-4 text-brand-600" />
            <span>AI Recommended Contingency Protocol</span>
          </div>
          <p className="text-brand-800 font-medium leading-relaxed">{incident.recommendedAction}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            onClick={handleReroute}
            disabled={incident.status === 'Resolved'}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Authorize AI Bypass Reroute</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={incident.status === 'Resolved' || isResolving}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isResolving ? 'Resolving...' : 'Mark Corridor Cleared'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
