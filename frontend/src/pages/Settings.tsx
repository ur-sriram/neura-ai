import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import {
  Shield,
  Bell,
  Database,
  Globe,
  Key,
  CheckCircle2,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PlatformSettings } from '../types';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useApp();

  const [activeTab, setActiveTab] = useState<'regional' | 'gis' | 'api' | 'notifications' | 'security'>('regional');
  const [formData, setFormData] = useState<PlatformSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform & Logistics Grid Settings"
        description="Manage regional logistics command configuration, GIS tile telemetry feeds, API gateway connections, telemetry polling rates, and automated alerts."
        badge="System Administration"
        badgeType="default"
      >
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Preferences</span>
        </button>
      </PageHeader>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-500 text-white rounded-2xl shadow-md text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Platform preferences saved to secure local storage!</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">Saved</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Navigation Tabs */}
        <div className="space-y-1.5">
          <button
            onClick={() => setActiveTab('regional')}
            className={`w-full text-left p-3 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all ${
              activeTab === 'regional'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Globe className="w-4 h-4 text-brand-400" />
            <span>Regional Command Identity</span>
          </button>

          <button
            onClick={() => setActiveTab('gis')}
            className={`w-full text-left p-3 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all ${
              activeTab === 'gis'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-brand-400" />
            <span>GIS & Telemetry Feeds</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`w-full text-left p-3 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all ${
              activeTab === 'api'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Key className="w-4 h-4 text-brand-400" />
            <span>API Keys & Integrations</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full text-left p-3 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all ${
              activeTab === 'notifications'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Bell className="w-4 h-4 text-brand-400" />
            <span>Hazard Alert Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full text-left p-3 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all ${
              activeTab === 'security'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Shield className="w-4 h-4 text-brand-400" />
            <span>Gov-Grade Security & Mesh</span>
          </button>
        </div>

        {/* Configuration Panel Body */}
        <div className="md:col-span-2 custom-card p-6 space-y-6">
          {activeTab === 'regional' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">Regional Logistics Command Identity</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Primary configuration for Northeast Logistics Command and Accessibility Hub.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Portal Display Name</label>
                  <input
                    type="text"
                    value={formData.portalName}
                    onChange={(e) => setFormData({ ...formData, portalName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Command Jurisdiction</label>
                    <input
                      type="text"
                      value={formData.regionalJurisdiction}
                      onChange={(e) => setFormData({ ...formData, regionalJurisdiction: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lead Operating Ministry / Agency</label>
                    <input
                      type="text"
                      value={formData.leadAgency}
                      onChange={(e) => setFormData({ ...formData, leadAgency: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preferred Display Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    <option value="English (India)">English (India)</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Assamese">Assamese (অসমীয়া)</option>
                    <option value="Manipuri">Manipuri (মৈতৈলোন্)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gis' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">GIS & Telemetry Polling</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure GPS sensor refresh rates and terrain map layers.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telemetry Synchronization Rate</label>
                  <select
                    value={formData.syncIntervalSeconds}
                    onChange={(e) => setFormData({ ...formData, syncIntervalSeconds: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    <option value={15}>Every 15 seconds (Real-time Tactical)</option>
                    <option value={30}>Every 30 seconds (Standard Balanced)</option>
                    <option value={60}>Every 60 seconds (Low Bandwidth Mode)</option>
                  </select>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-bold text-slate-900">High-Contrast Topo Maps</p>
                      <p className="text-[11px] text-slate-500">Enhanced contrast mode for military and field driver monitors</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.highContrastMap}
                      onChange={(e) => setFormData({ ...formData, highContrastMap: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-600"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">API Keys & External Webhooks</h3>
                <p className="text-xs text-slate-500 mt-0.5">Integrate IMD Doppler, BRO Sensors, and Vahan databases.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">India Meteorological Department (IMD) API Key</label>
                  <input
                    type="password"
                    defaultValue="imd_sec_key_88029141"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">National Highways & Logistics Portal (ULIP) Gateway</label>
                  <input
                    type="password"
                    defaultValue="ulip_gateway_live_token_772"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">Hazard & Re-Routing Notifications</h3>
                <p className="text-xs text-slate-500 mt-0.5">Set thresholds for automated dispatch notifications.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <div>
                    <p className="font-bold text-slate-900">Push Incident & Landslide Alerts</p>
                    <p className="text-[11px] text-slate-500">Receive instant push notifications when terrain hazards arise</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notificationsEnabled}
                    onChange={(e) => setFormData({ ...formData, notificationsEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <div>
                    <p className="font-bold text-slate-900">Autonomous AI Reroute Alerts</p>
                    <p className="text-[11px] text-slate-500">Notify officer when AI recalculates high-probability bypass routes</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoRerouteAlerts}
                    onChange={(e) => setFormData({ ...formData, autoRerouteAlerts: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">Gov-Grade Security & Mesh Resilience</h3>
                <p className="text-xs text-slate-500 mt-0.5">Peer-to-peer field encryption and role authentication.</p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-900">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>256-Bit Encrypted Regional Logistics Mesh</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  All telemetry packets transmitted over low-bandwidth satellite links are digitally signed with DoNER cryptographic tokens.
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save & Apply Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
