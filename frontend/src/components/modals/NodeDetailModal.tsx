import React from 'react';
import { NetworkNode } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

interface NodeDetailModalProps {
  node: NetworkNode | null;
  onClose: () => void;
}

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({ node, onClose }) => {
  if (!node) return null;

  const healthVariant = {
    Normal: 'success',
    Congested: 'warning',
    Critical: 'danger',
    Maintenance: 'neutral',
  }[node.health] as any;

  return (
    <Modal
      isOpen={!!node}
      onClose={onClose}
      title={node.name}
      subtitle={`Node Code: ${node.code} • Classification: ${node.type}`}
      maxWidth="2xl"
    >
      <div className="space-y-6 text-xs text-slate-700">
        {/* Node Health & Capacity Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Node Operating Health</span>
            <div className="mt-1">
              <Badge variant={healthVariant} size="md" dot>
                {node.health} Operating Grid
              </Badge>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Capacity Utilization</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    node.capacityUtilizedPercent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${node.capacityUtilizedPercent}%` }}
                />
              </div>
              <span className="font-bold text-slate-900">{node.capacityUtilizedPercent}%</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Daily Freight Throughput</span>
            <p className="text-base font-black text-slate-900 mt-0.5">{node.throughputDailyMT.toLocaleString()} MT/day</p>
          </div>
        </div>

        {/* Connectivity Specs */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Multi-Modal Interconnects</span>
          <p className="text-xs font-bold text-slate-900">{node.connectivity}</p>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {node.supportedModes.map((mode, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-slate-100 rounded-md text-[11px] font-semibold text-slate-700"
              >
                {mode === 'Road' && '🚚 Roadways'}
                {mode === 'Rail' && '🚆 Freight Rail'}
                {mode === 'Air' && '✈️ Air Cargo'}
                {mode === 'Water' && '🚢 Inland Waterway'}
              </span>
            ))}
          </div>
        </div>

        {/* Facility Contact & Active Fleets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Facility Operations Manager</span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">{node.managerContact}</p>
            <span className="text-[11px] text-slate-500">State: {node.state}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Active Staged Convoys</span>
            <p className="text-xs font-bold text-emerald-600 mt-0.5">{node.activeConvoysCount} Heavy Convoys</p>
            <span className="text-[11px] text-slate-500">Coordinates: [{node.coordinates[0].toFixed(2)}, {node.coordinates[1].toFixed(2)}]</span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
