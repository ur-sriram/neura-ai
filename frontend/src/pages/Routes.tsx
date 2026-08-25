import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import {
  Route,
  Compass,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RouteOption } from '../types';

export const Routes: React.FC = () => {
  const { calculateRoutes } = useApp();

  // Form Inputs
  const [origin, setOrigin] = useState('Guwahati (Central Hub)');
  const [destination, setDestination] = useState('Shillong (Civil Hospital)');
  const [vehicleType, setVehicleType] = useState('4x4 Hill Terrain Hauler');
  const [cargoType, setCargoType] = useState('Emergency Pharmaceuticals & Cold Chain');
  const [weightKg, setWeightKg] = useState(2800);
  const [priority, setPriority] = useState('Emergency');
  const [departureTime, setDepartureTime] = useState('Immediate (Next 15 mins)');

  const [calculatedOptions, setCalculatedOptions] = useState<RouteOption[]>(() =>
    calculateRoutes(origin, destination, vehicleType, cargoType, weightKg, priority)
  );

  const [selectedRouteId, setSelectedRouteId] = useState<string>('rt-dyn-b');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDispatchedSuccess, setIsDispatchedSuccess] = useState(false);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setIsDispatchedSuccess(false);

    setTimeout(() => {
      const results = calculateRoutes(origin, destination, vehicleType, cargoType, weightKg, priority);
      setCalculatedOptions(results);
      // Select the recommended one
      const rec = results.find((r) => r.recommended) || results[0];
      setSelectedRouteId(rec.id);
      setIsCalculating(false);
    }, 500);
  };

  const handleDispatchSelected = () => {
    setIsDispatchedSuccess(true);
  };

  const selectedRouteObj = calculatedOptions.find((r) => r.id === selectedRouteId) || calculatedOptions[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic Route & Corridor Intelligence"
        description="Autonomous route optimization engine incorporating live terrain vulnerabilities, landslide risk models, Brahmaputra riverway drafts, and high-altitude weather telemetry."
        badge="Adaptive Routing Engine"
        badgeType="info"
      >
        <button
          onClick={() => {
            setOrigin('Guwahati (Central Hub)');
            setDestination('Tawang (Military Base)');
            setPriority('Emergency');
            setCargoType('Aviation High-Altitude Cold Fuel');
          }}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Load Sela Corridor Scenario
        </button>
      </PageHeader>

      {/* Route Calculation Inputs Grid */}
      <div className="custom-card p-6 space-y-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-900">Multi-Modal Dispatch Parameters</h2>
              <p className="text-xs text-slate-500">Configure consignment origins, cargo weights, and mountain transit constraints</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Real-time Topo Model Active
          </span>
        </div>

        <form onSubmit={handleCalculate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Origin Logistics Gateway</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Destination Terminal</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Carrier / Vehicle Class</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500"
            >
              <option value="4x4 Hill Terrain Hauler">4x4 Hill Terrain Hauler (All-Weather)</option>
              <option value="Heavy Multi-Axle Freight Truck">Heavy Multi-Axle Freight Truck (NH 4-Lane)</option>
              <option value="Inland Waterways Cargo Barge">Inland Waterways Cargo Barge (NW-2 River)</option>
              <option value="Emergency Medical Heavy Drone">Emergency Medical Heavy Drone (BVLOS)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Cargo Priority Level</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500"
            >
              <option value="Emergency">🚨 Emergency (Green Channel)</option>
              <option value="High">⚠️ High Priority (PDS / Meds)</option>
              <option value="Normal">📦 Normal Commercial Freight</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Cargo Type</label>
            <input
              type="text"
              value={cargoType}
              onChange={(e) => setCargoType(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Consignment Weight (kg)</label>
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Departure Scheduling</label>
            <input
              type="text"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isCalculating}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-700/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isCalculating ? 'Computing Optimal Paths...' : 'Calculate Routes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3 Calculated Comparative Routes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Route className="w-4 h-4 text-brand-600" />
            <span>Multi-Modal Comparative Corridor Options</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">3 paths evaluated across distance, risk, and cost</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {calculatedOptions.map((opt) => {
            const isSelected = selectedRouteId === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => setSelectedRouteId(opt.id)}
                className={`custom-card p-5 cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-brand-600 shadow-lg bg-brand-50/20 border-brand-500'
                    : 'hover:border-slate-300'
                }`}
              >
                <div>
                  {opt.recommended && (
                    <div className="absolute -top-3 left-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>AI Recommended Choice</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2 mt-1">
                    <span className="font-extrabold text-sm text-slate-900">{opt.code}</span>
                    <span className="text-xs font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      Accessibility {opt.accessibilityScore}/100
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 leading-tight mb-2">{opt.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium mb-4">{opt.pathDescription}</p>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">Total Distance</span>
                      <p className="font-extrabold text-slate-900">{opt.distanceKm} km</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">Estimated Transit</span>
                      <p className="font-extrabold text-brand-700">{opt.etaHours} Hours</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">Terrain Risk</span>
                      <p className={`font-bold ${opt.terrainRisk === 'Low' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {opt.terrainRisk}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">Estimated Freight Cost</span>
                      <p className="font-extrabold text-slate-900">₹ {opt.estimatedCostInr.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <span>Mode: {opt.modes.join(' + ')}</span>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-brand-600' : 'text-slate-400'
                    }`}
                  >
                    {isSelected ? '✓ Selected' : 'Click to Select'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* "Why this route?" AI Rationale Card & Activation */}
      <div className="custom-card p-6 bg-gradient-to-br from-slate-900 to-navy-900 text-slate-100 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-brand-500/20 text-brand-300 rounded-lg border border-brand-400/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-extrabold text-white">Why this route? — AI Decision Logic</h3>
            </div>
            <p className="text-xs text-slate-300 font-medium max-w-3xl leading-relaxed pt-1">
              {selectedRouteObj.whyRecommended}
            </p>
          </div>

          <button
            onClick={handleDispatchSelected}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all shrink-0 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Authorize Dispatch on {selectedRouteObj.code}</span>
          </button>
        </div>

        {isDispatchedSuccess && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Route {selectedRouteObj.code} successfully locked and dispatched to vehicle onboard beacon!
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
