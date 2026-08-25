import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { NodeDetailModal } from '../components/modals/NodeDetailModal';
import {
  Network as NetworkIcon,
  Search,
  Truck,
  Anchor,
  Train,
  Plane,
  Activity,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NetworkNode, TransportMode } from '../types';

export const Network: React.FC = () => {
  const { networkNodes } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [inspectingNode, setInspectingNode] = useState<NetworkNode | null>(null);

  const filteredNodes = networkNodes.filter((n) => {
    const matchesSearch =
      !searchQuery ||
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = selectedMode === 'All' || n.supportedModes.includes(selectedMode as TransportMode);
    const matchesType = selectedType === 'All' || n.type === selectedType;
    return matchesSearch && matchesMode && matchesType;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multimodal Logistics Network Topology"
        description="Comprehensive architecture of strategic intermodal transport hubs, river ports, railway sidings, and international border trade checkpoints across the Northeast."
        badge="Network Topology Grid"
        badgeType="info"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Grid Integrity: 98.2%</span>
          </div>
        </div>
      </PageHeader>

      {/* Network Overview Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Strategic Nodes</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{networkNodes.length} Hubs</p>
            <span className="text-[11px] text-slate-400 font-medium">Intermodal staging</span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <NetworkIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">River Ports (NW-2)</p>
            <p className="text-2xl font-black text-sky-600 mt-1">4 Terminals</p>
            <span className="text-[11px] text-slate-400 font-medium">Pandu, Dhubri, Tezpur</span>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Anchor className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rail Freight Terminals</p>
            <p className="text-2xl font-black text-purple-600 mt-1">6 Junctions</p>
            <span className="text-[11px] text-slate-400 font-medium">Lumding, Agartala, Silchar</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Train className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cross-Border Posts</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">3 ICPs</p>
            <span className="text-[11px] text-slate-400 font-medium">Moreh, Dawki, Sutarkandi</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="custom-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search node name, code, state..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="All">All Transport Modes</option>
              <option value="Road">Roadways</option>
              <option value="Rail">Railways</option>
              <option value="Water">Inland Riverway (NW-2)</option>
              <option value="Air">Air Cargo</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="All">All Node Classifications</option>
              <option value="Transport Hub">Transport Hub</option>
              <option value="River Port">River Port</option>
              <option value="Border Point">Border Point</option>
              <option value="Warehouse">Warehouse Staging</option>
            </select>
          </div>
        </div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNodes.map((node) => {
            const healthVariant =
              node.health === 'Normal'
                ? 'success'
                : node.health === 'Congested'
                ? 'warning'
                : 'danger';

            return (
              <div
                key={node.id}
                onClick={() => setInspectingNode(node)}
                className="custom-card p-5 cursor-pointer hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      {node.code}
                    </span>
                    <Badge variant={healthVariant} size="xs" dot>
                      {node.health}
                    </Badge>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 leading-snug mb-1">
                    {node.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mb-3">State: {node.state} • {node.type}</p>

                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Throughput:</span>
                      <span className="font-bold text-slate-900">{node.throughputDailyMT.toLocaleString()} MT/day</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Capacity Load:</span>
                      <span className="font-bold text-brand-700">{node.capacityUtilizedPercent}% Utilized</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          node.capacityUtilizedPercent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${node.capacityUtilizedPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Mode Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {node.supportedModes.map((mode, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 flex items-center gap-1"
                      >
                        {mode === 'Road' && <Truck className="w-2.5 h-2.5" />}
                        {mode === 'Rail' && <Train className="w-2.5 h-2.5" />}
                        {mode === 'Water' && <Anchor className="w-2.5 h-2.5" />}
                        {mode === 'Air' && <Plane className="w-2.5 h-2.5" />}
                        <span>{mode}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{node.activeConvoysCount} Convoys Staged</span>
                  <span className="font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Hub</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <NodeDetailModal
        node={inspectingNode}
        onClose={() => setInspectingNode(null)}
      />
    </div>
  );
};
