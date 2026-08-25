import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Truck,
  PackageCheck,
  Route,
  AlertTriangle,
  MountainSnow,
  BarChart3,
  Cpu,
  Sliders,
  Settings,
  Network,
  Building2,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (value: boolean) => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeType?: 'default' | 'danger' | 'warning' | 'info' | 'success';
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const { incidents, aiRecommendations, isOfflineMode } = useApp();

  const activeHazardsCount = incidents.filter((i) => i.status !== 'Resolved').length;
  const pendingDecisionsCount = aiRecommendations.filter((r) => r.status === 'Pending').length;

  const navGroups: NavGroup[] = [
    {
      groupTitle: 'CORE OPERATIONS',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Live Map', path: '/live-map', icon: Map, badge: 'Live', badgeType: 'success' },
      ],
    },
    {
      groupTitle: 'FLEET & LOGISTICS',
      items: [
        { label: 'Deliveries', path: '/deliveries', icon: PackageCheck },
        { label: 'Vehicles', path: '/vehicles', icon: Truck },
        { label: 'Routes', path: '/routes', icon: Route },
        {
          label: 'Incidents',
          path: '/incidents',
          icon: AlertTriangle,
          badge: activeHazardsCount > 0 ? activeHazardsCount : undefined,
          badgeType: 'danger',
        },
      ],
    },
    {
      groupTitle: 'ADAPTIVE INTELLIGENCE',
      items: [
        { label: 'Accessibility', path: '/accessibility', icon: MountainSnow },
        {
          label: 'AI Decision Center',
          path: '/ai-decision-center',
          icon: Cpu,
          badge: pendingDecisionsCount > 0 ? `${pendingDecisionsCount} New` : undefined,
          badgeType: 'info',
        },
        { label: 'What-if Simulation', path: '/what-if-simulation', icon: Sliders },
        { label: 'Analytics', path: '/analytics', icon: BarChart3 },
      ],
    },
    {
      groupTitle: 'NETWORK & RESILIENCE',
      items: [
        { label: 'Network', path: '/network', icon: Network },
        { label: 'DPR Intelligence', path: '/dpr', icon: Building2 },
        {
          label: 'Offline & Resilience',
          path: '/offline',
          icon: WifiOff,
          badge: isOfflineMode ? 'Offline' : undefined,
          badgeType: 'warning',
        },
      ],
    },
    {
      groupTitle: 'SYSTEM',
      items: [
        { label: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 bg-slate-900 text-slate-100 z-50 flex flex-col border-r border-slate-800 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg shadow-brand-900/40">
              NE
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base tracking-wide text-white truncate">
                  NE-Setu
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase truncate">
                  Logistics & Access AI
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.groupTitle}>
              {!isCollapsed && (
                <h4 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.groupTitle}
                </h4>
              )}
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setIsOpenMobile(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-brand-600 text-white shadow-sm shadow-brand-900/30'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        } ${isCollapsed ? 'justify-center px-2' : ''}`
                      }
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                      {!isCollapsed && item.badge !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            item.badgeType === 'danger'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                              : item.badgeType === 'warning'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : item.badgeType === 'success'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom Trust/Status Badge */}
        {!isCollapsed && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <p className="font-bold text-slate-200 text-[11px]">DoNER Regional Grid</p>
                <p className="text-[10px] text-slate-400">Gov-Grade Resilience</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
