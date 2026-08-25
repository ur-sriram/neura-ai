import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { NortheastMap } from '../components/maps/NortheastMap';
import { Badge } from '../components/common/Badge';
import { isWeatherApiConfigured } from '../services/openWeatherService';
import {
  AlertOctagon,
  Filter,
  Truck,
  Radio,
  Search,
  CloudSun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LiveMap: React.FC = () => {
  const {
    vehicles,
    incidents,
    setSelectedVehicle,
    setSelectedIncident,
  } = useApp();

  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const hasWeatherApiKey = isWeatherApiConfigured();
  const statesList = ['All', 'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'];

  // Filter vehicles for the sidebar telemetry inspector
  const filteredVehicles = vehicles.filter((v) => {
    const matchesState = selectedStateFilter === 'All' || v.state === selectedStateFilter;
    const matchesStatus = selectedStatusFilter === 'All' || v.status === selectedStatusFilter;
    const matchesSearch =
      !searchFilter ||
      v.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
      v.driver.toLowerCase().includes(searchFilter.toLowerCase()) ||
      v.cargo.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesState && matchesStatus && matchesSearch;
  });

  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Operations Map & GIS Command"
        description="Geospatial visualization of multi-modal transit corridors, active logistics convoys, and live terrain hazards across Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura."
        badge="Live GIS Grid"
        badgeType="success"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-sm">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>GPS Telemetry: Live Stream</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-sm">
            <CloudSun className="w-3.5 h-3.5 text-sky-400" />
            <span>{hasWeatherApiKey ? 'OpenWeather: Connected' : 'Weather: Live Telemetry'}</span>
          </div>
        </div>
      </PageHeader>

      {/* Map Filter & Metric Toolbar */}
      <div className="custom-card p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" /> Filter Region:
          </span>
          <select
            value={selectedStateFilter}
            onChange={(e) => setSelectedStateFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {statesList.map((st) => (
              <option key={st} value={st}>
                {st === 'All' ? 'All 8 NE States' : st}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="All">All Fleet Statuses</option>
            <option value="Active">Active Convoys</option>
            <option value="Delayed">Weather-Delayed</option>
            <option value="Emergency">Emergency</option>
            <option value="Idle">Idle / Staged</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-slate-600 font-semibold text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
            Active Fleet ({vehicles.filter((v) => v.status === 'Active').length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm" />
            Delayed ({vehicles.filter((v) => v.status === 'Delayed').length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm" />
            Hazards ({activeIncidents.length})
          </span>
        </div>
      </div>

      {/* Main Map & Live Telemetry Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Full Interactive Northeast GIS Map Canvas */}
        <div className="lg:col-span-3">
          <NortheastMap
            height="640px"
            stateFilter={selectedStateFilter}
            statusFilter={selectedStatusFilter}
          />
        </div>

        {/* Right 1 Col: Live Telemetry Drawer & Active Hazards */}
        <div className="space-y-6">
          {/* Fleet Telemetry Inspector */}
          <div className="custom-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-600" />
                <h3 className="font-extrabold text-xs text-slate-900">Fleet Inspector</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {filteredVehicles.length} Vehicles
              </span>
            </div>

            {/* Mini Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search fleet ID, driver..."
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            {/* Scrollable Vehicle List */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {filteredVehicles.map((v) => {
                const statusVariant =
                  v.status === 'Active'
                    ? 'success'
                    : v.status === 'Delayed'
                    ? 'warning'
                    : 'danger';

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVehicle(v)}
                    className="p-2.5 bg-slate-50 hover:bg-brand-50/50 hover:border-brand-300 border border-slate-200 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900">{v.code}</span>
                        <span className="text-[10px] text-slate-500 font-medium">({v.driver})</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate max-w-[150px] mt-0.5">
                        📍 {v.currentLocation}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="text-[11px] font-bold text-slate-800">{v.speedKmH} km/h</span>
                      <Badge variant={statusVariant} size="xs" dot>
                        {v.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Hazards Feed */}
          <div className="custom-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                <h3 className="font-extrabold text-xs text-slate-900">Active Hazard Zones</h3>
              </div>
              <Badge variant="danger" size="xs">
                {activeIncidents.length} Active
              </Badge>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {activeIncidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className="p-2.5 bg-rose-50/50 hover:bg-rose-100/60 border border-rose-200/80 rounded-xl cursor-pointer transition-all text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900">{inc.code}: {inc.type}</span>
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      {inc.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium truncate">{inc.location}</p>
                  <p className="text-[10px] text-rose-700 font-semibold">
                    Affected Route: {inc.affectedRoute} ({inc.affectedVehiclesCount} convoys)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
