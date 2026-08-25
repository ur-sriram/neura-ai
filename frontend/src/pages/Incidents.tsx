import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import {
  Plus,
  Search,
  ShieldAlert,
  CloudRain,
  Flame,
  Eye,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Incident } from '../types';

export const Incidents: React.FC = () => {
  const { incidents, setSelectedIncident } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  const activeCount = incidents.filter((i) => i.status !== 'Resolved').length;
  const criticalCount = incidents.filter((i) => i.severity === 'Critical' && i.status !== 'Resolved').length;
  const underClearanceCount = incidents.filter((i) => i.status === 'Under Clearance').length;

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      !searchQuery ||
      inc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = selectedSeverity === 'All' || inc.severity === selectedSeverity;
    const matchesType = selectedType === 'All' || inc.type === selectedType;
    return matchesSearch && matchesSeverity && matchesType;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident & Terrain Hazard Management"
        description="Active tracking of multi-modal disruptions: landslides, flash floods, bridge washaways, road repairs, and extreme monsoon advisories across the 8 Northeastern states."
        badge="Safety & Hazard Watch"
        badgeType="warning"
      >
        <button
          onClick={() => {
            const newInc: Incident = {
              id: `inc-${Date.now()}`,
              code: `INC-${Math.floor(7000 + Math.random() * 2000)}`,
              title: 'Rapid Debris Flow on Bhalukpong Road',
              type: 'Landslide',
              location: 'NH-13 Km 32 near Bhalukpong',
              state: 'Arunachal Pradesh',
              corridor: 'Tezpur - Tawang Arterial',
              severity: 'High',
              detectedTime: 'Just now',
              affectedRoute: 'NH-13',
              affectedVehiclesCount: 7,
              status: 'Active',
              recommendedAction: 'Divert light convoys via Balemu bypass link.',
              coordinates: [27.0100, 92.6300],
              assignedTeam: 'BRO Rapid Hill Squadron',
              reportedBy: 'Highway Camera Telemetry',
              clearanceEtaHours: 3.5,
              description: 'Fresh slope failure triggered by persistent precipitation. One lane passable with safety guide.',
            };
            setSelectedIncident(newInc);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Report New Hazard</span>
        </button>
      </PageHeader>

      {/* Incident Categories Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="custom-card p-4 flex items-center justify-between border-l-4 border-l-rose-500">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Critical Blocks</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{criticalCount} Hazards</p>
            <span className="text-[11px] text-rose-600 font-semibold">Immediate attention needed</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Disruptions</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{activeCount}</p>
            <span className="text-[11px] text-amber-700 font-semibold">Monitored corridors</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <CloudRain className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Under Clearance / Repair</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{underClearanceCount}</p>
            <span className="text-[11px] text-blue-600 font-semibold">BRO / PWD crews deployed</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Incidents Table & Filter */}
      <div className="custom-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hazard ID, highway, state, cause..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="All">All Types</option>
              <option value="Landslide">Landslide</option>
              <option value="Flood">Flood</option>
              <option value="Road Closure">Road Closure</option>
              <option value="Bridge Damage">Bridge Damage</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Hazard ID</th>
                <th className="py-3 px-4">Type & Title</th>
                <th className="py-3 px-4">Location / Corridor</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Impacted Fleets</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No active hazard incidents found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const sevVariant =
                    inc.severity === 'Critical'
                      ? 'danger'
                      : inc.severity === 'High'
                      ? 'danger'
                      : inc.severity === 'Medium'
                      ? 'warning'
                      : 'success';

                  const statusVariant =
                    inc.status === 'Active'
                      ? 'danger'
                      : inc.status === 'Under Clearance'
                      ? 'warning'
                      : inc.status === 'Rerouted'
                      ? 'info'
                      : 'success';

                  return (
                    <tr
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {inc.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{inc.title}</p>
                        <p className="text-[10px] text-slate-400">Detected: {inc.detectedTime}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        📍 {inc.location}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {inc.state}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={sevVariant} size="xs" dot>
                          {inc.severity}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {inc.affectedVehiclesCount} Convoys
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={statusVariant} size="xs">
                          {inc.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIncident(inc);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-brand-700 hover:bg-brand-50 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
