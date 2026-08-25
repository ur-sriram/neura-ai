import { Vehicle } from '../types';

export interface VehicleCorridorPath {
  vehicleId: string;
  waypoints: [number, number][]; // [lat, lng]
  elevationProfile: number[];
  currentIndex: number;
  direction: 1 | -1; // 1 = forward, -1 = return
  baseSpeed: number;
}

// Detailed realistic geographic waypoints across Northeastern India highway and riverway corridors
export const VEHICLE_CORRIDORS: Record<string, VehicleCorridorPath> = {
  'veh-1': {
    // NH-40: Guwahati to Shillong via Nongpoh and Umiam
    vehicleId: 'veh-1',
    waypoints: [
      [26.1445, 91.7362], // Guwahati Hub
      [26.0500, 91.8000], // Jorabat Outpost
      [25.9750, 91.8450], // Byrnihat Gate
      [25.9038, 91.8812], // Nongpoh Curve (Incident Zone)
      [25.7500, 91.8800], // Umsning Junction
      [25.6600, 91.8900], // Umiam Escarpment
      [25.5788, 91.8933], // Shillong Civil Hospital
    ],
    elevationProfile: [55, 120, 280, 580, 890, 1100, 1496],
    currentIndex: 3.2,
    direction: 1,
    baseSpeed: 38,
  },
  'veh-2': {
    // NH-27 / NH-29: Guwahati to Dimapur via Jorhat
    vehicleId: 'veh-2',
    waypoints: [
      [26.1445, 91.7362], // Guwahati
      [26.3450, 92.6840], // Nagaon Bypass
      [26.5800, 93.1700], // Kaziranga Highway Corridor
      [26.7509, 94.2037], // Jorhat Multimodal Yard
      [26.5200, 93.9600], // Golaghat Ascent
      [25.9064, 93.7279], // Dimapur Logistics Hub
    ],
    elevationProfile: [55, 68, 85, 116, 145, 195],
    currentIndex: 3.1,
    direction: 1,
    baseSpeed: 52,
  },
  'veh-3': {
    // NH-13: Tezpur to Tawang via Bhalukpong & Sela Pass
    vehicleId: 'veh-3',
    waypoints: [
      [26.6338, 92.7926], // Tezpur Base
      [27.0100, 92.6300], // Bhalukpong Gate
      [27.2600, 92.4200], // Bomdila Ridge
      [27.3582, 92.2341], // Dirang Valley
      [27.5034, 92.1023], // Sela Tunnel Link
      [27.5861, 91.8658], // Tawang High-Altitude Base
    ],
    elevationProfile: [48, 210, 2217, 1560, 3170, 3048],
    currentIndex: 3.4,
    direction: 1,
    baseSpeed: 28,
  },
  'veh-4': {
    // NW-2 Inland Riverway: Pandu (Guwahati) to Dibrugarh
    vehicleId: 'veh-4',
    waypoints: [
      [26.1700, 91.7000], // Pandu Port Guwahati
      [26.2500, 92.1000], // Brahmaputra Morigaon Reach
      [26.6338, 92.7926], // Tezpur River Ghat
      [26.7200, 93.5500], // Silghat Port Sector
      [26.9800, 94.2500], // Majuli Riverway Channel
      [27.4728, 94.9120], // Bogibeel Port Dibrugarh
    ],
    elevationProfile: [45, 47, 48, 52, 65, 108],
    currentIndex: 2.3,
    direction: 1,
    baseSpeed: 18,
  },
  'veh-5': {
    // NH-6: Silchar to Aizawl
    vehicleId: 'veh-5',
    waypoints: [
      [24.8333, 92.7789], // Silchar Bypass
      [24.5100, 92.7400], // Vairengte Border Checkpoint
      [24.2200, 92.6700], // Kolasib Hill Siding
      [23.9500, 92.7100], // Durtlang Ridge
      [23.7271, 92.7176], // Aizawl Civil Supply Depot
    ],
    elevationProfile: [25, 180, 620, 1050, 1132],
    currentIndex: 0.8,
    direction: 1,
    baseSpeed: 42,
  },
  'veh-6': {
    // NH-102 (AH-1): Imphal to Moreh Border ICP
    vehicleId: 'veh-6',
    waypoints: [
      [24.8170, 93.9368], // Imphal Hub
      [24.6300, 93.9600], // Thoubal
      [24.4883, 93.9783], // Kakching
      [24.3200, 94.0800], // Pallel Hill Ascent
      [24.2400, 94.3000], // Moreh ICP (Myanmar Border)
    ],
    elevationProfile: [786, 770, 620, 910, 220],
    currentIndex: 2.1,
    direction: 1,
    baseSpeed: 36,
  },
  'veh-7': {
    // NH-10: Siliguri / Bagdogra to Gangtok
    vehicleId: 'veh-7',
    waypoints: [
      [26.7100, 88.3500], // Siliguri / Bagdogra
      [26.8800, 88.4700], // Sevoke Coronation Bridge
      [27.0500, 88.4333], // 29th Mile Teesta Hazard Zone
      [27.2341, 88.4982], // Singtam Junction
      [27.3100, 88.5800], // Ranipool Ascent
      [27.3389, 88.6065], // Gangtok STNM Hospital Hub
    ],
    elevationProfile: [120, 180, 290, 480, 950, 1650],
    currentIndex: 3.0,
    direction: 1,
    baseSpeed: 30,
  },
  'veh-8': {
    // Badarpur Rail Junction to Agartala Integrated Freight Terminal
    vehicleId: 'veh-8',
    waypoints: [
      [24.8967, 92.5714], // Badarpur Junction
      [24.3800, 92.1600], // Dharmanagar Rail Siding
      [24.0500, 92.0100], // Kumarghat Freight Loop
      [23.8800, 91.5800], // Teliamura Siding
      [23.8315, 91.2868], // Agartala Rail Terminal
    ],
    elevationProfile: [55, 48, 42, 35, 15],
    currentIndex: 0.9,
    direction: 1,
    baseSpeed: 48,
  },
};

type GPSSubscriber = (updatedVehicles: Vehicle[]) => void;

class GPSSimulationService {
  private subscribers: Set<GPSSubscriber> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private speedMultiplier: number = 1;
  private tickIntervalMs: number = 3000;

  /**
   * Subscribe to live vehicle position ticks
   */
  public subscribe(cb: GPSSubscriber): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  /**
   * Start or resume the realistic GPS simulation loop
   */
  public start(getVehicles: () => Vehicle[]) {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      const currentVehicles = getVehicles();
      const updated = this.simulateTick(currentVehicles);
      this.subscribers.forEach((cb) => cb(updated));
    }, this.tickIntervalMs / this.speedMultiplier);
  }

  /**
   * Stop / pause the GPS simulation loop
   */
  public pause() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Toggle speed multiplier (1x, 2x, 5x)
   */
  public setSpeedMultiplier(mult: number, getVehicles: () => Vehicle[]) {
    this.speedMultiplier = mult;
    if (this.isRunning) {
      this.pause();
      this.start(getVehicles);
    }
  }

  public getStatus(): { isRunning: boolean; speedMultiplier: number } {
    return { isRunning: this.isRunning, speedMultiplier: this.speedMultiplier };
  }

  /**
   * Calculates next interpolated coordinate and telemetry updates for vehicles
   */
  private simulateTick(vehicles: Vehicle[]): Vehicle[] {
    return vehicles.map((v) => {
      const corridor = VEHICLE_CORRIDORS[v.id];
      if (!corridor) {
        return v; // Unmanaged vehicle
      }

      // Idle or Emergency held vehicles move much slower or stay staged
      if (v.status === 'Idle') {
        return {
          ...v,
          speedKmH: 0,
          lastUpdated: 'Live GPS (Staged)',
        };
      }

      const totalWaypoints = corridor.waypoints.length;
      const stepSize = (0.045 + Math.random() * 0.02) * (v.status === 'Delayed' ? 0.4 : 1.0);

      // Advance index
      corridor.currentIndex += corridor.direction * stepSize;

      // Handle endpoints by reversing smoothly
      if (corridor.currentIndex >= totalWaypoints - 1) {
        corridor.currentIndex = totalWaypoints - 1;
        corridor.direction = -1;
      } else if (corridor.currentIndex <= 0) {
        corridor.currentIndex = 0;
        corridor.direction = 1;
      }

      // Linear interpolation between waypoints
      const lowerIdx = Math.floor(corridor.currentIndex);
      const upperIdx = Math.min(lowerIdx + 1, totalWaypoints - 1);
      const frac = corridor.currentIndex - lowerIdx;

      const p1 = corridor.waypoints[lowerIdx];
      const p2 = corridor.waypoints[upperIdx];

      const lat = p1[0] + (p2[0] - p1[0]) * frac;
      const lng = p1[1] + (p2[1] - p1[1]) * frac;

      // Interpolate altitude
      const alt1 = corridor.elevationProfile[lowerIdx] || 100;
      const alt2 = corridor.elevationProfile[upperIdx] || alt1;
      const altitude = Math.round(alt1 + (alt2 - alt1) * frac);

      // Fluctuate speed realistically
      const speedFluctuation = Math.round((Math.random() - 0.5) * 6);
      const targetSpeed = Math.max(12, Math.min(corridor.baseSpeed + speedFluctuation, 75));
      const currentSpeed = v.status === 'Delayed' ? Math.min(targetSpeed, 28) : targetSpeed;

      // Engine temp fluctuation
      const engineTemp = Math.round(80 + Math.random() * 8 + (altitude > 2000 ? 5 : 0));

      return {
        ...v,
        coordinates: [parseFloat(lat.toFixed(5)), parseFloat(lng.toFixed(5))],
        speedKmH: currentSpeed,
        lastUpdated: 'Live GPS (Just now)',
        telemetry: {
          ...v.telemetry,
          altitudeMeters: altitude,
          engineTempC: engineTemp,
        },
      };
    });
  }
}

export const gpsSimulationService = new GPSSimulationService();
