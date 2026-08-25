import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { NortheastMap } from '../components/maps/NortheastMap';
import { LineChart, DonutChart } from '../components/charts/Charts';
import { Badge } from '../components/common/Badge';
import {
  Truck,
  PackageCheck,
  Route,
  AlertTriangle,
  MapPin,
  Cpu,
  MountainSnow,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    vehicles,
    deliveries,
    incidents,
    districts,
    aiRecommendations,
    acceptAIRecommendation,
    rejectAIRecommendation,
  } = useApp();

  const activeVehiclesCount = vehicles.filter((v) => v.status === 'Active' || v.status === 'Delayed').length;
  const activeConsignmentsCount = deliveries.filter((d) => d.status === 'In Transit' || d.status === 'Delayed').length;
  const activeHazardsCount = incidents.filter((i) => i.status !== 'Resolved').length;

  // Chart datasets
  const transitSpeedTrends = [
    { label: '06:00', value: 48 },
    { label: '08:00', value: 42 },
    { label: '10:00', value: 36 },
    { label: '12:00', value: 44 },
    { label: '14:00', value: 50 },
    { label: '16:00', value: 46 },
    { label: '18:00', value: 40 },
  ];

  const modalSplitData = [
    { label: 'Highways (Road)', value: 58, color: '#0259a1' },
    { label: 'Inland River (NW-2)', value: 24, color: '#0ea5e9' },
    { label: 'Rail Freight', value: 18, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Operations Dashboard"
        description="Real-time multi-modal logistics overview and terrain connectivity monitoring across the 8 Northeastern states."
        badge="NE Regional Grid"
        badgeType="info"
      >
        <button
          onClick={() => navigate('/analytics')}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Export Report
        </button>
        <button
          onClick={() => navigate('/routes')}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-sm flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Dispatch</span>
        </button>
      </PageHeader>

      {/* 4 High-Level KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div
          onClick={() => navigate('/vehicles')}
          className="custom-card p-5 flex items-center justify-between cursor-pointer hover:border-brand-300 group"
        >
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Fleet In-Transit</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1.5">{activeVehiclesCount}</p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+4 convoys dispatched today</span>
            </div>
          </div>
          <div className="p-3.5 bg-brand-50 text-brand-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div
          onClick={() => navigate('/deliveries')}
          className="custom-card p-5 flex items-center justify-between cursor-pointer hover:border-emerald-300 group"
        >
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Consignments</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1.5">{activeConsignmentsCount}</p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
              <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>96.4% on-schedule rate</span>
            </div>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div
          onClick={() => navigate('/routes')}
          className="custom-card p-5 flex items-center justify-between cursor-pointer hover:border-blue-300 group"
        >
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monitored Corridors</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1.5">32</p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
              <Route className="w-3.5 h-3.5 text-blue-600" />
              <span>NH, Riverway NW-2 & Rail</span>
            </div>
          </div>
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
            <Route className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div
          onClick={() => navigate('/incidents')}
          className="custom-card p-5 flex items-center justify-between cursor-pointer hover:border-rose-300 group"
        >
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Terrain Hazards</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1.5 text-rose-600">{activeHazardsCount}</p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-700 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>2 monitored landslips active</span>
            </div>
          </div>
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Left 2 Cols (Live Map + AI Dispatch Queue) | Right 1 Col (Accessibility & Metrics) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Operations Map Section */}
          <div className="custom-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900">Live Northeast Logistics Map</h2>
                  <p className="text-xs text-slate-500">Real-time GPS telemetry, active convoys, and hill terrain risk zones</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/live-map')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  <span>Full Map View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Simulated Interactive GIS Map Component */}
            <NortheastMap height="380px" />
          </div>

          {/* AI Decision & Adaptive Dispatch Center */}
          <div className="custom-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900">AI Decision & Adaptive Dispatch Center</h2>
                  <p className="text-xs text-slate-500">Autonomous terrain rerouting and multimodal dispatch recommendations</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/ai-decision-center')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>View All ({aiRecommendations.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of recent AI Recommendations with Accept/Reject actions */}
            <div className="space-y-3">
              {aiRecommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white hover:shadow-sm transition-all"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                        {rec.code}
                      </span>
                      <span className="font-bold text-xs text-slate-900 truncate">{rec.title}</span>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {rec.confidence}% Confidence
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium line-clamp-2">{rec.reason}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                      <span>Affected: <strong>{rec.affectedRoute}</strong></span>
                      {rec.delayAvoidedMinutes && (
                        <span className="text-emerald-600 font-semibold">Saves ~{(rec.delayAvoidedMinutes / 60).toFixed(1)} hrs</span>
                      )}
                    </div>
                  </div>

                  {/* Status & Decision Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {rec.status === 'Pending' ? (
                      <>
                        <button
                          onClick={() => acceptAIRecommendation(rec.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => rejectAIRecommendation(rec.id)}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <Badge
                        variant={rec.status === 'Accepted' ? 'success' : 'danger'}
                        size="sm"
                        dot
                      >
                        {rec.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Accessibility & Regional Metrics */}
        <div className="space-y-6">
          {/* Accessibility Intelligence Summary */}
          <div className="custom-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <MountainSnow className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900">Accessibility Intelligence</h2>
                  <p className="text-xs text-slate-500">District isolation & terrain reachability index</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/accessibility')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700"
              >
                Inspect
              </button>
            </div>

            {/* Quick District Vulnerability Strip */}
            <div className="space-y-2.5">
              {districts.slice(0, 4).map((dist) => {
                const badgeColor =
                  dist.riskClassification === 'Red'
                    ? 'danger'
                    : dist.riskClassification === 'Yellow'
                    ? 'warning'
                    : 'success';

                return (
                  <div
                    key={dist.id}
                    onClick={() => navigate('/accessibility')}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{dist.name}</span>
                        <span className="text-[10px] text-slate-400">({dist.state})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 truncate block max-w-[170px]">
                        {dist.cutoffRisk}
                      </span>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="text-xs font-black text-slate-900">
                        {dist.accessibilityScore}/100
                      </span>
                      <Badge variant={badgeColor} size="xs">
                        {dist.connectivity}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regional Performance Metrics */}
          <div className="custom-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900">Regional Performance</h2>
                  <p className="text-xs text-slate-500">Corridor speeds & multi-modal share</p>
                </div>
              </div>
            </div>

            {/* Speed Chart */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-700">Average Hill Transit Speed (km/h)</span>
                <span className="font-black text-brand-700">44.2 km/h</span>
              </div>
              <LineChart data={transitSpeedTrends} height={120} strokeColor="#0259a1" unit="km/h" />
            </div>

            {/* Multi-modal Donut */}
            <div className="pt-3 border-t border-slate-100">
              <span className="block text-xs font-bold text-slate-700 mb-2">Freight Multi-Modal Share</span>
              <DonutChart data={modalSplitData} size={110} centerValue="100%" centerLabel="Cargo" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
