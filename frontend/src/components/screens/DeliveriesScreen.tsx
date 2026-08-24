import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, AlertTriangle, CheckCircle, Clock, Truck, ArrowUpDown, RefreshCw } from 'lucide-react';
import { fetchDeliveries, updateDeliveryStatus } from '../../services/api';

const STATUS_TABS = ['ALL', 'NEW', 'PLANNED', 'IN_TRANSIT', 'DELIVERED', 'DEFERRED'];

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  low:    'bg-gray-700/60 text-gray-400 border border-gray-700',
};

const STATUS_BADGE: Record<string, string> = {
  NEW:        'bg-blue-500/20 text-blue-400',
  PLANNED:    'bg-purple-500/20 text-purple-400',
  IN_TRANSIT: 'bg-emerald-500/20 text-emerald-400',
  DELIVERED:  'bg-gray-600/30 text-gray-400',
  DEFERRED:   'bg-amber-500/20 text-amber-400',
  FAILED:     'bg-rose-500/20 text-rose-400',
};

function priorityLabel(score: number, isEmergency: boolean): string {
  if (isEmergency) return 'high';
  if (score >= 75) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export const DeliveriesScreen: React.FC = () => {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async (tab = activeTab) => {
    setLoading(true);
    const statusFilter = tab === 'ALL' ? undefined : tab;
    const data = await fetchDeliveries(statusFilter);
    setDeliveries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    load(tab);
  };

  const handleMarkDelivered = async (id: string) => {
    setUpdatingId(id);
    await updateDeliveryStatus(id, 'DELIVERED');
    await load();
    setUpdatingId(null);
  };

  const filtered = deliveries.filter(d =>
    search === '' ||
    d.dest_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.cargo_code?.toLowerCase().includes(search.toLowerCase()) ||
    d.id?.slice(0, 8).includes(search)
  );

  const counts = STATUS_TABS.slice(1).reduce((acc, s) => {
    acc[s] = deliveries.filter(d => d.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Deliveries Management
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Full delivery queue with AI-assigned vehicle routing and priority scoring</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: deliveries.length, color: 'text-white' },
          { label: 'In Transit', value: counts['IN_TRANSIT'] ?? 0, color: 'text-emerald-400' },
          { label: 'Pending', value: (counts['NEW'] ?? 0) + (counts['PLANNED'] ?? 0), color: 'text-blue-400' },
          { label: 'Emergency', value: deliveries.filter(d => d.is_emergency).length, color: 'text-rose-400' },
          { label: 'Delivered', value: counts['DELIVERED'] ?? 0, color: 'text-gray-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-panel p-4 rounded-xl border border-gray-800 text-center">
            <p className="text-[11px] text-gray-400 font-medium">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tab Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition border ${
                activeTab === tab
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab} {tab !== 'ALL' && counts[tab] !== undefined ? `(${counts[tab]})` : ''}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search delivery, destination..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-200 placeholder-gray-600 w-64 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3 flex items-center gap-1">Priority <ArrowUpDown className="w-3 h-3" /></th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">ETA (sim h)</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500">
                  <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-50" />
                  Loading deliveries...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No deliveries found. Run the demo scenario to generate data.
                </td></tr>
              ) : filtered.map((d) => {
                const pri = priorityLabel(d.priority_score, d.is_emergency);
                return (
                  <tr key={d.id} className="hover:bg-gray-900/40 transition">
                    <td className="px-4 py-3 font-mono text-gray-400">
                      {d.id.slice(0, 8)}
                      {d.is_emergency && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-rose-500/20 text-rose-400 rounded">EMRG</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-200">{d.cargo_code ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{d.dest_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_BADGE[pri]}`}>
                        {pri.toUpperCase()} {d.priority_score ? `(${d.priority_score.toFixed(0)})` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[d.status] ?? 'bg-gray-700 text-gray-400'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {d.vehicle_label ? (
                        <span className="flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-blue-400" />
                          {d.vehicle_label}
                        </span>
                      ) : <span className="text-gray-600">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-amber-400">
                      {d.eta_p50 != null ? `h${d.eta_p50}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{d.weight_kg ? `${d.weight_kg} kg` : '—'}</td>
                    <td className="px-4 py-3">
                      {d.status === 'IN_TRANSIT' ? (
                        <button
                          onClick={() => handleMarkDelivered(d.id)}
                          disabled={updatingId === d.id}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 font-semibold rounded-lg transition text-[10px] disabled:opacity-50"
                        >
                          {updatingId === d.id ? '...' : 'Mark Delivered'}
                        </button>
                      ) : (
                        <span className="text-gray-600 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
