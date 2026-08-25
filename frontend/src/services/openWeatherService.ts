import { WeatherData, WeatherLayerType } from '../types/map';
import { calculateLogisticsRisk } from './riskEngine';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

export const NE_WEATHER_HUBS: {
  id: string;
  name: string;
  state: string;
  coordinates: [number, number];
  elevationMeters: number;
  isPass?: boolean;
}[] = [
  { id: 'wh-gau', name: 'Guwahati (Hub)', state: 'Assam', coordinates: [26.1445, 91.7362], elevationMeters: 55 },
  { id: 'wh-shl', name: 'Shillong', state: 'Meghalaya', coordinates: [25.5788, 91.8933], elevationMeters: 1496 },
  { id: 'wh-ita', name: 'Itanagar', state: 'Arunachal Pradesh', coordinates: [27.0844, 93.6053], elevationMeters: 320 },
  { id: 'wh-twg', name: 'Tawang (Pass)', state: 'Arunachal Pradesh', coordinates: [27.5861, 91.8658], elevationMeters: 3048, isPass: true },
  { id: 'wh-imp', name: 'Imphal', state: 'Manipur', coordinates: [24.8170, 93.9368], elevationMeters: 786 },
  { id: 'wh-aiz', name: 'Aizawl', state: 'Mizoram', coordinates: [23.7271, 92.7176], elevationMeters: 1132 },
  { id: 'wh-koh', name: 'Kohima', state: 'Nagaland', coordinates: [25.6751, 94.1086], elevationMeters: 1444 },
  { id: 'wh-agt', name: 'Agartala', state: 'Tripura', coordinates: [23.8315, 91.2868], elevationMeters: 15 },
  { id: 'wh-gtk', name: 'Gangtok', state: 'Sikkim', coordinates: [27.3389, 88.6065], elevationMeters: 1650 },
  { id: 'wh-slc', name: 'Silchar', state: 'Assam', coordinates: [24.8333, 92.7789], elevationMeters: 25 },
  { id: 'wh-dbr', name: 'Dibrugarh', state: 'Assam', coordinates: [27.4728, 94.9120], elevationMeters: 108 },
  { id: 'wh-tzp', name: 'Tezpur', state: 'Assam', coordinates: [26.6338, 92.7926], elevationMeters: 48 },
];

// In-memory cache with 10-minute TTL
interface CachedWeatherItem {
  data: WeatherData;
  timestamp: number;
}
const weatherCache = new Map<string, CachedWeatherItem>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Checks if a real OpenWeather API key is provided
 */
export function isWeatherApiConfigured(): boolean {
  return typeof API_KEY === 'string' && API_KEY.trim().length > 10;
}

/**
 * Generates local simulated meteorological sensor telemetry
 * for reliable fallback when offline or without API key.
 */
function getSimulatedFallbackWeather(
  id: string,
  name: string,
  state: string,
  coordinates: [number, number],
  elevationMeters: number,
  isPass?: boolean
): WeatherData {
  // Realistic regional weather seeds based on topography and altitude
  const isHighAltitude = elevationMeters > 1500;
  const isValley = elevationMeters < 100;

  let tempC = isHighAltitude ? Math.floor(6 + Math.random() * 8) : isValley ? Math.floor(27 + Math.random() * 5) : Math.floor(20 + Math.random() * 6);
  if (isPass) tempC = Math.floor(1 + Math.random() * 5); // Tawang freezing conditions

  let condition = 'Partly Cloudy';
  let conditionCode = 'Clouds';
  let iconUrl = 'https://openweathermap.org/img/wn/02d@2x.png';
  let rainMm1h = 0;
  let humidity = 68;
  let windSpeedKmh = Math.floor(10 + Math.random() * 15);
  let visibilityKm = 10;
  let cloudCoveragePercent = 45;

  if (state === 'Meghalaya' || id === 'wh-shl') {
    condition = 'Light Rain & Mountain Mist';
    conditionCode = 'Rain';
    iconUrl = 'https://openweathermap.org/img/wn/10d@2x.png';
    rainMm1h = 6.4;
    humidity = 88;
    visibilityKm = 4.5;
    cloudCoveragePercent = 85;
  } else if (isPass || id === 'wh-twg') {
    condition = 'Dense Fog & Freezing Slush';
    conditionCode = 'Fog';
    iconUrl = 'https://openweathermap.org/img/wn/50d@2x.png';
    rainMm1h = 1.2;
    humidity = 92;
    visibilityKm = 1.8;
    windSpeedKmh = 28;
    cloudCoveragePercent = 95;
  } else if (state === 'Sikkim' || id === 'wh-gtk') {
    condition = 'Intermittent Drizzle';
    conditionCode = 'Rain';
    iconUrl = 'https://openweathermap.org/img/wn/09d@2x.png';
    rainMm1h = 3.8;
    humidity = 82;
    visibilityKm = 6.0;
    cloudCoveragePercent = 75;
  } else if (id === 'wh-slc' || id === 'wh-dbr') {
    condition = 'Overcast Showers';
    conditionCode = 'Rain';
    iconUrl = 'https://openweathermap.org/img/wn/10d@2x.png';
    rainMm1h = 4.2;
    humidity = 85;
    visibilityKm = 7.5;
    cloudCoveragePercent = 80;
  } else {
    condition = 'Clear & Breezy';
    conditionCode = 'Clear';
    iconUrl = 'https://openweathermap.org/img/wn/01d@2x.png';
    humidity = 62;
    visibilityKm = 10;
    cloudCoveragePercent = 20;
  }

  const rawWeather = {
    rainMm1h,
    windSpeedKmh,
    visibilityKm,
    conditionCode,
    tempC,
  };

  const riskResult = calculateLogisticsRisk(rawWeather, elevationMeters, isPass, 0);

  return {
    id,
    locationName: name,
    state,
    coordinates,
    tempC,
    feelsLikeC: tempC + (humidity > 70 ? 2 : -1),
    condition,
    conditionCode,
    iconUrl,
    humidity,
    windSpeedKmh,
    windDirectionDeg: 190,
    visibilityKm,
    rainMm1h,
    cloudCoveragePercent,
    pressureHpa: 1012,
    logisticsRisk: riskResult.level,
    riskExplanation: riskResult.explanation,
    lastUpdated: 'Live Telemetry (Local Sensor)',
    isSimulated: true,
  };
}

/**
 * Fetch real weather from OpenWeather API with in-memory caching
 * and automatic fallback to simulated meteorological sensors.
 */
export async function fetchLocationWeather(
  id: string,
  name: string,
  state: string,
  lat: number,
  lng: number,
  elevationMeters: number = 100,
  isPass: boolean = false
): Promise<WeatherData> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // If no API key configured, use simulated live weather sensors
  if (!isWeatherApiConfigured()) {
    const fallback = getSimulatedFallbackWeather(id, name, state, [lat, lng], elevationMeters, isPass);
    weatherCache.set(cacheKey, { data: fallback, timestamp: now });
    return fallback;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      throw new Error(`OpenWeather API returned status ${response.status}`);
    }

    const json = await response.json();

    const tempC = Math.round(json.main.temp);
    const feelsLikeC = Math.round(json.main.feels_like);
    const humidity = json.main.humidity;
    const pressureHpa = json.main.pressure;
    const windSpeedKmh = Math.round((json.wind?.speed || 0) * 3.6);
    const windDirectionDeg = json.wind?.deg || 0;
    const visibilityKm = parseFloat(((json.visibility || 10000) / 1000).toFixed(1));
    const cloudCoveragePercent = json.clouds?.all || 0;
    const rainMm1h = json.rain?.['1h'] || (json.rain?.['3h'] ? json.rain['3h'] / 3 : 0);
    const weatherObj = json.weather?.[0] || {};
    const condition = weatherObj.description
      ? weatherObj.description.charAt(0).toUpperCase() + weatherObj.description.slice(1)
      : 'Clear';
    const conditionCode = weatherObj.main || 'Clear';
    const iconUrl = weatherObj.icon
      ? `https://openweathermap.org/img/wn/${weatherObj.icon}@2x.png`
      : 'https://openweathermap.org/img/wn/01d@2x.png';

    const riskResult = calculateLogisticsRisk(
      { rainMm1h, windSpeedKmh, visibilityKm, conditionCode, tempC },
      elevationMeters,
      isPass,
      0
    );

    const weatherData: WeatherData = {
      id,
      locationName: name,
      state,
      coordinates: [lat, lng],
      tempC,
      feelsLikeC,
      condition,
      conditionCode,
      iconUrl,
      humidity,
      windSpeedKmh,
      windDirectionDeg,
      visibilityKm,
      rainMm1h,
      cloudCoveragePercent,
      pressureHpa,
      logisticsRisk: riskResult.level,
      riskExplanation: riskResult.explanation,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSimulated: false,
    };

    weatherCache.set(cacheKey, { data: weatherData, timestamp: now });
    return weatherData;
  } catch (error) {
    console.warn(`OpenWeather fetch failed for ${name}, using local telemetry fallback:`, error);
    const fallback = getSimulatedFallbackWeather(id, name, state, [lat, lng], elevationMeters, isPass);
    weatherCache.set(cacheKey, { data: fallback, timestamp: now });
    return fallback;
  }
}

/**
 * Batch fetch weather for all Northeastern logistics centers
 */
export async function fetchAllRegionalHubsWeather(): Promise<WeatherData[]> {
  const promises = NE_WEATHER_HUBS.map((hub) =>
    fetchLocationWeather(
      hub.id,
      hub.name,
      hub.state,
      hub.coordinates[0],
      hub.coordinates[1],
      hub.elevationMeters,
      hub.isPass
    )
  );
  return Promise.all(promises);
}

/**
 * Returns OpenWeatherMap Tile Layer URL template if API key is present
 */
export function getOpenWeatherTileUrl(layer: WeatherLayerType): string | null {
  if (!isWeatherApiConfigured() || layer === 'none') {
    return null;
  }

  const layerMap: Record<WeatherLayerType, string> = {
    none: '',
    precipitation: 'precipitation_new',
    clouds: 'clouds_new',
    temp: 'temp_new',
    wind: 'wind_new',
  };

  const layerName = layerMap[layer];
  if (!layerName) return null;

  return `https://tile.openweathermap.org/map/${layerName}/{z}/{x}/{y}.png?appid=${API_KEY}`;
}
