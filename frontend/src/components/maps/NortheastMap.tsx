import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../../context/AppContext';
import { Vehicle, Incident } from '../../types';
import { MapFilterOptions, WeatherData, WeatherLayerType } from '../../types/map';
import { VehicleMarker } from './VehicleMarker';
import { IncidentMarker } from './IncidentMarker';
import { RouteLayer } from './RouteLayer';
import { WeatherOverlay } from './WeatherOverlay';
import { MapControls } from './MapControls';
import { fetchAllRegionalHubsWeather } from '../../services/openWeatherService';
import { gpsSimulationService } from '../../services/gpsSimulationService';

interface NortheastMapProps {
  height?: string;
  isFullScreen?: boolean;
  showControls?: boolean;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onSelectIncident?: (incident: Incident) => void;
  stateFilter?: string;
  statusFilter?: string;
}

export const NortheastMap: React.FC<NortheastMapProps> = ({
  height = '500px',
  isFullScreen = false,
  showControls = true,
  onSelectVehicle,
  onSelectIncident,
  stateFilter = 'All',
  statusFilter = 'All',
}) => {
  const {
    vehicles,
    incidents,
    routes,
    setSelectedVehicle,
    setSelectedIncident,
    resolveIncident,
  } = useApp();

  // Internal Fullscreen state toggle
  const [internalFullScreen, setInternalFullScreen] = useState(isFullScreen);

  // Layer filters
  const [filters, setFilters] = useState<MapFilterOptions>({
    showVehicles: true,
    showRoutes: true,
    showIncidents: true,
    showWeather: true,
    showRiverways: true,
    showRailways: true,
    showHubs: true,
    vehicleStatus: 'All',
    incidentSeverity: 'All',
    incidentType: 'All',
    stateRegion: 'All',
  });

  const [activeWeatherLayer, setActiveWeatherLayer] = useState<WeatherLayerType>('none');
  const [weatherList, setWeatherList] = useState<WeatherData[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);

  // Fetch real/telemetric weather on mount and set up periodic refresh (every 5 mins)
  useEffect(() => {
    let isMounted = true;

    const loadWeather = async () => {
      try {
        const data = await fetchAllRegionalHubsWeather();
        if (isMounted) {
          setWeatherList(data);
        }
      } catch (err) {
        console.error('Error fetching regional weather:', err);
      }
    };

    loadWeather();
    const weatherInterval = setInterval(loadWeather, 5 * 60 * 1000); // 5 mins

    return () => {
      isMounted = false;
      clearInterval(weatherInterval);
    };
  }, []);

  const handleToggleFilter = useCallback((key: keyof MapFilterOptions) => {
    setFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleToggleSimulation = useCallback(() => {
    if (isSimulating) {
      gpsSimulationService.pause();
      setIsSimulating(false);
    } else {
      gpsSimulationService.start(() => vehicles);
      setIsSimulating(true);
    }
  }, [isSimulating, vehicles]);

  const handleChangeSimulationSpeed = useCallback((speed: number) => {
    setSimulationSpeed(speed);
    gpsSimulationService.setSpeedMultiplier(speed, () => vehicles);
  }, [vehicles]);

  const handleSelectVehicle = useCallback((v: Vehicle) => {
    setSelectedVehicle(v);
    if (onSelectVehicle) onSelectVehicle(v);
  }, [setSelectedVehicle, onSelectVehicle]);

  const handleSelectIncident = useCallback((inc: Incident) => {
    setSelectedIncident(inc);
    if (onSelectIncident) onSelectIncident(inc);
  }, [setSelectedIncident, onSelectIncident]);

  // Filtered vehicles based on props and layer toggles
  const displayVehicles = useMemo(() => {
    if (!filters.showVehicles) return [];
    return vehicles.filter((v) => {
      const matchState = stateFilter === 'All' || v.state === stateFilter;
      const matchStatus = statusFilter === 'All' || v.status === statusFilter;
      return matchState && matchStatus;
    });
  }, [vehicles, filters.showVehicles, stateFilter, statusFilter]);

  // Active hazard incidents
  const displayIncidents = useMemo(() => {
    if (!filters.showIncidents) return [];
    return incidents.filter((i) => {
      const matchState = stateFilter === 'All' || i.state === stateFilter;
      return matchState;
    });
  }, [incidents, filters.showIncidents, stateFilter]);

  const activeHazardsCount = useMemo(() => {
    return incidents.filter((i) => i.status !== 'Resolved').length;
  }, [incidents]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl select-none transition-all duration-300 ${
        internalFullScreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : ''
      }`}
      style={!internalFullScreen ? { height } : undefined}
    >
      <MapContainer
        center={[26.2006, 92.9376]} // Center of Northeast India
        zoom={7}
        minZoom={6}
        maxZoom={18}
        maxBounds={[
          [20.0, 86.0],
          [30.5, 98.5],
        ]}
        maxBoundsViscosity={0.8}
        zoomControl={false} // Using custom sleek floating controls
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ background: '#0f172a' }}
      >
        {/* OpenStreetMap Base Tile Layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* Dynamic Route Layer */}
        {filters.showRoutes && (
          <RouteLayer
            routes={routes}
            showRiverways={filters.showRiverways}
            showRailways={filters.showRailways}
          />
        )}

        {/* Dynamic Weather Overlay & Tile Layer */}
        <WeatherOverlay
          weatherList={weatherList}
          activeWeatherLayer={activeWeatherLayer}
          showWeatherBadges={filters.showWeather}
        />

        {/* Dynamic Incident & Hazard Markers */}
        {displayIncidents.map((inc) => (
          <IncidentMarker
            key={inc.id}
            incident={inc}
            onSelect={handleSelectIncident}
            onResolve={resolveIncident}
          />
        ))}

        {/* Dynamic Vehicle Markers with Real-time GPS Telemetry */}
        {displayVehicles.map((v) => (
          <VehicleMarker
            key={v.id}
            vehicle={v}
            onSelect={handleSelectVehicle}
          />
        ))}

        {/* Sleek Floating Map Controls & Overlays */}
        {showControls && (
          <MapControls
            filters={filters}
            onToggleFilter={handleToggleFilter}
            activeWeatherLayer={activeWeatherLayer}
            onChangeWeatherLayer={setActiveWeatherLayer}
            isSimulating={isSimulating}
            onToggleSimulation={handleToggleSimulation}
            simulationSpeed={simulationSpeed}
            onChangeSimulationSpeed={handleChangeSimulationSpeed}
            isFullScreen={internalFullScreen}
            onToggleFullScreen={() => setInternalFullScreen((prev) => !prev)}
            vehicleCount={displayVehicles.length}
            hazardCount={activeHazardsCount}
          />
        )}
      </MapContainer>
    </div>
  );
};
