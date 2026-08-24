import React from 'react';
import { LayoutDashboard, Map, Flame, Route, AlertTriangle, Cpu, FileText, Smartphone, Send, Package, Truck, Navigation as NavigationIcon } from 'lucide-react';

export type ScreenId =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9'
  | 'S_route' | 'S_deliveries' | 'S_vehicles';

interface NavigationProps {
  activeScreen: ScreenId;
  setActiveScreen: (s: ScreenId) => void;
  pendingApprovalCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeScreen,
  setActiveScreen,
  pendingApprovalCount = 0
}) => {
  const tabs: { id: ScreenId; label: string; icon: React.FC<any>; badge?: number }[] = [
    { id: 'S1',          label: 'Command Hub',         icon: LayoutDashboard },
    { id: 'S2',          label: 'Live Map',             icon: Map },
    { id: 'S3',          label: 'Heatmap',              icon: Flame },
    { id: 'S_route',     label: 'Route Optimizer',      icon: NavigationIcon },
    { id: 'S_deliveries',label: 'Deliveries',           icon: Package },
    { id: 'S_vehicles',  label: 'Vehicle Tracking',     icon: Truck },
    { id: 'S4',          label: 'Plan & Dispatch',      icon: Route },
    { id: 'S5',          label: 'Disruption Console',   icon: AlertTriangle, badge: pendingApprovalCount },
    { id: 'S6',          label: 'What-If Simulator',    icon: Cpu },
    { id: 'S7',          label: 'Decision Log (XAI)',   icon: FileText },
    { id: 'S8',          label: 'Driver View',          icon: Smartphone },
    { id: 'S9',          label: 'Citizen Report',       icon: Send },
  ];

  return (
    <nav className="bg-[#0D1322] border-b border-gray-800 px-4 flex space-x-1 overflow-x-auto scrollbar-none">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeScreen === t.id;

        // Highlight new screens with a subtle accent
        const isNew = ['S_route', 'S_deliveries', 'S_vehicles'].includes(t.id);

        return (
          <button
            key={t.id}
            onClick={() => setActiveScreen(t.id)}
            className={`flex items-center space-x-2 px-3.5 py-2.5 border-b-2 text-xs font-medium transition-all whitespace-nowrap relative ${
              isActive
                ? 'border-blue-500 text-blue-400 bg-blue-500/5 font-semibold'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : isNew ? 'text-emerald-500/70' : 'text-gray-400'}`} />
            <span>{t.label}</span>
            {isNew && !isActive && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
            {t.badge && t.badge > 0 ? (
              <span className="ml-1.5 px-1.5 text-[10px] font-bold bg-amber-500 text-gray-950 rounded-full animate-pulse">
                {t.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};
