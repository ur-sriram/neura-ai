import React from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  MapPin,
  Clock,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { Delivery } from '../../types';

interface DeliveryDetailModalProps {
  delivery: Delivery | null;
  onClose: () => void;
}

export const DeliveryDetailModal: React.FC<DeliveryDetailModalProps> = ({
  delivery,
  onClose,
}) => {
  if (!delivery) return null;

  const statusVariant =
    delivery.status === 'In Transit'
      ? 'info'
      : delivery.status === 'Delivered'
      ? 'success'
      : delivery.status === 'Delayed'
      ? 'warning'
      : 'danger';

  const priorityVariant =
    delivery.priority === 'Emergency'
      ? 'danger'
      : delivery.priority === 'High'
      ? 'warning'
      : 'neutral';

  return (
    <Modal
      isOpen={!!delivery}
      onClose={onClose}
      title={`Consignment Manifest: ${delivery.trackingCode}`}
      subtitle={`DoNER Transit Permit • Priority: ${delivery.priority}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Header Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Cargo Classification</span>
            <p className="font-extrabold text-sm text-slate-900">{delivery.cargoType}</p>
            <p className="text-xs text-slate-500 font-medium">Consignee: {delivery.consignee}</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={priorityVariant} size="sm">
              {delivery.priority} Priority
            </Badge>
            <Badge variant={statusVariant} size="sm" dot>
              {delivery.status}
            </Badge>
          </div>
        </div>

        {/* Origin & Destination Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              <span>ORIGIN LOGISTICS HUB</span>
            </div>
            <p className="font-extrabold text-slate-900 text-sm">{delivery.origin}</p>
            <p className="text-xs text-slate-500">Dispatched: {delivery.dispatchedAt}</p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>FINAL DESTINATION DEPOT</span>
            </div>
            <p className="font-extrabold text-slate-900 text-sm">{delivery.destination}</p>
            <p className="text-xs text-emerald-600 font-semibold">Target ETA: {delivery.eta}</p>
          </div>
        </div>

        {/* Cargo & Logistics Specifications */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 font-medium block">Total Mass</span>
            <span className="font-black text-slate-900 text-sm">{delivery.weightKg.toLocaleString()} kg</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 font-medium block">Declared Value</span>
            <span className="font-black text-slate-900 text-sm">₹ {(delivery.valueInr / 100000).toFixed(2)} Lakhs</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 font-medium block">Assigned Fleet</span>
            <span className="font-black text-brand-700 text-sm">{delivery.vehicleId}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 font-medium block">Driver Contact</span>
            <span className="font-black text-slate-900 text-sm">{delivery.driverName}</span>
          </div>
        </div>

        {/* 6-Stage Journey Milestone Timeline */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-600" />
            <span>Multi-Modal Journey Milestones</span>
          </h4>

          <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-3">
            {delivery.timeline.map((step, idx) => (
              <div key={idx} className="relative">
                <div
                  className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                    step.completed
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                      : step.current
                      ? 'border-brand-600 bg-brand-50 text-brand-600 ring-4 ring-brand-100'
                      : 'border-slate-300'
                  }`}
                >
                  {step.completed && <CheckCircle className="w-2.5 h-2.5" />}
                </div>

                <div className="text-xs">
                  <div className="flex items-center justify-between">
                    <p className={`font-bold ${step.current ? 'text-brand-700' : 'text-slate-900'}`}>
                      {step.title}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium">{step.timestamp}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">Location: {step.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={() => alert(`Official DoNER Waybill downloaded for Consignment ${delivery.trackingCode}`)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download Waybill PDF</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </Modal>
  );
};
