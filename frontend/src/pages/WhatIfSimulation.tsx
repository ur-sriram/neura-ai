import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import {
  Sliders,
  Play,
  GitBranch,
  Clock,
  Truck,
  Users,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SimulationResult } from '../types';

export const WhatIfSimulation: React.FC = () => {
  const { runSimulation } = useApp();

  // Inputs
  const [scenarioType, setScenarioType] = useState<string>('Landslide');
  const [affectedRoute, setAffectedRoute] = useState<string>('NH-40 Guwahati-Shillong Highway');
  const [severity, setSeverity] = useState<string>('Severe');
  const [durationDays, setDurationDays] = useState<number>(5);
  const [affectedDistrict, setAffectedDistrict] = useState<string>('East Khasi Hills (Shillong)');
  const [vehiclesCount, setVehiclesCount] = useState<number>(18);

  const [simulationResult, setSimulationResult] = useState<SimulationResult>(() =>
    runSimulation('Landslide', 'NH-40 Guwahati-Shillong Highway', 'Severe', 5, 'East Khasi Hills (Shillong)', 18)
  );

  const [isRunning, setIsRunning] = useState(false);

  const handleRunSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setTimeout(() => {
      const res = runSimulation(scenarioType, affectedRoute, severity, durationDays, affectedDistrict, vehiclesCount);
      setSimulationResult(res);
      setIsRunning(false);
    }, 600);
  };

  const handleLoadPreset = (type: string, route: string, sev: string, days: number, dist: string, vechs: number) => {
    setScenarioType(type);
    setAffectedRoute(route);
    setSeverity(sev);
    setDurationDays(days);
    setAffectedDistrict(dist);
    setVehiclesCount(vechs);
    const res = runSimulation(type, route, sev, days, dist, vechs);
    setSimulationResult(res);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="What-if Simulation & Scenario Planning Engine"
        description="Stress-test Northeast supply chains against simulated climate shocks, landslide road cuts, bridge outages, and multi-modal bottlenecks before they occur."
        badge="Contingency Modeling"
        badgeType="info"
      >
        <button
          onClick={() => handleLoadPreset('Flood', 'NH-515 Upper Assam Corridor', 'Catastrophic', 7, 'Dhemaji & Lakhimpur', 34)}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Preset: Assam Flood Surge
        </button>
        <button
          onClick={() => handleLoadPreset('Landslide', 'NH-13 Trans-Arunachal (Sela Pass)', 'Severe', 5, 'Tawang & West Kameng', 18)}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Preset: Sela Landslide
        </button>
      </PageHeader>

      {/* Scenario Control Panel Form */}
      <div className="custom-card p-6 bg-white border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-900">Disruption Scenario Parameters</h2>
              <p className="text-xs text-slate-500">Configure simulated catastrophe parameters across Northeast corridors</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-400">Monte Carlo Simulation Grid</span>
        </div>

        <form onSubmit={handleRunSimulation} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Disaster / Hazard Event Type</label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500"
            >
              <option value="Landslide">Major Hill Landslide</option>
              <option value="Flood">Monsoon River Inundation & Flash Flood</option>
              <option value="Heavy Rainfall">Extreme Cloudburst Precipitation</option>
              <option value="Bridge Closure">Bridge Structural Damage / Scour</option>
              <option value="Road Blockage">Corridor Chokepoint Gridlock</option>
              <option value="Vehicle Failure">Heavy Carrier Convoy Breakdown</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Simulated Corridor Under Disruption</label>
            <input
              type="text"
              value={affectedRoute}
              onChange={(e) => setAffectedRoute(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Hazard Severity Rating</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500"
            >
              <option value="Moderate">Moderate Disruption (Single Lane Passable)</option>
              <option value="Severe">Severe Cutoff (Total Arterial Block)</option>
              <option value="Catastrophic">Catastrophic Shock (Multi-Bridge Failure)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Disruption Duration (Days)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Primary Affected District</label>
            <input
              type="text"
              value={affectedDistrict}
              onChange={(e) => setAffectedDistrict(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Staged / En-Route Fleet Count</label>
            <input
              type="number"
              min="1"
              max="200"
              value={vehiclesCount}
              onChange={(e) => setVehiclesCount(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isRunning}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-brand-700/20 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isRunning ? 'Running Monte Carlo Stress-Test...' : 'Execute What-If Simulation'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Simulation Results Dashboard */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span>Simulation Impact & Contingency Projection</span>
          </h3>
          <Badge variant="warning" size="sm">
            Scenario: {simulationResult.scenarioName}
          </Badge>
        </div>

        {/* 4 Impact Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="custom-card p-4 border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Estimated Transit Delay</span>
              <Clock className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-600 mt-1">+{simulationResult.estimatedDelayHours} Hours</p>
            <span className="text-[11px] text-slate-500">Average corridor latency</span>
          </div>

          <div className="custom-card p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Affected Convoys</span>
              <Truck className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{simulationResult.affectedVehiclesCount} Fleets</p>
            <span className="text-[11px] text-slate-500">{simulationResult.delayedDeliveriesCount} consignments delayed</span>
          </div>

          <div className="custom-card p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Population Impact</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {(simulationResult.populationImpacted / 1000).toFixed(1)}k Citizens
            </p>
            <span className="text-[11px] text-slate-500">Dependent habitations</span>
          </div>

          <div className="custom-card p-4 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Buffer Depletion</span>
              <ShieldAlert className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-700 mt-1">{simulationResult.foodReserveDepletionDays} Days</p>
            <span className="text-[11px] text-slate-500">Until essential stock critical</span>
          </div>
        </div>

        {/* Dynamic Contingency Plan Card */}
        <div className="custom-card p-6 bg-slate-900 text-slate-100 space-y-4 border border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-extrabold text-white">Recommended Contingency Bypass & Modal Shift</h4>
              </div>
              <p className="text-xs text-slate-300 font-medium pt-1">
                <strong>Primary Recommended Route:</strong> {simulationResult.alternativeRouteName}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Projected clearance & recovery time: <strong>~{simulationResult.estimatedRecoveryHours} Hours</strong>.
                {simulationResult.modalShiftAvailable
                  ? ' Multimodal shift to Brahmaputra river barge or rail freight is available to circumvent road blockage.'
                  : ' Dedicated hill pilot escort recommended for priority medical convoys.'}
              </p>
            </div>

            <button
              onClick={() => alert(`Contingency plan authorized! Dispatched alternative bypass instructions for ${simulationResult.alternativeRouteName}.`)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md shrink-0"
            >
              Authorize Contingency Protocol
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
