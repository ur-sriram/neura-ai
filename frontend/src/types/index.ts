export type VehicleStatus = 'Active' | 'Delayed' | 'Idle' | 'Emergency' | 'Maintenance';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type PriorityLevel = 'Critical' | 'Emergency' | 'High' | 'Medium' | 'Normal' | 'Low';
export type DeliveryStatus = 'In Transit' | 'Delivered' | 'Delayed' | 'At Risk' | 'Cancelled';
export type IncidentType = 'Landslide' | 'Flood' | 'Road Closure' | 'Bridge Damage' | 'Weather' | 'Vehicle Breakdown' | 'Traffic Congestion';
export type IncidentStatus = 'Active' | 'Under Clearance' | 'Resolved' | 'Rerouted';
export type TransportMode = 'Road' | 'Rail' | 'Water' | 'Air';
export type DistrictRiskColor = 'Green' | 'Yellow' | 'Red';

export interface Vehicle {
  id: string;
  code: string;
  type: string;
  driver: string;
  driverPhone: string;
  currentLocation: string;
  destination: string;
  speedKmH: number;
  fuelPercent: number;
  cargo: string;
  cargoWeightKg: number;
  status: VehicleStatus;
  risk: RiskLevel;
  eta: string;
  coordinates: [number, number]; // [lat, lng]
  state: string;
  routeId: string;
  lastUpdated: string;
  telemetry: {
    engineTempC: number;
    altitudeMeters: number;
    satelliteSignal: 'Strong' | 'Moderate' | 'Weak' | 'Mesh Relay';
    batteryHealthPercent: number;
  };
}

export interface DeliveryTimelineStep {
  title: string;
  timestamp: string;
  completed: boolean;
  current?: boolean;
  location: string;
  description?: string;
}

export interface Delivery {
  id: string;
  trackingCode: string;
  consignee: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  priority: PriorityLevel;
  vehicleId: string;
  driverName: string;
  eta: string;
  status: DeliveryStatus;
  state: string;
  valueInr: number;
  isPerishable: boolean;
  timeline: DeliveryTimelineStep[];
  dispatchedAt: string;
}

export interface RouteOption {
  id: string;
  code: string;
  name: string;
  distanceKm: number;
  etaHours: number;
  accessibilityScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  terrainRisk: RiskLevel;
  trafficRisk: 'Low' | 'Medium' | 'High';
  estimatedCostInr: number;
  modes: TransportMode[];
  recommended: boolean;
  whyRecommended?: string;
  pathDescription: string;
  coordinates: [number, number][];
  activeHazardsCount: number;
  elevationGainMeters: number;
}

export interface Incident {
  id: string;
  code: string;
  title: string;
  type: IncidentType;
  location: string;
  state: string;
  corridor: string;
  severity: RiskLevel;
  detectedTime: string;
  affectedRoute: string;
  affectedVehiclesCount: number;
  status: IncidentStatus;
  recommendedAction: string;
  coordinates: [number, number];
  assignedTeam?: string;
  reportedBy: string;
  clearanceEtaHours: number;
  description: string;
}

export interface DistrictAccessibility {
  id: string;
  name: string;
  state: string;
  accessibilityScore: number; // 0 - 100
  riskClassification: DistrictRiskColor;
  connectivity: 'High' | 'Moderate' | 'Low' | 'Critical Cutoff';
  affectedPopulation: number;
  emergencyAccessHours: number;
  terrainRisk: string;
  cutoffRisk: string;
  weatherCondition: string;
  lastUpdated: string;
  coordinates: [number, number];
  healthCentersCount: number;
  bufferStockDays: number;
  primaryCorridor: string;
  vulnerabilityReason: string;
}

export interface AIRecommendation {
  id: string;
  code: string;
  title: string;
  decision: string;
  reason: string;
  confidence: number; // 0 - 100
  impact: string;
  recommendedAction: string;
  affectedRoute: string;
  vehicleId?: string;
  severity: RiskLevel;
  status: 'Pending' | 'Accepted' | 'Rejected';
  timestamp: string;
  modalShift?: string;
  delayAvoidedMinutes?: number;
}

export interface SimulationResult {
  scenarioName: string;
  disasterType: string;
  affectedRoute: string;
  severity: string;
  durationDays: number;
  affectedDistrict: string;
  affectedVehiclesCount: number;
  delayedDeliveriesCount: number;
  estimatedDelayHours: number;
  populationImpacted: number;
  alternativeRouteName: string;
  estimatedRecoveryHours: number;
  modalShiftAvailable: boolean;
  hospitalSupplyRisk: 'Critical' | 'Moderate' | 'Safe';
  foodReserveDepletionDays: number;
}

export interface NetworkNode {
  id: string;
  name: string;
  code: string;
  type: 'City' | 'District' | 'Warehouse' | 'Transport Hub' | 'Border Point' | 'River Port';
  state: string;
  health: 'Normal' | 'Congested' | 'Critical' | 'Maintenance';
  connectivity: string;
  capacityUtilizedPercent: number;
  riskLevel: RiskLevel;
  supportedModes: TransportMode[];
  coordinates: [number, number];
  throughputDailyMT: number;
  managerContact: string;
  activeConvoysCount: number;
}

export interface DPRProject {
  id: string;
  code: string;
  name: string;
  category: 'Bridge Upgrade' | 'Road Expansion' | 'Warehouse Development' | 'Emergency Corridor' | 'Helipad Network' | 'River Port Terminal';
  state: string;
  estimatedCostCrores: number;
  completionPercent: number;
  priority: PriorityLevel;
  risk: RiskLevel;
  accessibilityImpactScore: number;
  status: 'Under Construction' | 'Tendering' | 'DPR Approved' | 'Feasibility Survey' | 'Completed';
  timeline: string;
  affectedDistricts: string[];
  contractor: string;
  description: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'alert' | 'warning' | 'info' | 'success';
  link?: string;
}

export interface PlatformSettings {
  portalName: string;
  regionalJurisdiction: string;
  leadAgency: string;
  syncIntervalSeconds: number;
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  autoRerouteAlerts: boolean;
  highContrastMap: boolean;
  offlineSyncEnabled: boolean;
  dataSaverMode: boolean;
  language: string;
}
