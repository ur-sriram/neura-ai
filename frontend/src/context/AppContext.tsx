import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Vehicle,
  Delivery,
  RouteOption,
  Incident,
  DistrictAccessibility,
  AIRecommendation,
  SimulationResult,
  NetworkNode,
  DPRProject,
  NotificationItem,
  PlatformSettings,
  IncidentStatus,
  VehicleStatus,
} from '../types';
import {
  INITIAL_VEHICLES,
  INITIAL_DELIVERIES,
  INITIAL_INCIDENTS,
  INITIAL_DISTRICTS,
  INITIAL_AI_RECOMMENDATIONS,
  INITIAL_ROUTES,
  INITIAL_NETWORK_NODES,
  INITIAL_DPR_PROJECTS,
  INITIAL_NOTIFICATIONS,
  DEFAULT_SETTINGS,
} from '../data/mockData';
import { gpsSimulationService } from '../services/gpsSimulationService';

interface UserSession {
  isAuthenticated: boolean;
  email: string;
  name: string;
  role: string;
  agency: string;
}

interface AppContextType {
  // Authentication
  user: UserSession;
  login: (email: string, remember: boolean) => void;
  logout: () => void;

  // Datasets
  vehicles: Vehicle[];
  deliveries: Delivery[];
  incidents: Incident[];
  districts: DistrictAccessibility[];
  aiRecommendations: AIRecommendation[];
  routes: RouteOption[];
  networkNodes: NetworkNode[];
  dprProjects: DPRProject[];
  notifications: NotificationItem[];
  settings: PlatformSettings;
  isOfflineMode: boolean;
  isSyncing: boolean;
  lastSyncTime: string;

  // Selection & Inspector State
  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  selectedIncident: Incident | null;
  setSelectedIncident: (incident: Incident | null) => void;
  selectedDelivery: Delivery | null;
  setSelectedDelivery: (delivery: Delivery | null) => void;

  // Vehicle CRUD
  addVehicle: (newVehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, updatedFields: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;

  // Actions & Mutations
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  resolveIncident: (incidentId: string) => void;
  updateIncidentStatus: (incidentId: string, status: IncidentStatus) => void;
  acceptAIRecommendation: (recommendationId: string) => void;
  rejectAIRecommendation: (recommendationId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toggleOfflineMode: () => void;
  syncOfflineData: () => Promise<void>;
  updateSettings: (newSettings: Partial<PlatformSettings>) => void;
  calculateRoutes: (
    origin: string,
    destination: string,
    vehicleType: string,
    cargoType: string,
    weightKg: number,
    priority: string
  ) => RouteOption[];
  runSimulation: (
    scenarioType: string,
    affectedRoute: string,
    severity: string,
    durationDays: number,
    affectedDistrict: string,
    vehiclesCount: number
  ) => SimulationResult;
  stateIndices: { state: string; score: number; status: string }[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication state with local persistence
  const [user, setUser] = useState<UserSession>(() => {
    const saved = localStorage.getItem('nesetu_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      isAuthenticated: true,
      email: 'admin.officer@doner.gov.in',
      name: 'Dr. Debabrata Saikia',
      role: 'Regional Logistics Controller',
      agency: 'Ministry of Development of North Eastern Region (DoNER)',
    };
  });

  // State collections
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('nesetu_vehicles');
    return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
  });

  const [deliveries] = useState<Delivery[]>(() => {
    const saved = localStorage.getItem('nesetu_deliveries');
    return saved ? JSON.parse(saved) : INITIAL_DELIVERIES;
  });

  const [incidents, setIncidents] = useState<Incident[]>(() => {
    const saved = localStorage.getItem('nesetu_incidents');
    return saved ? JSON.parse(saved) : INITIAL_INCIDENTS;
  });

  const [districts] = useState<DistrictAccessibility[]>(INITIAL_DISTRICTS);
  
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>(() => {
    const saved = localStorage.getItem('nesetu_ai_recs');
    return saved ? JSON.parse(saved) : INITIAL_AI_RECOMMENDATIONS;
  });

  const [routes] = useState<RouteOption[]>(INITIAL_ROUTES);
  const [networkNodes] = useState<NetworkNode[]>(INITIAL_NETWORK_NODES);
  const [dprProjects] = useState<DPRProject[]>(INITIAL_DPR_PROJECTS);
  
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('nesetu_notifs');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [settings, setSettings] = useState<PlatformSettings>(() => {
    const saved = localStorage.getItem('nesetu_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem('nesetu_offline_mode') === 'true';
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  // Selected entities for global inspector drawers/modals
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  // Subscribe to live GPS simulation stream
  useEffect(() => {
    const unsubscribe = gpsSimulationService.subscribe((updated) => {
      setVehicles(updated);
      setSelectedVehicle((curr) => {
        if (!curr) return null;
        const found = updated.find((v) => v.id === curr.id);
        return found || curr;
      });
    });

    gpsSimulationService.start(() => vehicles);

    return () => {
      unsubscribe();
      gpsSimulationService.pause();
    };
  }, []);

  // Sync to LocalStorage on mutations
  useEffect(() => {
    localStorage.setItem('nesetu_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('nesetu_incidents', JSON.stringify(incidents));
  }, [incidents]);

  useEffect(() => {
    localStorage.setItem('nesetu_ai_recs', JSON.stringify(aiRecommendations));
  }, [aiRecommendations]);

  useEffect(() => {
    localStorage.setItem('nesetu_notifs', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('nesetu_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('nesetu_offline_mode', isOfflineMode.toString());
  }, [isOfflineMode]);

  // Auth actions
  const login = (email: string, remember: boolean) => {
    const newUser: UserSession = {
      isAuthenticated: true,
      email,
      name: email.split('@')[0].replace('.', ' ').toUpperCase(),
      role: 'Regional Logistics Controller',
      agency: 'Ministry of Development of North Eastern Region (DoNER)',
    };
    setUser(newUser);
    if (remember) {
      localStorage.setItem('nesetu_user_session', JSON.stringify(newUser));
    }
  };

  const logout = () => {
    setUser({
      isAuthenticated: false,
      email: '',
      name: '',
      role: '',
      agency: '',
    });
    localStorage.removeItem('nesetu_user_session');
  };

  // Vehicle CRUD
  const addVehicle = (newVehicleData: Omit<Vehicle, 'id'>) => {
    const newId = `veh-${Date.now()}`;
    const vehicle: Vehicle = {
      id: newId,
      ...newVehicleData,
      lastUpdated: 'Just now',
    };
    setVehicles((prev) => [vehicle, ...prev]);

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'New Vehicle Registered',
      message: `Carrier ${vehicle.code} (${vehicle.type}) added to active fleet tracking.`,
      time: 'Just now',
      read: false,
      type: 'success',
      link: '/vehicles',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const updateVehicle = (id: string, updatedFields: Partial<Vehicle>) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updatedFields, lastUpdated: 'Just now' } : v))
    );
    if (selectedVehicle?.id === id) {
      setSelectedVehicle((prev) => (prev ? { ...prev, ...updatedFields, lastUpdated: 'Just now' } : null));
    }
  };

  const deleteVehicle = (id: string) => {
    const target = vehicles.find((v) => v.id === id);
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    if (selectedVehicle?.id === id) {
      setSelectedVehicle(null);
    }
    if (target) {
      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: 'Vehicle De-registered',
        message: `Carrier ${target.code} removed from active fleet tracking.`,
        time: 'Just now',
        read: false,
        type: 'warning',
        link: '/vehicles',
      };
      setNotifications((prev) => [notif, ...prev]);
    }
  };

  // State actions
  const updateVehicleStatus = (vehicleId: string, status: VehicleStatus) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, status, lastUpdated: 'Just now' } : v))
    );
    if (selectedVehicle?.id === vehicleId) {
      setSelectedVehicle((prev) => (prev ? { ...prev, status, lastUpdated: 'Just now' } : null));
    }
  };

  const resolveIncident = (incidentId: string) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incidentId ? { ...inc, status: 'Resolved' } : inc))
    );
    if (selectedIncident?.id === incidentId) {
      setSelectedIncident((prev) => (prev ? { ...prev, status: 'Resolved' } : null));
    }
    // Add success notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Incident Resolved & Cleared',
      message: `Corridor blockage for incident #${incidentId} has been marked clear for traffic by Border Roads Organisation.`,
      time: 'Just now',
      read: false,
      type: 'success',
      link: '/incidents',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const updateIncidentStatus = (incidentId: string, status: IncidentStatus) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incidentId ? { ...inc, status } : inc))
    );
    if (selectedIncident?.id === incidentId) {
      setSelectedIncident((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const acceptAIRecommendation = (recId: string) => {
    setAiRecommendations((prev) =>
      prev.map((r) => (r.id === recId ? { ...r, status: 'Accepted' } : r))
    );
    const rec = aiRecommendations.find((r) => r.id === recId);
    if (rec) {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `AI Recommendation Authorized: ${rec.code}`,
        message: `Dispatched alternative instructions: ${rec.recommendedAction}`,
        time: 'Just now',
        read: false,
        type: 'info',
        link: '/ai-decision-center',
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  const rejectAIRecommendation = (recId: string) => {
    setAiRecommendations((prev) =>
      prev.map((r) => (r.id === recId ? { ...r, status: 'Rejected' } : r))
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleOfflineMode = () => {
    setIsOfflineMode((prev) => !prev);
  };

  const syncOfflineData = async () => {
    setIsSyncing(true);
    // Simulate mesh packet handshake delay
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsSyncing(false);
    setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    const syncNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Local Mesh Synchronized',
      message: 'All telemetry packets and pending dispatch orders synced with central command.',
      time: 'Just now',
      read: false,
      type: 'success',
    };
    setNotifications((prev) => [syncNotif, ...prev]);
  };

  const updateSettings = (newSettings: Partial<PlatformSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const calculateRoutes = (
    origin: string,
    destination: string,
    vehicleType: string,
    cargoType: string,
    weightKg: number,
    priority: string
  ): RouteOption[] => {
    const isHighPriority = priority === 'Emergency' || cargoType.toLowerCase().includes('med') || cargoType.toLowerCase().includes('vaccine');
    const isHillCarrier = vehicleType.includes('4x4') || vehicleType.includes('Drone');

    return [
      {
        id: 'rt-dyn-a',
        code: 'Route A',
        name: `Primary Highway Corridor (${origin} → ${destination})`,
        distanceKm: Math.floor(180 + Math.random() * 80),
        etaHours: parseFloat((4.5 + Math.random() * 1.2).toFixed(1)),
        accessibilityScore: 88,
        riskScore: 32,
        riskLevel: 'Low',
        terrainRisk: 'Low',
        trafficRisk: 'Medium',
        estimatedCostInr: Math.floor(11500 + weightKg * 1.8),
        modes: ['Road'],
        recommended: !isHighPriority,
        whyRecommended: 'Route A offers direct 4-lane national highway transit with minimal elevation grade and continuous roadside maintenance coverage.',
        pathDescription: `${origin} → Inter-State Junction → ${destination}`,
        coordinates: [
          [26.1445, 91.7362],
          [25.8500, 91.8000],
          [25.5788, 91.8933],
        ],
        activeHazardsCount: 0,
        elevationGainMeters: 1420,
      },
      {
        id: 'rt-dyn-b',
        code: 'Route B',
        name: `Multi-Modal Riverway Bypass (NW-2 Brahmaputra + Ridge Link)`,
        distanceKm: Math.floor(210 + Math.random() * 60),
        etaHours: parseFloat((3.8 + Math.random() * 0.8).toFixed(1)),
        accessibilityScore: 94,
        riskScore: 18,
        riskLevel: 'Low',
        terrainRisk: 'Low',
        trafficRisk: 'Low',
        estimatedCostInr: Math.floor(8200 + weightKg * 1.2),
        modes: ['Water', 'Road'],
        recommended: isHighPriority || isHillCarrier,
        whyRecommended: 'Combines river barge throughput on NW-2 to bypass high-risk landslide chokepoints, resulting in 28% lower freight emissions and zero hill traffic holds.',
        pathDescription: `${origin} → Pandu River Port (NW-2) → Intermodal Ridge Terminal → ${destination}`,
        coordinates: [
          [26.1445, 91.7362],
          [26.2000, 92.1000],
          [25.5788, 91.8933],
        ],
        activeHazardsCount: 0,
        elevationGainMeters: 620,
      },
      {
        id: 'rt-dyn-c',
        code: 'Route C',
        name: `High-Altitude Mountain Arterial Corridor`,
        distanceKm: Math.floor(160 + Math.random() * 40),
        etaHours: parseFloat((5.8 + Math.random() * 1.5).toFixed(1)),
        accessibilityScore: 68,
        riskScore: 65,
        riskLevel: 'High',
        terrainRisk: 'High',
        trafficRisk: 'Low',
        estimatedCostInr: Math.floor(14500 + weightKg * 2.2),
        modes: ['Road'],
        recommended: false,
        whyRecommended: 'Shorter linear distance but travels through active precipitation zones with steep gradients and 1 monitored active debris flow.',
        pathDescription: `${origin} → Pass Summit Checkpoint → ${destination}`,
        coordinates: [
          [26.1445, 91.7362],
          [26.8000, 92.4000],
          [25.5788, 91.8933],
        ],
        activeHazardsCount: 1,
        elevationGainMeters: 2850,
      },
    ];
  };

  const runSimulation = (
    scenarioType: string,
    affectedRoute: string,
    severity: string,
    durationDays: number,
    affectedDistrict: string,
    vehiclesCount: number
  ): SimulationResult => {
    const delayMultiplier = severity === 'Catastrophic' ? 24 : severity === 'Severe' ? 14 : 6;
    const estimatedDelayHours = parseFloat((durationDays * delayMultiplier * 0.45).toFixed(1));
    const delayedDeliveriesCount = Math.floor(vehiclesCount * (severity === 'Catastrophic' ? 0.9 : 0.65));
    const populationImpacted = Math.floor(35000 + durationDays * 8500);

    return {
      scenarioName: `${scenarioType} Disruption on ${affectedRoute}`,
      disasterType: scenarioType,
      affectedRoute,
      severity,
      durationDays,
      affectedDistrict,
      affectedVehiclesCount: vehiclesCount,
      delayedDeliveriesCount,
      estimatedDelayHours,
      populationImpacted,
      alternativeRouteName: `Emergency Multi-Modal Bypass Corridor via NW-2 / Inter-State Ridge Line`,
      estimatedRecoveryHours: durationDays * 18,
      modalShiftAvailable: true,
      hospitalSupplyRisk: durationDays > 6 ? 'Critical' : durationDays > 3 ? 'Moderate' : 'Safe',
      foodReserveDepletionDays: Math.max(1, 14 - durationDays * 2),
    };
  };

  // State Accessibility Indices for dashboard / analytics
  const stateIndices = [
    { state: 'Assam', score: 84, status: 'High Access' },
    { state: 'Meghalaya', score: 76, status: 'Moderate Access' },
    { state: 'Tripura', score: 81, status: 'High Access' },
    { state: 'Manipur', score: 62, status: 'Vulnerable' },
    { state: 'Mizoram', score: 58, status: 'Vulnerable' },
    { state: 'Nagaland', score: 65, status: 'Moderate Access' },
    { state: 'Arunachal Pradesh', score: 48, status: 'Severe Cutoff Risk' },
    { state: 'Sikkim', score: 54, status: 'Vulnerable' },
  ];

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        vehicles,
        deliveries,
        incidents,
        districts,
        aiRecommendations,
        routes,
        networkNodes,
        dprProjects,
        notifications,
        settings,
        isOfflineMode,
        isSyncing,
        lastSyncTime,
        selectedVehicle,
        setSelectedVehicle,
        selectedIncident,
        setSelectedIncident,
        selectedDelivery,
        setSelectedDelivery,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        updateVehicleStatus,
        resolveIncident,
        updateIncidentStatus,
        acceptAIRecommendation,
        rejectAIRecommendation,
        markNotificationRead,
        markAllNotificationsRead,
        toggleOfflineMode,
        syncOfflineData,
        updateSettings,
        calculateRoutes,
        runSimulation,
        stateIndices,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
