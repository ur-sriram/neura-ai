import { RiskLevel, VehicleStatus, IncidentType } from './index';

export type WeatherLayerType = 'none' | 'temp' | 'clouds' | 'precipitation' | 'wind';

export interface WeatherData {
  id: string;
  locationName: string;
  state: string;
  coordinates: [number, number]; // [lat, lng]
  tempC: number;
  feelsLikeC: number;
  condition: string;
  conditionCode: string; // 'Clear' | 'Clouds' | 'Rain' | 'Thunderstorm' | 'Drizzle' | 'Mist' | 'Fog' | 'Snow'
  iconUrl: string;
  humidity: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  visibilityKm: number;
  rainMm1h: number;
  cloudCoveragePercent: number;
  pressureHpa: number;
  logisticsRisk: RiskLevel;
  riskExplanation: string;
  lastUpdated: string;
  isSimulated: boolean;
}

export interface MapFilterOptions {
  showVehicles: boolean;
  showRoutes: boolean;
  showIncidents: boolean;
  showWeather: boolean;
  showRiverways: boolean;
  showRailways: boolean;
  showHubs: boolean;
  vehicleStatus: 'All' | VehicleStatus;
  incidentSeverity: 'All' | RiskLevel;
  incidentType: 'All' | IncidentType;
  stateRegion: string;
}

export interface HubNode {
  id: string;
  name: string;
  state: string;
  coordinates: [number, number];
  isHub: boolean;
  type: 'Capital & Command Hub' | 'Border Transit Port' | 'Inland River Port' | 'High-Altitude Staging Depot' | 'Multimodal Railhead';
  elevationMeters: number;
  connectedRoutes: string[];
}

export interface GPSStreamState {
  isActive: boolean;
  speedMultiplier: number; // 1x, 2x, 5x
  lastTickTimestamp: number;
}
