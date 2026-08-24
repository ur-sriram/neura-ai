import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Activity, BatteryCharging, RefreshCw, Radio, Wifi, AlertTriangle } from 'lucide-react';
import { fetchVehicles } from '../../services/api';

const CLASS_BADGE: Record<string, string> = {
  heavy:          'bg-purple-500/20 text-purple-400',
  mini:           'bg-blue-500/20 text-blue-400',
  '4x4':          'bg-emerald-500/20 text-emerald-400',
  ambulance:      'bg-rose-500/20 text-rose-400',
  accessible_van: 'bg-amber-500/20 text-amber-400',
};

// Simulate per-vehicle state since DB VehicleState is empty in dev
function simulateVehicleState(v: any, idx: number) {
  const statuses = ['IN_TRANSIT', 'IN_TRANSIT', 'IN_TRANSIT', 'IDLE', 'MAINTENANCE', 'IDLE', 'IN_TRANSIT', 'OFFLINE'];
  const routes = [
    'Guwahati → Shillong', 'Shillong → Jowai', 'NH-6 Corridor',
    'Depot Standby', '—', 'NH-40 Bypass', 'Nongpoh → Umsning', '—'
  ];
  const locations = [
    'Near Nongpoh', 'Near Mawlai', 'Jowai Approach', 'Guwahati Depot',
    'Workshop Bay 3', 'NH-40 Km 48', 'Near Umsning', 'Offline'
  ];
  const drivers = ['Rakesh Das', 'Anil Thapa', 'Tenzin Norbu', 'Joseph L', 'Dr. Meera', 'Lalduhoma', 'Mizo T.', '—'];

  const i = idx % statuses.length;
  return {
    status: statuses[i],
    route: routes[i],
    location: locations[i],
    driver: drivers[i],
    fuel_pct: Math.max(15, 95 - idx * 11),
    last_ping: `${Math.floor(idx * 3.5 + 2)} min ago`,
  };
}

const STATUS_COLOR: Record<string, string> = {
  IN_TRANSIT:  'text-emerald-400',
  IDLE:        'text-blue-400',
  MAINTENANCE: 'text-amber-400',
  OFFLINE:     'text-gray-500',
};

const STATUS_DOT: Record<string, string> = {
  IN_TRANSIT:  'bg-emerald-400',
  IDLE:        'bg-blue-400',
  MAINTENANCE: 'bg-amber-400',
  OFFLINE:     'bg-gray-600',
};

export const VehicleTracking: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  const load = async () => {
    setLoading(true);
    const data = await fetchVehicles();
    setVehicles(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const enriched = vehicles.map((v, i) => ({ ...v, ...simulateVehicleState(v, i) }));
  const filtered = filter === 'ALL' ? enriched : enriched.filter(v => v.status === filter);

  const counts = {
    ALL: enriched.length,
    IN_TRANSIT: enriched.filter(v => v.status === 'IN_TRANSIT').length,
    IDLE: enriched.filter(v => v.status === 'IDLE').length,
    MAINTENANCE: enriched.filter(v => v.status === 'MAINTENANCE').length,
    OFFLINE: enriched.filter(v => v.status === 'OFFLINE').length,
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400" />
            Vehicle Tracking — Live Fleet Monitor
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Real-time vehicle positions, status, driver info and fuel telemetry</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Vehicles', key: 'ALL', icon: Truck, color: 'text-white', bg: 'bg-blue-500/10 text-blue-400' },
          { label: 'In Transit', key: 'IN_TRANSIT', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400' },
          { label: 'Idle', key: 'IDLE', icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-500/10 text-blue-400' },
          { label: 'Maintenance', key: 'MAINTENANCE', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 text-amber-400' },
          { label: 'Offline', key: 'OFFLINE', icon: Wifi, color: 'text-gray-500', bg: 'bg-gray-700/30 text-gray-500' },
        ].map(({ label, key, icon: Icon, color, bg }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`glass-panel p-4 rounded-xl border flex items-center gap-3 transition ${
              filter === key ? 'border-blue-500/50 bg-blue-500/5' : 'border-gray-800 hover:border-gray-700'
            }`}
          >
            <div className={`p-2 rounded-lg ${bg}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-gray-400 font-medium">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{counts[key as keyof typeof counts]}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Fleet Table */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Current Route</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Fuel / Battery</th>
                <th className="px-4 py-3">Last Ping</th>
                <th className="px-4 py-3">Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500">
                  <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-50" />
                  Loading fleet data...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500">
                  <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No vehicles match filter. Seed data via demo scenario.
                </td></tr>
              ) : filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-900/40 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[v.status] ?? 'bg-gray-600'}`} />
                      <span className="font-bold text-white">{v.label}</span>
                    </div>
                    <p className="text-[10px] text-gray-600 pl-4 font-mono">{v.id?.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CLASS_BADGE[v.vclass] ?? 'bg-gray-700 text-gray-400'}`}>
                      {v.vclass?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{v.driver}</td>
                  <td className="px-4 py-3 text-gray-400">{v.route}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${STATUS_COLOR[v.status] ?? 'text-gray-400'}`}>
                      {v.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-600" />
                    {v.location}
                  </td>
                  <td className="px-4 py-3 w-36">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${v.fuel_pct > 50 ? 'bg-emerald-500' : v.fuel_pct > 25 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${v.fuel_pct}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-bold min-w-[32px] ${v.fuel_pct > 50 ? 'text-emerald-400' : v.fuel_pct > 25 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {v.fuel_pct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{v.last_ping}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {v.capacity_kg ? `${v.capacity_kg.toLocaleString()} kg` : '—'}
                    {v.cold_chain && <span className="ml-1 text-[9px] text-cyan-400 font-bold">❄ COLD</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
