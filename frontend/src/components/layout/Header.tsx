import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  User,
  LogOut,
  Wifi,
  WifiOff,
  Truck,
  PackageCheck,
  Route,
  MapPin,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onToggleMobile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    logout,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    isOfflineMode,
    toggleOfflineMode,
    vehicles,
    deliveries,
    routes,
    incidents,
    districts,
    setSelectedVehicle,
    setSelectedIncident,
    setSelectedDelivery,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to format page title based on pathname
  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
        return 'Executive Operations Dashboard';
      case '/live-map':
        return 'Live Operations Map';
      case '/deliveries':
        return 'Consignment & Deliveries';
      case '/vehicles':
        return 'Fleet & Vehicle Inventory';
      case '/routes':
        return 'Route Intelligence & Corridors';
      case '/incidents':
        return 'Incident & Hazard Logs';
      case '/accessibility':
        return 'Accessibility & Terrain Intelligence';
      case '/ai-decision-center':
        return 'AI Decision & Dispatch Center';
      case '/what-if-simulation':
        return 'What-if Simulation Engine';
      case '/analytics':
        return 'Analytics & Regional KPI Hub';
      case '/network':
        return 'Multimodal Network Topology';
      case '/dpr':
        return 'DPR Infrastructure Intelligence';
      case '/offline':
        return 'Offline & Resilience Center';
      case '/settings':
        return 'Platform Settings';
      default:
        return 'NE-Setu Platform';
    }
  };

  // Global Search Filter Results
  const trimmedSearch = searchQuery.trim().toLowerCase();
  const searchResults = trimmedSearch
    ? {
        vehicles: vehicles.filter(
          (v) =>
            v.code.toLowerCase().includes(trimmedSearch) ||
            v.driver.toLowerCase().includes(trimmedSearch) ||
            v.cargo.toLowerCase().includes(trimmedSearch)
        ),
        deliveries: deliveries.filter(
          (d) =>
            d.trackingCode.toLowerCase().includes(trimmedSearch) ||
            d.destination.toLowerCase().includes(trimmedSearch) ||
            d.cargoType.toLowerCase().includes(trimmedSearch)
        ),
        routes: routes.filter(
          (r) =>
            r.code.toLowerCase().includes(trimmedSearch) ||
            r.name.toLowerCase().includes(trimmedSearch) ||
            r.pathDescription.toLowerCase().includes(trimmedSearch)
        ),
        incidents: incidents.filter(
          (i) =>
            i.code.toLowerCase().includes(trimmedSearch) ||
            i.location.toLowerCase().includes(trimmedSearch) ||
            i.type.toLowerCase().includes(trimmedSearch)
        ),
        districts: districts.filter(
          (dist) =>
            dist.name.toLowerCase().includes(trimmedSearch) ||
            dist.state.toLowerCase().includes(trimmedSearch)
        ),
      }
    : null;

  const totalResultsCount = searchResults
    ? searchResults.vehicles.length +
      searchResults.deliveries.length +
      searchResults.routes.length +
      searchResults.incidents.length +
      searchResults.districts.length
    : 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between gap-4">
      {/* Left section: Hamburger & Context Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-500">NE-Setu Command</span>
            <span>/</span>
            <span className="text-brand-700 font-bold">{getPageTitle(location.pathname)}</span>
          </div>
        </div>
      </div>

      {/* Middle section: Functional Global Search */}
      <div className="relative hidden md:flex items-center flex-1 max-w-md mx-4" ref={searchRef}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search V-409, R102, INC-4091, Tawang, medical..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown Popover */}
        {isSearchFocused && trimmedSearch && (
          <div className="absolute top-11 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
            <div className="p-3 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>Search Results for "{searchQuery}"</span>
              <span className="text-brand-600">{totalResultsCount} matches found</span>
            </div>

            {totalResultsCount === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No matching vehicles, consignments, routes, or hazards found.
              </div>
            ) : (
              <div className="p-2 space-y-3">
                {/* Vehicles Matches */}
                {searchResults!.vehicles.length > 0 && (
                  <div>
                    <span className="px-2 text-[10px] font-bold uppercase text-slate-400">Fleet Vehicles</span>
                    <div className="space-y-1 mt-1">
                      {searchResults!.vehicles.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => {
                            setSelectedVehicle(v);
                            setIsSearchFocused(false);
                            navigate('/vehicles');
                          }}
                          className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-brand-600" />
                            <div>
                              <span className="font-bold text-slate-900">{v.code}</span>
                              <span className="text-slate-500 ml-1.5 font-medium">({v.driver})</span>
                            </div>
                          </div>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                            {v.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deliveries Matches */}
                {searchResults!.deliveries.length > 0 && (
                  <div>
                    <span className="px-2 text-[10px] font-bold uppercase text-slate-400">Consignments</span>
                    <div className="space-y-1 mt-1">
                      {searchResults!.deliveries.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => {
                            setSelectedDelivery(d);
                            setIsSearchFocused(false);
                            navigate('/deliveries');
                          }}
                          className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <PackageCheck className="w-4 h-4 text-emerald-600" />
                            <div>
                              <span className="font-bold text-slate-900">{d.trackingCode}</span>
                              <span className="text-slate-500 ml-1.5 truncate max-w-[160px] inline-block align-bottom">{d.cargoType}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-brand-700 font-semibold">{d.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Incidents Matches */}
                {searchResults!.incidents.length > 0 && (
                  <div>
                    <span className="px-2 text-[10px] font-bold uppercase text-slate-400">Active Hazards</span>
                    <div className="space-y-1 mt-1">
                      {searchResults!.incidents.map((i) => (
                        <div
                          key={i.id}
                          onClick={() => {
                            setSelectedIncident(i);
                            setIsSearchFocused(false);
                            navigate('/incidents');
                          }}
                          className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            <div>
                              <span className="font-bold text-slate-900">{i.code}</span>
                              <span className="text-slate-500 ml-1.5">{i.type} at {i.location}</span>
                            </div>
                          </div>
                          <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                            {i.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Routes Matches */}
                {searchResults!.routes.length > 0 && (
                  <div>
                    <span className="px-2 text-[10px] font-bold uppercase text-slate-400">Corridors</span>
                    <div className="space-y-1 mt-1">
                      {searchResults!.routes.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate('/routes');
                          }}
                          className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Route className="w-4 h-4 text-brand-600" />
                            <span className="font-bold text-slate-900">{r.code}: {r.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Districts Matches */}
                {searchResults!.districts.length > 0 && (
                  <div>
                    <span className="px-2 text-[10px] font-bold uppercase text-slate-400">Districts</span>
                    <div className="space-y-1 mt-1">
                      {searchResults!.districts.map((dist) => (
                        <div
                          key={dist.id}
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate('/accessibility');
                          }}
                          className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-brand-600" />
                            <span className="font-bold text-slate-900">{dist.name}, {dist.state}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-600">Access {dist.accessibilityScore}/100</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right section: System Status & User Actions */}
      <div className="flex items-center gap-3">
        {/* Offline Mode Indicator Badge / Toggle */}
        <button
          onClick={toggleOfflineMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            isOfflineMode
              ? 'bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/70'
          }`}
          title={isOfflineMode ? 'Operating on Local Mesh Cache' : 'Central Cloud Telemetry Connected'}
        >
          {isOfflineMode ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">NE Grid: Online</span>
            </>
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Regional Alerts & Logs</h4>
                  <p className="text-[10px] text-slate-500">{unreadCount} unread notifications</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400">No recent notifications.</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id);
                        if (notif.link) {
                          navigate(notif.link);
                          setIsNotifOpen(false);
                        }
                      }}
                      className={`p-3.5 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                        !notif.read ? 'bg-brand-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`font-bold ${!notif.read ? 'text-slate-900' : 'text-slate-700'}`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* Profile Pill & Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-medium">DoNER Logistics Cell</p>
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50">
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-1">Gov-Grade Authenticated</p>
              </div>

              <div className="p-1 space-y-1">
                <Link
                  to="/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Platform Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
