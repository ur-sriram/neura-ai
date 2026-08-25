import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { DPRDetailModal } from '../components/modals/DPRDetailModal';
import {
  Plus,
  Search,
  IndianRupee,
  Activity,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DPRProject } from '../types';

export const DPR: React.FC = () => {
  const { dprProjects } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [inspectingProject, setInspectingProject] = useState<DPRProject | null>(null);

  const categories = [
    'All',
    'Emergency Corridor',
    'River Port Terminal',
    'Road Expansion',
    'Helipad Network',
    'Bridge Upgrade',
    'Warehouse Development',
  ];

  const states = ['All', 'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Mizoram', 'Sikkim', 'Tripura', 'Nagaland', 'Manipur'];

  const filteredProjects = dprProjects.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contractor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesState = selectedState === 'All' || p.state === selectedState;
    return matchesSearch && matchesCategory && matchesState;
  });

  const totalSanctionedCrores = dprProjects.reduce((acc, curr) => acc + curr.estimatedCostCrores, 0);
  const avgCompletion = Math.round(dprProjects.reduce((acc, curr) => acc + curr.completionPercent, 0) / dprProjects.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="DPR Infrastructure & Project Intelligence"
        description="Detailed Project Report tracking for high-priority logistics lifelines, mountain tunnel corridors, river port berthing, and drone nest infrastructure across the Northeast region."
        badge="DoNER Capital Works"
        badgeType="info"
      >
        <button
          onClick={() => {
            const newDPR: DPRProject = {
              id: `dpr-${Date.now()}`,
              code: `DPR-NE-2026-${Math.floor(10 + Math.random() * 90)}`,
              name: 'Guwahati - North Guwahati Brahmaputra River 6-Lane Bridge Link',
              category: 'Bridge Upgrade',
              state: 'Assam',
              estimatedCostCrores: 2608,
              completionPercent: 82,
              priority: 'High',
              risk: 'Low',
              accessibilityImpactScore: 94,
              status: 'Under Construction',
              timeline: 'Target Commissioning: Dec 2026',
              affectedDistricts: ['Kamrup Metropolitan', 'Kamrup Rural'],
              contractor: 'SP Singla Constructions / Assam PWD',
              description: 'Constructs extra-dosed cable-stayed river bridge reducing commute time from 1 hour to 7 minutes.',
            };
            setInspectingProject(newDPR);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register New DPR</span>
        </button>
      </PageHeader>

      {/* Capital Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sanctioned Outlay</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₹ {totalSanctionedCrores.toLocaleString()} Cr</p>
            <span className="text-[11px] text-emerald-600 font-semibold">{dprProjects.length} Strategic Megaprojects</span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Execution Progress</p>
            <p className="text-2xl font-black text-brand-700 mt-1">{avgCompletion}%</p>
            <span className="text-[11px] text-slate-400 font-medium">Physical milestones on track</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Accessibility Boost</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">+89.4 / 100</p>
            <span className="text-[11px] text-slate-400 font-medium">Cutoff vulnerability reduction</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Project Table & Filters */}
      <div className="custom-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search project name, code, agency..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>

            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All States' : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">DPR Code</th>
                <th className="py-3 px-4">Infrastructure Project Name</th>
                <th className="py-3 px-4">State & Category</th>
                <th className="py-3 px-4">Estimated Outlay</th>
                <th className="py-3 px-4">Completion</th>
                <th className="py-3 px-4">Impact Boost</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No infrastructure projects found matching filters.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const statusVariant =
                    p.status === 'Completed'
                      ? 'success'
                      : p.status === 'Under Construction'
                      ? 'info'
                      : p.status === 'DPR Approved'
                      ? 'warning'
                      : 'neutral';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setInspectingProject(p)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-700">
                        {p.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.contractor}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{p.state}</span>
                        <span className="text-[10px] text-slate-400 block font-medium">{p.category}</span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        ₹ {p.estimatedCostCrores} Cr
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${p.completionPercent}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800">{p.completionPercent}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        +{p.accessibilityImpactScore}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={statusVariant} size="xs" dot>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingProject(p);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-brand-700 hover:bg-brand-50 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View DPR</span>
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

      <DPRDetailModal
        project={inspectingProject}
        onClose={() => setInspectingProject(null)}
      />
    </div>
  );
};
