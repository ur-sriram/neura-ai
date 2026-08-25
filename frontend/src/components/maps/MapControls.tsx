import React from 'react';
import { useMap } from 'react-leaflet';
import {
  Truck,
  AlertTriangle,
  Route,
  CloudRain,
  Anchor,
  Train,
  ZoomIn,
  ZoomOut,
  Navigation,
  Play,
  Pause,
  Layers,
  Maximize2,
  Minimize2,
  Info,
} from 'lucide-react';
import { MapFilterOptions, WeatherLayerType } from '../../types/map';

interface MapControlsProps {
  filters: MapFilterOptions;
  onToggleFilter: (key: keyof MapFilterOptions) => void;
  activeWeatherLayer: WeatherLayerType;
  onChangeWeatherLayer: (layer: WeatherLayerType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  simulationSpeed: number;
  onChangeSimulationSpeed: (speed: number) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  vehicleCount: number;
  hazardCount: number;
  showLegend?: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  filters,
  onToggleFilter,
  activeWeatherLayer,
  onChangeWeatherLayer,
  isSimulating,
  onToggleSimulation,
  simulationSpeed,
  onChangeSimulationSpeed,
  isFullScreen,
  onToggleFullScreen,
  vehicleCount,
  hazardCount,
  showLegend = true,
}) => {
  const map = useMap();

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    map.zoomIn();
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    map.zoomOut();
  };

  const handleRecenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Centered over Northeast India encompassing all 8 states
    map.setView([26.2006, 92.9376], 7, { animate: true });
  };

  return (
    <>
      {/* 1. Top Layer Filter Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Quick Status Tag */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-white text-xs font-semibold shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
          <span className="font-bold">NE-Setu Dynamic GIS</span>
          <span className="text-[10px] font-mono bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded">
            OSM Live
          </span>
        </div>

        {/* Right: Layer Toggles */}
        <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap justify-end bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg text-xs">
          {/* Vehicles Toggle */}
          <button
            onClick={() => onToggleFilter('showVehicles')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              filters.showVehicles
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Fleet ({vehicleCount})</span>
          </button>

          {/* Hazards Toggle */}
          <button
            onClick={() => onToggleFilter('showIncidents')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              filters.showIncidents
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Hazards ({hazardCount})</span>
          </button>

          {/* Corridors Toggle */}
          <button
            onClick={() => onToggleFilter('showRoutes')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              filters.showRoutes
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Corridors</span>
          </button>

          {/* Weather Stations Toggle */}
          <button
            onClick={() => onToggleFilter('showWeather')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              filters.showWeather
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>Weather</span>
          </button>

          {/* Riverway Toggle */}
          <button
            onClick={() => onToggleFilter('showRiverways')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all hidden sm:flex items-center gap-1.5 ${
              filters.showRiverways
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Anchor className="w-3.5 h-3.5" />
            <span>NW-2 River</span>
          </button>

          {/* Railways Toggle */}
          <button
            onClick={() => onToggleFilter('showRailways')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all hidden sm:flex items-center gap-1.5 ${
              filters.showRailways
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Train className="w-3.5 h-3.5" />
            <span>Rail</span>
          </button>
        </div>
      </div>

      {/* 2. Floating Secondary Controls (Weather Layer & GPS Stream control) */}
      <div className="absolute top-16 right-3 z-[1000] flex flex-col items-end gap-2 pointer-events-auto">
        {/* Weather Layer Selector Dropdown */}
        <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg flex items-center gap-1 text-[11px]">
          <span className="text-slate-400 pl-2 flex items-center gap-1">
            <Layers className="w-3 h-3 text-sky-400" /> Layer:
          </span>
          <select
            value={activeWeatherLayer}
            onChange={(e) => onChangeWeatherLayer(e.target.value as WeatherLayerType)}
            className="bg-slate-800 text-slate-100 font-semibold rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 text-xs"
          >
            <option value="none">Standard OSM</option>
            <option value="precipitation">Precipitation Radar</option>
            <option value="clouds">Cloud Cover</option>
            <option value="temp">Temperature Heatmap</option>
            <option value="wind">Wind Stream</option>
          </select>
        </div>

        {/* GPS Telemetry Simulation Controls */}
        <div className="bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700/80 shadow-lg flex items-center gap-2 text-[11px] text-slate-200">
          <button
            onClick={onToggleSimulation}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold transition-colors ${
              isSimulating ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
            title={isSimulating ? 'Pause GPS Stream' : 'Resume GPS Stream'}
          >
            {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isSimulating ? 'Live GPS' : 'Paused'}</span>
          </button>

          {/* Speed toggles */}
          <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => onChangeSimulationSpeed(spd)}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                  simulationSpeed === spd ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Floating Navigation & Zoom Tools (Bottom Right) */}
      <div className="absolute bottom-4 right-3 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex flex-col bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 overflow-hidden shadow-lg">
          <button
            onClick={handleZoomIn}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800" />
          <button
            onClick={handleZoomOut}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800" />
          <button
            onClick={handleRecenter}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Recenter Northeast India"
          >
            <Navigation className="w-4 h-4" />
          </button>
          {onToggleFullScreen && (
            <>
              <div className="h-px bg-slate-800" />
              <button
                onClick={onToggleFullScreen}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Map'}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. Bottom Left Floating Legend */}
      {showLegend && (
        <div className="absolute bottom-4 left-3 z-[1000] hidden md:flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] text-slate-300 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-1.5 font-bold text-slate-400 pr-1 border-r border-slate-700/80">
            <Info className="w-3.5 h-3.5 text-brand-400" />
            <span>Legend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50" />
            <span>Active Fleet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm shadow-amber-500/50" />
            <span>Delayed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm shadow-rose-500/50" />
            <span>Hazard Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-cyan-400 rounded inline-block" />
            <span>NW-2 Riverway</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-purple-400 rounded inline-block" />
            <span>Railway</span>
          </div>
        </div>
      )}
    </>
  );
};
