import React, { useMemo } from 'react';
import { TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { WeatherData, WeatherLayerType } from '../../types/map';
import { getOpenWeatherTileUrl } from '../../services/openWeatherService';
import { Badge } from '../common/Badge';
import {
  CloudRain,
  Wind,
  Droplets,
  Eye,
  ShieldAlert,
  Radio,
} from 'lucide-react';

interface WeatherOverlayProps {
  weatherList: WeatherData[];
  activeWeatherLayer: WeatherLayerType;
  showWeatherBadges?: boolean;
  onSelectWeatherHub?: (weather: WeatherData) => void;
}

export const WeatherOverlay: React.FC<WeatherOverlayProps> = ({
  weatherList,
  activeWeatherLayer,
  showWeatherBadges = true,
  onSelectWeatherHub,
}) => {
  const tileUrl = useMemo(() => {
    return getOpenWeatherTileUrl(activeWeatherLayer);
  }, [activeWeatherLayer]);

  return (
    <>
      {/* 1. OpenWeather Tile Layer if API Key is Present */}
      {tileUrl && (
        <TileLayer
          url={tileUrl}
          opacity={0.65}
          zIndex={10}
          attribution='&copy; <a href="https://openweathermap.org/">OpenWeather</a>'
        />
      )}

      {/* 2. Interactive Regional Weather Station Markers */}
      {showWeatherBadges &&
        weatherList.map((w) => {
          const riskColor =
            w.logisticsRisk === 'Critical'
              ? '#e11d48'
              : w.logisticsRisk === 'High'
              ? '#ea580c'
              : w.logisticsRisk === 'Medium'
              ? '#d97706'
              : '#059669';

          const html = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="
                display: flex;
                align-items: center;
                gap: 4px;
                background: rgba(15, 23, 42, 0.92);
                color: #ffffff;
                padding: 3px 6px;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.25);
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                backdrop-filter: blur(4px);
                font-family: ui-sans-serif, system-ui, sans-serif;
                white-space: nowrap;
                transition: transform 0.2s;
              ">
                <img src="${w.iconUrl}" alt="${w.condition}" style="width: 18px; height: 18px; object-fit: contain;" />
                <span style="font-size: 11px; font-weight: 800; color: #f8fafc;">${w.tempC}°C</span>
                <span style="width: 6px; height: 6px; border-radius: 50%; background: ${riskColor}; display: inline-block;"></span>
              </div>
              <div style="
                position: absolute;
                bottom: -11px;
                font-size: 8px;
                font-weight: 700;
                color: #94a3b8;
                background: rgba(15, 23, 42, 0.85);
                padding: 0 4px;
                border-radius: 3px;
                pointer-events: none;
              ">
                ${w.locationName.split(' ')[0]}
              </div>
            </div>
          `;

          const icon = L.divIcon({
            html,
            className: 'nesetu-custom-weather-badge',
            iconSize: [70, 24],
            iconAnchor: [35, 12],
            popupAnchor: [0, -14],
          });

          const badgeVariant =
            w.logisticsRisk === 'Critical'
              ? 'danger'
              : w.logisticsRisk === 'High'
              ? 'warning'
              : w.logisticsRisk === 'Medium'
              ? 'warning'
              : 'success';

          return (
            <Marker
              key={w.id}
              position={w.coordinates}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onSelectWeatherHub) onSelectWeatherHub(w);
                },
              }}
            >
              <Popup className="nesetu-leaflet-popup" minWidth={270} maxWidth={320}>
                <div className="p-1 space-y-3 font-sans text-slate-800">
                  {/* Weather Station Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{w.state}</span>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{w.locationName}</h4>
                    </div>
                    <Badge variant={badgeVariant} size="xs">
                      {w.logisticsRisk} Risk
                    </Badge>
                  </div>

                  {/* Temperature & Condition Highlight */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-sky-50 to-blue-50/60 p-2.5 rounded-xl border border-sky-100">
                    <div className="flex items-center gap-2">
                      <img src={w.iconUrl} alt={w.condition} className="w-10 h-10 object-contain drop-shadow-sm" />
                      <div>
                        <div className="text-2xl font-black text-slate-900 leading-none">
                          {w.tempC}°<span className="text-sm font-semibold text-slate-500">C</span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600 mt-0.5">{w.condition}</p>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 font-medium">
                      <span>Feels: <strong>{w.feelsLikeC}°C</strong></span>
                      <div className="text-[10px] text-slate-400">{w.cloudCoveragePercent}% Clouds</div>
                    </div>
                  </div>

                  {/* Meteorological Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <CloudRain className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Rain: <strong>{w.rainMm1h} mm/h</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Wind className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Wind: <strong>{w.windSpeedKmh} km/h</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Humidity: <strong>{w.humidity}%</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Eye className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Vis: <strong>{w.visibilityKm} km</strong></span>
                    </div>
                  </div>

                  {/* Logistics Impact & Rule-Based Advice */}
                  <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-200/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-800 text-[11px] font-bold">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Logistics Assessment</span>
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium leading-tight">{w.riskExplanation}</p>
                  </div>

                  {/* Footer Source Status */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Radio className="w-3 h-3 text-emerald-500" />
                      {w.isSimulated ? 'Local Sensor Telemetry' : 'OpenWeather Live API'}
                    </span>
                    <span>{w.lastUpdated}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
    </>
  );
};
