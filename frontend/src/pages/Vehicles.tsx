import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { VehicleFormModal } from '../components/modals/VehicleFormModal';
import {
  Truck,
  Plus,
  Search,
  BatteryCharging,
  Gauge,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Vehicle, VehicleStatus } from '../types';

export const Vehicles: React.FC = () => {
  const {
    vehicles,
    setSelectedVehicle,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateVehicleStatus,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'code' | 'speed' | 'fuel' | 'status'>('code');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const states = ['All', 'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'];

  const vehicleTypes = [
    'All',
    '4x4 Hill Terrain Hauler (Ashok Leyland)',
    'Heavy Multi-Axle Freight Truck (Tata Signa)',
    'Inland Waterways Cargo Barge (NW-2 River)',
    'Emergency Medical Heavy Drone (BVLOS SkyShip)',
    'Hill Ambulance & Critical Care Convoy',
  ];

  // Filter & Sort
  const filteredVehicles = vehicles
    .filter((v) => {
      const matchesSearch =
        !searchQuery ||
        v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.cargo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.currentLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.destination.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'All' || v.status === selectedStatus;
      const matchesType = selectedType === 'All' || v.type.toLowerCase().includes(selectedType.toLowerCase().slice(0, 8));
      const matchesState = selectedState === 'All' || v.state === selectedState;
      return matchesSearch && matchesStatus && matchesType && matchesState;
    })
    .sort((a, b) => {
      if (sortBy === 'speed') return b.speedKmH - a.speedKmH;
      if (sortBy === 'fuel') return b.fuelPercent - a.fuelPercent;
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return a.code.localeCompare(b.code);
    });

  const inTransitCount = vehicles.filter((v) => v.status === 'Active' || v.status === 'Delayed').length;
  const delayedCount = vehicles.filter((v) => v.status === 'Delayed').length;
  const emergencyCount = vehicles.filter((v) => v.status === 'Emergency').length;
  const avgReadiness = Math.round(
    vehicles.reduce((acc, curr) => acc + curr.telemetry.batteryHealthPercent, 0) / (vehicles.length || 1)
  );

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (v: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVehicle(v);
    setIsFormModalOpen(true);
  };

  const handleDelete = (id: string, code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to de-register vehicle ${code} from active telemetry?`)) {
      deleteVehicle(id);
    }
  };

  const handleSaveVehicle = (data: Omit<Vehicle, 'id'>, id?: string) => {
    if (id) {
      updateVehicle(id, data);
    } else {
      addVehicle(data);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet & Vehicle Telemetry Command"
        description="Comprehensive management of multi-modal vehicles: heavy haulage trucks, 4x4 hill-terrain carriers, river barges, and medical delivery drones across the 8 Northeastern states."
        badge="Fleet Operations Grid"
        badgeType="info"
      >
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vehicle</span>
        </button>
      </PageHeader>

      {/* Quick Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Registered Fleet</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{vehicles.length} Units</p>
            <span className="text-[11px] text-slate-400 font-medium">Road, River & Drone Carriers</span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicles In-Transit</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{inTransitCount} Active</p>
            <span className="text-[11px] text-emerald-600 font-semibold">Active GPS missions</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Weather Delayed / Alert</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{delayedCount + emergencyCount} Units</p>
            <span className="text-[11px] text-amber-700 font-semibold">{emergencyCount} high priority</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fleet Health Readiness</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{avgReadiness}%</p>
            <span className="text-[11px] text-blue-600 font-semibold">Ready for deployment</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BatteryCharging className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="custom-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicle code, driver, cargo, location..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active (In-Transit)</option>
              <option value="Delayed">Delayed (Hold)</option>
              <option value="Idle">Idle (Staged)</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Emergency">Emergency</option>
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {vehicleTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Carrier Types' : t}
                </option>
              ))}
            </select>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {states.map((st) => (
                <option key={st} value={st}>
                  {st === 'All' ? 'All States' : st}
                </option>
              ))}
            </select>

            {/* Sort Control */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="code">Sort: Vehicle ID</option>
              <option value="speed">Sort: Speed (High-Low)</option>
              <option value="fuel">Sort: Fuel / Battery %</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>
        </div>

        {/* Vehicles Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Vehicle ID</th>
                <th className="py-3 px-4">Carrier Type</th>
                <th className="py-3 px-4">Driver & Contact</th>
                <th className="py-3 px-4">Current Sector</th>
                <th className="py-3 px-4">Destination & ETA</th>
                <th className="py-3 px-4">Speed / Fuel</th>
                <th className="py-3 px-4">Quick Status</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No vehicles found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVehicle(v)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 text-xs bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                          {v.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 max-w-[170px]">
                        <p className="truncate">{v.type}</p>
                        <span className="text-[10px] text-slate-400 block">{v.cargo}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{v.driver}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{v.driverPhone}</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <p className="truncate max-w-[150px]">📍 {v.currentLocation}</p>
                        <span className="text-[10px] text-slate-400 block">State: {v.state}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 truncate max-w-[150px]">{v.destination}</p>
                        <p className="text-[10px] text-brand-700 font-medium">{v.eta}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 font-bold text-slate-900">
                            <span>{v.speedKmH} km/h</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span>{v.fuelPercent}% fuel</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={v.status}
                          onChange={(e) => updateVehicleStatus(v.id, e.target.value as VehicleStatus)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="Active">Active</option>
                          <option value="Delayed">Delayed</option>
                          <option value="Idle">Idle</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Emergency">Emergency</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 font-mono">
                        {v.lastUpdated}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicle(v);
                            }}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Inspect Vehicle Telemetry"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleOpenEdit(v, e)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Vehicle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(v.id, v.code, e)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Vehicle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      <VehicleFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingVehicle(null);
        }}
        onSave={handleSaveVehicle}
        initialVehicle={editingVehicle}
      />
    </div>
  );
};
