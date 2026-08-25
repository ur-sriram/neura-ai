import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import {
  PackageCheck,
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Delivery } from '../types';

export const Deliveries: React.FC = () => {
  const { deliveries, setSelectedDelivery } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');

  const inTransitCount = deliveries.filter((d) => d.status === 'In Transit').length;
  const delayedCount = deliveries.filter((d) => d.status === 'Delayed').length;
  const atRiskCount = deliveries.filter((d) => d.status === 'At Risk').length;

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesSearch =
      !searchQuery ||
      d.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.consignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.cargoType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicleId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || d.status === selectedStatus;
    const matchesPriority = selectedPriority === 'All' || d.priority === selectedPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consignments & Multi-Modal Deliveries"
        description="Monitor freight manifests, emergency medical cold chains, PDS foodgrain shipments, and critical trade shipments across remote Northeast destinations."
        badge="Shipment Tracking"
        badgeType="info"
      >
        <button
          onClick={() => {
            const sample: Delivery = {
              id: `del-${Date.now()}`,
              trackingCode: `CN-${Math.floor(1000 + Math.random() * 9000)}-EMG`,
              consignee: 'Emergency Relief HQ, Pasighat',
              origin: 'Guwahati Air Cargo Complex',
              destination: 'District Hospital, Pasighat, Arunachal Pradesh',
              cargoType: 'Emergency Surgical Supplies & Cold Serum',
              weightKg: 1800,
              priority: 'Emergency',
              vehicleId: 'V-409',
              driverName: 'Bhaben Kalita',
              eta: 'Tomorrow 10:30 AM',
              status: 'In Transit',
              state: 'Arunachal Pradesh',
              valueInr: 2400000,
              isPerishable: true,
              dispatchedAt: new Date().toISOString(),
              timeline: [
                { title: 'Consignment Registered', timestamp: 'Just now', completed: true, location: 'Guwahati Hub' },
                { title: 'Dispatched on Green Channel', timestamp: 'Just now', completed: true, current: true, location: 'NH-27 Highway' },
                { title: 'River Crossing / Brahmaputra', timestamp: 'Est. 06:00 PM', completed: false, location: 'Bogibeel Bridge' },
                { title: 'Delivered to Pasighat Depot', timestamp: 'Est. Tomorrow 10:30 AM', completed: false, location: 'Pasighat Hospital' },
              ],
            };
            setSelectedDelivery(sample);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Consignment</span>
        </button>
      </PageHeader>

      {/* Shipment Status Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active In-Transit</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{inTransitCount}</p>
            <span className="text-[11px] text-slate-400 font-medium">Under transport</span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Weather-Delayed</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{delayedCount}</p>
            <span className="text-[11px] text-amber-600 font-semibold">Terrain hold</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">At Terrain Risk</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{atRiskCount}</p>
            <span className="text-[11px] text-rose-600 font-semibold">Rerouted / Priority</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="custom-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tracked</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{deliveries.length}</p>
            <span className="text-[11px] text-emerald-600 font-semibold">100% Geo-fenced</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Consignment Table */}
      <div className="custom-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracking code, consignee, cargo..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="All">All Statuses</option>
              <option value="In Transit">In Transit</option>
              <option value="Delayed">Delayed</option>
              <option value="At Risk">At Risk</option>
              <option value="Delivered">Delivered</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="All">All Priorities</option>
              <option value="Emergency">Emergency</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Consignment Code</th>
                <th className="py-3 px-4">Origin Hub</th>
                <th className="py-3 px-4">Destination Terminal</th>
                <th className="py-3 px-4">Cargo Type & Weight</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Vehicle / Driver</th>
                <th className="py-3 px-4">Target ETA</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Track</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No consignments found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((del) => {
                  const statusVariant =
                    del.status === 'In Transit'
                      ? 'info'
                      : del.status === 'Delivered'
                      ? 'success'
                      : del.status === 'Delayed'
                      ? 'warning'
                      : 'danger';

                  const priorityVariant =
                    del.priority === 'Emergency'
                      ? 'danger'
                      : del.priority === 'High'
                      ? 'warning'
                      : 'neutral';

                  return (
                    <tr
                      key={del.id}
                      onClick={() => setSelectedDelivery(del)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {del.trackingCode}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {del.origin}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{del.destination}</p>
                        <p className="text-[10px] text-slate-400">{del.consignee}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{del.cargoType}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{del.weightKg.toLocaleString()} kg</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={priorityVariant} size="xs">
                          {del.priority}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">{del.vehicleId}</span>
                        <span className="text-[10px] text-slate-400 block font-medium">({del.driverName})</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-brand-700">
                        {del.eta}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={statusVariant} size="xs" dot>
                          {del.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDelivery(del);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-brand-700 hover:bg-brand-50 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Timeline</span>
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
    </div>
  );
};
