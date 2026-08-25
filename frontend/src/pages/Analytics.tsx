import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { BarChart, DonutChart } from '../components/charts/Charts';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  Download,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Analytics: React.FC = () => {
  const { vehicles, deliveries, incidents } = useApp();
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'custom'>('30d');

  // Chart datasets
  const monthlyThroughput = [
    { label: 'Jan', value: 42000, secondaryValue: 12000 },
    { label: 'Feb', value: 48000, secondaryValue: 14000 },
    { label: 'Mar', value: 55000, secondaryValue: 18000 },
    { label: 'Apr', value: 51000, secondaryValue: 16000 },
    { label: 'May', value: 62000, secondaryValue: 22000 },
    { label: 'Jun', value: 58000, secondaryValue: 28000 },
    { label: 'Jul', value: 64000, secondaryValue: 31000 },
    { label: 'Aug', value: 71000, secondaryValue: 35000 },
  ];

  const corridorEfficiency = [
    { label: 'NH-27', value: 92 },
    { label: 'NH-40', value: 78 },
    { label: 'NH-13', value: 68 },
    { label: 'NH-102', value: 85 },
    { label: 'NW-2 River', value: 94 },
    { label: 'NH-6', value: 74 },
  ];

  const delayBreakdown = [
    { label: 'Landslides & Rockfall', value: 45, color: '#f43f5e' },
    { label: 'Monsoon Floods', value: 28, color: '#f59e0b' },
    { label: 'Border Checkpoints', value: 15, color: '#38bdf8' },
    { label: 'Road Work / PWD', value: 12, color: '#a855f7' },
  ];

  const handleExportReport = () => {
    const reportData = {
      title: 'NE-Setu Regional Logistics Analytics Brief',
      generatedAt: new Date().toISOString(),
      dateRange: dateRange,
      totalVehiclesTracked: vehicles.length,
      activeDeliveries: deliveries.length,
      activeHazards: incidents.filter((i) => i.status !== 'Resolved').length,
      averageTransitSpeedKmH: 44.2,
      onTimeDeliveryRate: '94.8%',
      corridorEfficiencyIndices: corridorEfficiency,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NE-Setu_Logistics_Report_${dateRange}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Regional KPI Hub"
        description="Comprehensive analytics on freight throughput, corridor transit speeds, multi-modal cost-efficiency, and carbon footprint reduction across Northeast logistics routes."
        badge="Analytics Center"
        badgeType="info"
      >
        <div className="flex items-center gap-2">
          {/* Date range picker buttons */}
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setDateRange('today')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                dateRange === 'today' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRange('7d')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                dateRange === '7d' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                dateRange === '30d' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Executive Brief</span>
          </button>
        </div>
      </PageHeader>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Transit Time</p>
            <p className="text-2xl font-black text-slate-900 mt-1">4.8 hrs</p>
            <span className="text-[11px] text-emerald-600 font-semibold">-18% with AI rerouting</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">On-Time SLA Rate</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">94.8%</p>
            <span className="text-[11px] text-slate-400 font-medium">SLA adherence index</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Freight Volume Moved</p>
            <p className="text-2xl font-black text-slate-900 mt-1">106,000 MT</p>
            <span className="text-[11px] text-slate-400 font-medium">Across all 8 states</span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cost per Ton-Km</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₹ 2.14</p>
            <span className="text-[11px] text-emerald-600 font-semibold">-24% via Waterway NW-2</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Throughput Bar Chart */}
        <div className="custom-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Multi-Modal Freight Throughput (MT)</h3>
              <p className="text-xs text-slate-500">Blue: Roadways | Green: Inland Riverway NW-2</p>
            </div>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
              Monthly Trend
            </span>
          </div>
          <BarChart data={monthlyThroughput} height={200} barColor="#0259a1" secondaryColor="#10b981" unit="MT" />
        </div>

        {/* Bottleneck Delay Donut Chart */}
        <div className="custom-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Transit Delay Distribution</h3>
              <p className="text-xs text-slate-500">Categorized by natural hazards and operational holds</p>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
              Root Causes
            </span>
          </div>
          <div className="pt-4">
            <DonutChart data={delayBreakdown} size={150} centerValue="100%" centerLabel="Delays" />
          </div>
        </div>
      </div>

      {/* Corridor Efficiency Index Horizontal Bars */}
      <div className="custom-card p-5 space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3">
          Key Corridor Efficiency & Resilience Indices (0 - 100)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {corridorEfficiency.map((c) => (
            <div key={c.label} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-900">{c.label} Corridor</span>
                <span className="text-brand-700">{c.value}/100</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    c.value > 85 ? 'bg-emerald-500' : c.value > 70 ? 'bg-brand-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${c.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
