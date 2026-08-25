import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import {
  ShieldAlert,
  Search,
  HeartPulse,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DistrictAccessibility, DistrictRiskColor } from '../types';

export const Accessibility: React.FC = () => {
  const { districts, stateIndices } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('All');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('All');
  const [inspectingDistrict, setInspectingDistrict] = useState<DistrictAccessibility | null>(null);

  const states = ['All', 'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'];

  // Filter districts
  const filteredDistricts = districts.filter((dist) => {
    const matchesSearch =
      !searchQuery ||
      dist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dist.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dist.cutoffRisk.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = selectedRiskFilter === 'All' || dist.riskClassification === selectedRiskFilter;
    const matchesState = selectedStateFilter === 'All' || dist.state === selectedStateFilter;
    return matchesSearch && matchesRisk && matchesState;
  });

  const redCount = districts.filter((d) => d.riskClassification === 'Red').length;
  const yellowCount = districts.filter((d) => d.riskClassification === 'Yellow').length;
  const greenCount = districts.filter((d) => d.riskClassification === 'Green').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accessibility & Terrain Vulnerability Index"
        description="Predictive isolation monitoring for frontier hill districts, critical stock depletion models, medical reachability windows, and real-time connectivity status across all 8 Northeastern states."
        badge="Accessibility Intelligence"
        badgeType="warning"
      >
        <button
          onClick={() => setSelectedRiskFilter('Red')}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Identify Vulnerable Areas ({redCount})</span>
        </button>
      </PageHeader>

      {/* State-by-State Average Accessibility Indices */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">
          State Logistics Accessibility Index (0 - 100)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {stateIndices.map((st) => (
            <div
              key={st.state}
              onClick={() => setSelectedStateFilter(st.state)}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                selectedStateFilter === st.state
                  ? 'bg-brand-50 border-brand-500 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 truncate">{st.state}</span>
              </div>
              <p className="text-xl font-black text-slate-900 mt-1">{st.score}</p>
              <span className={`text-[10px] font-bold ${st.status === 'High Access' ? 'text-emerald-600' : st.status === 'Moderate Access' ? 'text-amber-600' : 'text-rose-600'}`}>
                {st.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setSelectedRiskFilter(selectedRiskFilter === 'Red' ? 'All' : 'Red')}
          className={`custom-card p-4 cursor-pointer transition-all border-l-4 border-l-rose-500 ${
            selectedRiskFilter === 'Red' ? 'ring-2 ring-rose-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">High Risk / Isolated</span>
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
          </div>
          <p className="text-3xl font-black text-rose-600 mt-1.5">{redCount} Districts</p>
          <p className="text-[11px] text-rose-700 font-semibold mt-1">Single-corridor dependence or active slide</p>
        </div>

        <div
          onClick={() => setSelectedRiskFilter(selectedRiskFilter === 'Yellow' ? 'All' : 'Yellow')}
          className={`custom-card p-4 cursor-pointer transition-all border-l-4 border-l-amber-500 ${
            selectedRiskFilter === 'Yellow' ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moderate Caution</span>
            <span className="w-3 h-3 rounded-full bg-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-600 mt-1.5">{yellowCount} Districts</p>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">Weather alerts or slow hill passes</p>
        </div>

        <div
          onClick={() => setSelectedRiskFilter(selectedRiskFilter === 'Green' ? 'All' : 'Green')}
          className={`custom-card p-4 cursor-pointer transition-all border-l-4 border-l-emerald-500 ${
            selectedRiskFilter === 'Green' ? 'ring-2 ring-emerald-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">High Connectivity</span>
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-600 mt-1.5">{greenCount} Districts</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">Multi-lane NH / Rail / Riverway connected</p>
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
              placeholder="Search district name, state, risk factors..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <select
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="All">All Risk Colors (Green/Yellow/Red)</option>
              <option value="Red">Red (Severe Cutoff Risk)</option>
              <option value="Yellow">Yellow (Moderate Warning)</option>
              <option value="Green">Green (Safe / Connected)</option>
            </select>

            <select
              value={selectedStateFilter}
              onChange={(e) => setSelectedStateFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {states.map((st) => (
                <option key={st} value={st}>
                  {st === 'All' ? 'All 8 States' : st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* District Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDistricts.map((dist) => {
            const riskColor: DistrictRiskColor = dist.riskClassification;
            const badgeVariant = riskColor === 'Red' ? 'danger' : riskColor === 'Yellow' ? 'warning' : 'success';

            return (
              <div
                key={dist.id}
                onClick={() => setInspectingDistrict(dist)}
                className="custom-card p-5 cursor-pointer hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400">{dist.state}</span>
                    <Badge variant={badgeVariant} size="xs" dot>
                      {dist.riskClassification} Tier ({dist.connectivity})
                    </Badge>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 mb-1">{dist.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mb-3">{dist.vulnerabilityReason}</p>

                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Logistics Accessibility:</span>
                      <span className="font-bold text-slate-900">{dist.accessibilityScore} / 100</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          dist.accessibilityScore > 75
                            ? 'bg-emerald-500'
                            : dist.accessibilityScore > 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${dist.accessibilityScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-medium block">Emergency Access</span>
                      <span className="font-bold text-slate-800">{dist.emergencyAccessHours} Hours</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-medium block">Food Buffer Stock</span>
                      <span className="font-bold text-brand-700">{dist.bufferStockDays} Days Supply</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">Lifeline: {dist.primaryCorridor}</span>
                  <span className="font-bold text-brand-600 hover:text-brand-700">Inspect &gt;</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspecting District Modal */}
      {inspectingDistrict && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{inspectingDistrict.name} District</h3>
                <p className="text-xs text-slate-500">State: {inspectingDistrict.state} • Primary Corridor: {inspectingDistrict.primaryCorridor}</p>
              </div>
              <Badge variant={inspectingDistrict.riskClassification === 'Red' ? 'danger' : 'warning'} size="sm">
                Score: {inspectingDistrict.accessibilityScore}/100
              </Badge>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900">Vulnerability Analysis:</span>
                <p>{inspectingDistrict.vulnerabilityReason}</p>
                <p className="text-rose-600 font-semibold pt-1">Hazard Risk: {inspectingDistrict.cutoffRisk}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Affected Citizens</span>
                  <span className="text-base font-black text-slate-900">{inspectingDistrict.affectedPopulation.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Health Centers Covered</span>
                  <span className="text-base font-black text-emerald-600">{inspectingDistrict.healthCentersCount} CHCs</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => alert(`Contingency drone payload pre-authorized for ${inspectingDistrict.name}`)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Pre-Stage Emergency Buffer</span>
              </button>

              <button
                onClick={() => setInspectingDistrict(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
