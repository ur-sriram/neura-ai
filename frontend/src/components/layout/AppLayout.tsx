import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '../../context/AppContext';
import { WifiOff, RefreshCw } from 'lucide-react';
import { VehicleDetailDrawer } from '../modals/VehicleDetailDrawer';
import { DeliveryDetailModal } from '../modals/DeliveryDetailModal';
import { IncidentDetailModal } from '../modals/IncidentDetailModal';

export const AppLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const {
    isOfflineMode,
    isSyncing,
    syncOfflineData,
    selectedVehicle,
    setSelectedVehicle,
    selectedDelivery,
    setSelectedDelivery,
    selectedIncident,
    setSelectedIncident,
  } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 antialiased selection:bg-brand-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Offline Banner if Active */}
        {isOfflineMode && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm z-40">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4" />
              <span>
                <strong>OFFLINE MESH MODE ACTIVE:</strong> Operating on local cached telemetry and offline routes.
              </span>
            </div>
            <button
              onClick={syncOfflineData}
              disabled={isSyncing}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Mesh Now'}</span>
            </button>
          </div>
        )}

        {/* Top Header */}
        <Header onToggleMobile={() => setIsOpenMobile((prev) => !prev)} />

        {/* Dynamic Page Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Global Footer */}
        <footer className="py-4 px-6 border-t border-slate-200/80 text-center text-xs text-slate-400 bg-white">
          <p>© {new Date().getFullYear()} NE-Setu — AI-Powered Adaptive Logistics & Accessibility Intelligence Platform. Ministry of DoNER.</p>
        </footer>
      </div>

      {/* Global Modals & Drawers */}
      <VehicleDetailDrawer
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
      />

      <DeliveryDetailModal
        delivery={selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
      />

      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
      />
    </div>
  );
};
