import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Database,
  Radio,
  HardDrive,
  CheckCircle2,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Offline: React.FC = () => {
  const { isOfflineMode, toggleOfflineMode, isSyncing, syncOfflineData, lastSyncTime, vehicles, routes, districts } = useApp();

  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState(false);

  const pendingSyncQueue = [
    { type: 'Vehicle Telemetry Packet', code: 'V-409 GPS & Alt', time: '2 mins ago', size: '14 KB' },
    { type: 'Hazard Incident Log', code: 'INC-4091 Mudflow', time: '12 mins ago', size: '28 KB' },
    { type: 'Consignment Status Update', code: 'CN-8801-MED Escort', time: '18 mins ago', size: '8 KB' },
    { type: 'AI Optimization Decision', code: 'AIR-901 Sela Reroute', time: '24 mins ago', size: '42 KB' },
  ];

  const handleSync = async () => {
    setSyncSuccessMsg(false);
    await syncOfflineData();
    setSyncSuccessMsg(true);
    setTimeout(() => setSyncSuccessMsg(false), 4000);
  };

  const handleClearCache = () => {
    setCacheClearedSuccess(true);
    setTimeout(() => setCacheClearedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offline Mesh Sync & Resilience Center"
        description="High-resilience localized caching, peer-to-peer satellite mesh synchronization, and zero-connectivity field operations for remote Himalayan and border outposts."
        badge="Field Resilience Core"
        badgeType="warning"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={toggleOfflineMode}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
              isOfflineMode
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-600/30'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isOfflineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4 text-emerald-600" />}
            <span>{isOfflineMode ? 'Disable Offline Mode' : 'Simulate Offline Mode'}</span>
          </button>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronizing Packets...' : 'Sync Now'}</span>
          </button>
        </div>
      </PageHeader>

      {/* Sync Success Banner */}
      {syncSuccessMsg && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>All data synchronized successfully with Central Northeast Command!</span>
          </div>
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded">Sync Complete</span>
        </div>
      )}

      {/* Status Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="custom-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Connectivity Status</span>
            <Radio className={`w-4 h-4 ${isOfflineMode ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>
          <p className={`text-2xl font-black ${isOfflineMode ? 'text-amber-600' : 'text-emerald-600'}`}>
            {isOfflineMode ? 'Offline Local Mesh' : 'Online / Satellite Active'}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">Last Sync Timestamp: {lastSyncTime}</p>
        </div>

        <div className="custom-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Sync Items</span>
            <FileCheck className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{isOfflineMode ? pendingSyncQueue.length : 0} Packets</p>
          <p className="text-[11px] text-slate-400 font-medium">Auto-sync on mesh reconnection</p>
        </div>

        <div className="custom-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Local Storage Cache</span>
            <HardDrive className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">4.8 MB Cached</p>
          <p className="text-[11px] text-purple-700 font-semibold">100% Vector Maps & Corridors</p>
        </div>
      </div>

      {/* Cached Data & Resilient Assets Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Cached Data Breakdown */}
        <div className="custom-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-900">Offline Cached Data Repositories</h3>
            </div>
            <button
              onClick={handleClearCache}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Cache</span>
            </button>
          </div>

          {cacheClearedSuccess && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Local cache cleared and reinitialized with active baseline!</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-extrabold text-slate-900">Northeast Topographic GIS Map Tiles</p>
                <p className="text-[11px] text-slate-400">EPSG:4326 vector layers (8 States)</p>
              </div>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">2.4 MB (Ready)</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-extrabold text-slate-900">Corridor & Alternative Route Directory</p>
                <p className="text-[11px] text-slate-400">{routes.length} Verified Inter-State Corridors</p>
              </div>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">840 KB (Ready)</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-extrabold text-slate-900">District Vulnerability Matrix</p>
                <p className="text-[11px] text-slate-400">{districts.length} Frontier District Profiles</p>
              </div>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">520 KB (Ready)</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-extrabold text-slate-900">Fleet Telemetry & Emergency SOS Buffer</p>
                <p className="text-[11px] text-slate-400">{vehicles.length} En-Route Active Convoys</p>
              </div>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">1.1 MB (Ready)</span>
            </div>
          </div>
        </div>

        {/* Right: Pending Sync Queue */}
        <div className="custom-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-900">Mesh Sync Pipeline</h3>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
              {pendingSyncQueue.length} Packets Queued
            </span>
          </div>

          <div className="space-y-3">
            {pendingSyncQueue.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900">{item.code}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({item.type})</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Logged: {item.time}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-brand-700">{item.size}</span>
                  <span className="text-[10px] text-slate-400 block">Encrypted</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
