import { RiskLevel } from '../types';
import { WeatherData } from '../types/map';

export interface CalculatedRisk {
  level: RiskLevel;
  score: number; // 0 - 100
  explanation: string;
  advisories: string[];
  factors: {
    weatherScore: number;
    terrainScore: number;
    hazardScore: number;
  };
}

/**
 * Rule-based Weather + Terrain Logistics Risk Engine
 * Assesses operational hazard level by combining real-time meteorological metrics,
 * topographical vulnerability, and active road blockage telemetry.
 */
export function calculateLogisticsRisk(
  weather: Partial<WeatherData>,
  terrainElevationMeters: number = 200,
  isHighAltitudePass: boolean = false,
  activeHazardsCount: number = 0
): CalculatedRisk {
  let weatherScore = 10;
  let terrainScore = 15;
  let hazardScore = 0;
  const advisories: string[] = [];

  const rain = weather.rainMm1h || 0;
  const wind = weather.windSpeedKmh || 0;
  const vis = weather.visibilityKm !== undefined ? weather.visibilityKm : 10;
  const condition = (weather.conditionCode || weather.condition || '').toLowerCase();

  // 1. Weather impact rules
  if (condition.includes('thunderstorm') || condition.includes('squall') || condition.includes('cyclone')) {
    weatherScore += 45;
    advisories.push('Severe thunderstorm warning: halt high-profile container transports.');
  } else if (rain > 15 || condition.includes('heavy rain') || condition.includes('torrential')) {
    weatherScore += 40;
    advisories.push('Intense cloudburst: high saturation in hill cuttings prone to debris flows.');
  } else if (rain > 5 || condition.includes('rain') || condition.includes('drizzle')) {
    weatherScore += 20;
    advisories.push('Moderate rainfall: wet pavement, reduce convoy cruise speed by 20%.');
  }

  if (wind > 55) {
    weatherScore += 25;
    advisories.push('High gale gusts (>55 km/h): bridge crosswind restrictions active.');
  } else if (wind > 35) {
    weatherScore += 12;
  }

  if (vis < 1.0) {
    weatherScore += 30;
    advisories.push('Dense fog / low visibility (<1km): mandate convoy pilot escorts.');
  } else if (vis < 3.0) {
    weatherScore += 15;
    advisories.push('Moderate mist/fog: keep dipped headlights and fog beacons on.');
  }

  // 2. Terrain & Altitude impact rules
  if (isHighAltitudePass || terrainElevationMeters > 2200) {
    terrainScore += 35;
    if (weather.tempC !== undefined && weather.tempC <= 2) {
      terrainScore += 20;
      advisories.push('Sub-zero icing risk on high pass (Sela / Nathu La): snow chains mandatory.');
    }
  } else if (terrainElevationMeters > 1000) {
    terrainScore += 20;
  }

  // 3. Active Incident Proximity / Hazard count rules
  if (activeHazardsCount > 0) {
    hazardScore += Math.min(activeHazardsCount * 25, 50);
    advisories.push(`${activeHazardsCount} active corridor obstruction(s) within sector.`);
  }

  const totalScore = Math.min(Math.round(weatherScore * 0.4 + terrainScore * 0.35 + hazardScore * 0.25), 100);

  let level: RiskLevel = 'Low';
  let explanation = 'Normal operating conditions. Corridor is clear and safe for all transport classes.';

  if (totalScore >= 75 || (rain > 20 && terrainElevationMeters > 1500) || activeHazardsCount >= 2) {
    level = 'Critical';
    explanation = 'Critical Hazard: Severe weather combined with steep hill terrain or corridor blockage. Dispatch holds advised.';
  } else if (totalScore >= 50 || rain > 10 || activeHazardsCount === 1) {
    level = 'High';
    explanation = 'High Risk: Adverse weather or single-lane obstruction. High caution and monitoring required.';
  } else if (totalScore >= 30 || rain > 2 || vis < 4.0) {
    level = 'Medium';
    explanation = 'Moderate Risk: Intermittent showers or mountain mist. Keep normal safety speeds.';
  }

  if (advisories.length === 0) {
    advisories.push('Clear corridor transit with optimal visibility.');
  }

  return {
    level,
    score: totalScore,
    explanation,
    advisories,
    factors: {
      weatherScore,
      terrainScore,
      hazardScore,
    },
  };
}
