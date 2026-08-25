import { useEffect, useRef, useState } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Compass, 
  Droplets, 
  ExternalLink, 
  Eye, 
  Flame, 
  Layers, 
  Mountain, 
  Newspaper, 
  Radio, 
  RefreshCw, 
  ShieldAlert, 
  TrendingUp, 
  Waves, 
  Wind 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type TerrainHazardType = "flood" | "landslide" | "closure" | "waterlogging" | "normal";

export interface AssamTerrainZone {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  elevationMeters: number;
  hazardType: TerrainHazardType;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "NORMAL";
  headline: string;
  newsSource: string;
  reportedTime: string;
  waterLevel: string; // e.g. "+1.15m above danger"
  rainfall24h: number; // in mm
  accessibilityScore: number; // 0 to 100
  vehicleAdvice: string;
  recommendedCorridor: string;
  riverBasin: "Brahmaputra" | "Barak" | "Dhansiri" | "Kopili" | "Manas";
}

export const INITIAL_ASSAM_TERRAIN_ZONES: AssamTerrainZone[] = [
  {
    id: "dima-hasao",
    name: "Haflong / Jatinga Ridge",
    district: "Dima Hasao",
    lat: 25.1648,
    lng: 93.0176,
    elevationMeters: 680,
    hazardType: "landslide",
    severity: "CRITICAL",
    headline: "Hill-cutting trigger: Fresh mudslips on NH-27 near Jatinga; heavy trucks restricted",
    newsSource: "ASDMA Bulletins & Regional News AI",
    reportedTime: "8 mins ago",
    waterLevel: "Runoff velocity High",
    rainfall24h: 168,
    accessibilityScore: 42,
    vehicleAdvice: "Light 4x4 / emergency convoy only",
    recommendedCorridor: "Bypass via Lumding feeder line",
    riverBasin: "Barak",
  },
  {
    id: "dibrugarh",
    name: "Dibrugarh Town Protection Embankment",
    district: "Dibrugarh",
    lat: 27.4728,
    lng: 94.9120,
    elevationMeters: 108,
    hazardType: "flood",
    severity: "HIGH",
    headline: "Brahmaputra flowing 0.78m above danger mark at Maijan; seepage vigil active",
    newsSource: "Central Water Commission (CWC) Recon",
    reportedTime: "14 mins ago",
    waterLevel: "+0.78m (Rising)",
    rainfall24h: 92,
    accessibilityScore: 68,
    vehicleAdvice: "Heavy trucks allowed on elevated ring road",
    recommendedCorridor: "NH-15 elevated bypass",
    riverBasin: "Brahmaputra",
  },
  {
    id: "silchar",
    name: "Silchar Urban & Sadarghat Basin",
    district: "Cachar",
    lat: 24.8333,
    lng: 92.7789,
    elevationMeters: 25,
    hazardType: "flood",
    severity: "CRITICAL",
    headline: "Barak River surges near Annapurna Ghat; sluice gates monitored under red alert",
    newsSource: "District Emergency Operations Center (DEOC)",
    reportedTime: "22 mins ago",
    waterLevel: "+1.32m (Danger Level Exceeded)",
    rainfall24h: 144,
    accessibilityScore: 54,
    vehicleAdvice: "Relief fleet convoy with escort",
    recommendedCorridor: "Guwahati-Silchar emergency corridor via Lumding",
    riverBasin: "Barak",
  },
  {
    id: "majuli",
    name: "Garamur / Kamalabari Ghat",
    district: "Majuli",
    lat: 26.9460,
    lng: 94.1726,
    elevationMeters: 84,
    hazardType: "closure",
    severity: "HIGH",
    headline: "Inland water transit suspended across Nimati Ghat due to high velocity driftwood",
    newsSource: "Assam Inland Water Transport (IWT)",
    reportedTime: "35 mins ago",
    waterLevel: "+0.92m (High Current)",
    rainfall24h: 88,
    accessibilityScore: 35,
    vehicleAdvice: "Amphibious / Helo logistics priority",
    recommendedCorridor: "North Lakhimpur connecting bridge corridor",
    riverBasin: "Brahmaputra",
  },
  {
    id: "rangia",
    name: "Rangia / Borolia River Crossings",
    district: "Kamrup",
    lat: 26.4707,
    lng: 91.0306,
    elevationMeters: 55,
    hazardType: "waterlogging",
    severity: "MODERATE",
    headline: "SH-5 low culvert submerged under 25cm backwater; single-lane shuttle active",
    newsSource: "State PWD Highway Telemetry",
    reportedTime: "48 mins ago",
    waterLevel: "0.25m road spillover",
    rainfall24h: 62,
    accessibilityScore: 78,
    vehicleAdvice: "All vehicles under caution speed 30km/h",
    recommendedCorridor: "NH-27 primary four-lane spine",
    riverBasin: "Manas",
  },
  {
    id: "tezpur",
    name: "Kalia Bhomora Bridge Reach",
    district: "Sonitpur",
    lat: 26.6528,
    lng: 92.7926,
    elevationMeters: 62,
    hazardType: "normal",
    severity: "LOW",
    headline: "Brahmaputra cross-river span clear; river traffic monitored under green status",
    newsSource: "NHAI Northeast Control Hub",
    reportedTime: "1 hour ago",
    waterLevel: "0.45m below danger",
    rainfall24h: 38,
    accessibilityScore: 94,
    vehicleAdvice: "Full commercial & heavy fleet clearance",
    recommendedCorridor: "NH-715A / NH-15 trunk corridor",
    riverBasin: "Brahmaputra",
  },
  {
    id: "guwahati",
    name: "Guwahati Metropolitan Logistics Hub",
    district: "Kamrup Metropolitan",
    lat: 26.1445,
    lng: 91.7362,
    elevationMeters: 52,
    hazardType: "normal",
    severity: "NORMAL",
    headline: "Central dispatch hub operating normally; automated route clearance running",
    newsSource: "NEURA AI Signal Command",
    reportedTime: "Just now",
    waterLevel: "Basin Normal (1.2m below warning)",
    rainfall24h: 24,
    accessibilityScore: 98,
    vehicleAdvice: "Full fleet readiness (15/15 units)",
    recommendedCorridor: "All trunk lines active",
    riverBasin: "Brahmaputra",
  },
];

export function TerrainIntelligenceMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);

  const [zones, setZones] = useState<AssamTerrainZone[]>(INITIAL_ASSAM_TERRAIN_ZONES);
  const [selectedZone, setSelectedZone] = useState<AssamTerrainZone>(INITIAL_ASSAM_TERRAIN_ZONES[0]);
  const [activeLayer, setActiveLayer] = useState<"topo" | "satellite" | "dark" | "osm">("topo");
  const [filterHazard, setFilterHazard] = useState<string>("ALL");
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>("Just now");
  const [newsTickerIndex, setNewsTickerIndex] = useState<number>(0);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || (mapInstanceRef.current && (window as any).L)) return;

    const initMap = async () => {
      // Ensure Leaflet is loaded
      if (!(window as any).L) {
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }
        await new Promise((resolve) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          s.onload = resolve;
          document.head.appendChild(s);
        });
      }

      const L = (window as any).L;
      if (!L || mapInstanceRef.current) return;

      const map = L.map(mapContainer.current, {
        center: [26.3, 92.9],
        zoom: 7,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      // Base tile layers
      const tileLayers: Record<string, any> = {
        topo: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
          attribution: "Esri Topographic Relief · Assam Basin",
          maxZoom: 18,
        }),
        satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          attribution: "Esri World Imagery",
          maxZoom: 18,
        }),
        dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: "CartoDB Dark Matter",
          subdomains: "abcd",
          maxZoom: 19,
        }),
        osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "OpenStreetMap Contributors",
          maxZoom: 19,
        }),
      };

      tileLayers.topo.addTo(map);
      (map as any)._tileLayers = tileLayers;
      (map as any)._currentTileLayer = tileLayers.topo;

      // Load Assam Boundary GeoJSON
      fetch("https://raw.githubusercontent.com/shijithpk/2024_maps_supplement/main/assam_ls_new_borders.geojson")
        .then((res) => res.json())
        .then((data) => {
          L.geoJSON(data, {
            style: {
              color: "#b84b76",
              weight: 2,
              fillColor: "#b84b76",
              fillOpacity: 0.04,
              dashArray: "5, 5",
            },
          }).addTo(map);
        })
        .catch(() => {});

      renderZoneMarkers(zones, selectedZone.id);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer
  const switchLayer = (type: "topo" | "satellite" | "dark" | "osm") => {
    setActiveLayer(type);
    const map = mapInstanceRef.current;
    if (!map || !(map as any)._tileLayers) return;
    if ((map as any)._currentTileLayer) {
      map.removeLayer((map as any)._currentTileLayer);
    }
    const nextLayer = (map as any)._tileLayers[type];
    if (nextLayer) {
      nextLayer.addTo(map);
      (map as any)._currentTileLayer = nextLayer;
    }
  };

  // Render Zone Markers and Hazard Rings
  const renderZoneMarkers = (zoneList: AssamTerrainZone[], activeId: string) => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    circlesRef.current.forEach((c) => c.remove());
    markersRef.current = [];
    circlesRef.current = [];

    const getHazardColor = (hazard: TerrainHazardType, severity: string) => {
      if (severity === "CRITICAL") return "#e11d48"; // Vibrant Rose/Red
      if (severity === "HIGH") return "#f59e0b"; // Amber
      if (severity === "MODERATE") return "#d97706"; // Warm Amber
      if (hazard === "flood") return "#0284c7"; // Blue
      return "#10b981"; // Emerald Green
    };

    const getHazardIconHTML = (z: AssamTerrainZone, isSelected: boolean) => {
      const color = getHazardColor(z.hazardType, z.severity);
      const isPulse = z.severity === "CRITICAL" || z.severity === "HIGH";
      return `
        <div class="terrain-marker-wrapper ${isSelected ? 'selected' : ''}" style="position:relative; cursor:pointer;">
          ${isPulse ? `<div style="position:absolute; width:44px; height:44px; top:-12px; left:-12px; border-radius:50%; background:${color}33; animation:pulse 1.8s infinite ease-out;"></div>` : ''}
          <div style="width:${isSelected ? '32px' : '26px'}; height:${isSelected ? '32px' : '26px'}; border-radius:50%; background:${color}; border:2.5px solid #ffffff; box-shadow:0 3px 12px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:bold; font-size:11px; transition:all 0.2s;">
            ${z.hazardType === "flood" ? "🌊" : z.hazardType === "landslide" ? "⛰️" : z.hazardType === "closure" ? "⛔" : z.hazardType === "waterlogging" ? "🌧️" : "✓"}
          </div>
          <div style="position:absolute; top:28px; left:50%; transform:translateX(-50%); white-space:nowrap; background:#0f172a; color:#f8fafc; padding:2px 7px; border-radius:4px; font-size:10px; font-weight:700; border:1px solid ${color}; box-shadow:0 2px 6px rgba(0,0,0,0.5);">
            ${z.name.split(" ")[0]}
          </div>
        </div>
      `;
    };

    const filtered = filterHazard === "ALL" ? zoneList : zoneList.filter(z => z.hazardType === filterHazard);

    filtered.forEach((zone) => {
      const isSelected = zone.id === activeId;
      const customIcon = L.divIcon({
        className: "custom-terrain-div-icon",
        html: getHazardIconHTML(zone, isSelected),
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([zone.lat, zone.lng], { icon: customIcon }).addTo(map);
      marker.on("click", () => {
        setSelectedZone(zone);
        map.flyTo([zone.lat, zone.lng], 9, { duration: 1.2 });
      });

      // Hazard radius circle
      const color = getHazardColor(zone.hazardType, zone.severity);
      const circleRadius = zone.severity === "CRITICAL" ? 22000 : zone.severity === "HIGH" ? 16000 : 10000;
      const circle = L.circle([zone.lat, zone.lng], {
        radius: circleRadius,
        color: color,
        fillColor: color,
        fillOpacity: isSelected ? 0.22 : 0.1,
        weight: isSelected ? 2.5 : 1,
        dashArray: zone.hazardType === "landslide" ? "4, 4" : undefined,
      }).addTo(map);

      markersRef.current.push(marker);
      circlesRef.current.push(circle);
    });
  };

  // Re-render markers when selection, list, or filter changes
  useEffect(() => {
    renderZoneMarkers(zones, selectedZone.id);
  }, [zones, selectedZone.id, filterHazard]);

  // Dynamic Live Simulation Ticker (Simulates live news & sensor feeds)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setNewsTickerIndex((prev) => (prev + 1) % zones.length);
      setLastUpdated("Live - updated " + new Date().toLocaleTimeString());

      // Random micro-variations to simulate real-time hydro-telemetry
      setZones((prev) =>
        prev.map((z) => {
          if (z.id === "dibrugarh" || z.id === "silchar") {
            const jitter = (Math.random() * 2 - 1) * 0.02;
            const currentVal = parseFloat(z.waterLevel.replace(/[^0-9.]/g, "")) || 1.0;
            const newVal = Math.max(0.4, currentVal + jitter).toFixed(2);
            return {
              ...z,
              waterLevel: `+${newVal}m (Live Sensor Telemetry)`,
              rainfall24h: Math.round(z.rainfall24h + (Math.random() > 0.7 ? 1 : 0)),
            };
          }
          return z;
        })
      );
    }, 4500);

    return () => clearInterval(interval);
  }, [isSimulating, zones.length]);

  const triggerLiveRecon = () => {
    toast.info("Scanning Regional News & CWC Satellites...", {
      description: "Ingesting Assam Disaster Management telemetry for 34 districts.",
    });
    setTimeout(() => {
      setZones((prev) => [
        ...prev.map((z) => ({
          ...z,
          reportedTime: "Just now (Verified ASDMA Feed)",
        })),
      ]);
      setLastUpdated("Recon synced at " + new Date().toLocaleTimeString());
      toast.success("Terrain & News Recon Complete", {
        description: "Updated flood contours, landslide risk scores, and bridge clearances.",
      });
    }, 1000);
  };

  const activeNewsItem = zones[newsTickerIndex];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Dynamic News Ticker Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/70 to-slate-900 text-white rounded-lg p-3 border border-rose-900/50 shadow-md flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider text-rose-300">
            <Radio size={14} className="animate-pulse text-rose-400" />
            <span>LIVE ASSAM NEWS &amp; SATELLITE RECON</span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">|</span>
          <p className="text-xs text-slate-200 font-medium truncate max-w-[500px]">
            <b className="text-rose-300 mr-1.5">[{activeNewsItem.district}]</b>
            {activeNewsItem.headline}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono hidden md:inline">{lastUpdated}</span>
          <button
            onClick={triggerLiveRecon}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-rose-900/60 hover:bg-rose-800 text-rose-100 border border-rose-700/50 transition"
          >
            <RefreshCw size={12} className="animate-spin-slow" />
            Scan News
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Interactive Map Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header & Map Controls */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-mono">
                  TERRAIN &amp; FLOOD INTELLIGENCE
                </span>
                <span className="text-xs text-slate-500 font-medium">Assam Topography &amp; River Basins</span>
              </div>
              <h3 className="text-base font-bold text-slate-800 mt-0.5">
                Active Hazard Map · {selectedZone.name}
              </h3>
            </div>

            {/* Layer Switcher & Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 shadow-xs text-xs font-medium">
                <button
                  onClick={() => switchLayer("topo")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition flex items-center gap-1",
                    activeLayer === "topo" ? "bg-rose-900 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Mountain size={13} />
                  <span>Topo Relief</span>
                </button>
                <button
                  onClick={() => switchLayer("satellite")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition flex items-center gap-1",
                    activeLayer === "satellite" ? "bg-rose-900 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Eye size={13} />
                  <span>Satellite</span>
                </button>
                <button
                  onClick={() => switchLayer("dark")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition flex items-center gap-1",
                    activeLayer === "dark" ? "bg-rose-900 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Layers size={13} />
                  <span>Dark Ops</span>
                </button>
              </div>

              {/* Hazard Filter */}
              <select
                value={filterHazard}
                onChange={(e) => setFilterHazard(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="ALL">All Incidents</option>
                <option value="flood">🌊 Flood Inundation</option>
                <option value="landslide">⛰️ Landslides</option>
                <option value="closure">⛔ Road Closures</option>
                <option value="waterlogging">🌧️ Waterlogging</option>
              </select>
            </div>
          </div>

          {/* Map Viewport Container */}
          <div className="relative w-full h-[460px] bg-slate-100">
            <div ref={mapContainer} className="w-full h-full" />

            {/* In-Map Floating Legend */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md text-white p-2.5 rounded-lg border border-slate-700/80 shadow-lg text-[11px] flex flex-col gap-1.5 z-[1000] pointer-events-auto">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[9px]">Terrain Hazard Matrix</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Critical Risk (Flood &gt; Danger / Heavy Landslide)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Elevated Watch (Waterlogging / Debris)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Normal Transport Corridor</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Dynamic News Analysis & Terrain State Card */}
        <div className="flex flex-col gap-4">
          {/* Selected District News & Hydro Intelligence */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider text-rose-600 uppercase">
                  {selectedZone.riverBasin} River Basin · {selectedZone.district}
                </span>
                <h4 className="text-lg font-bold text-slate-900 leading-snug">
                  {selectedZone.name}
                </h4>
              </div>
              <span
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-bold tracking-wider font-mono",
                  selectedZone.severity === "CRITICAL"
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : selectedZone.severity === "HIGH"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                )}
              >
                {selectedZone.severity}
              </span>
            </div>

            {/* News Headline Box */}
            <div className="bg-rose-50/70 border border-rose-200/80 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 mb-1">
                <Newspaper size={14} className="text-rose-700" />
                <span>Verified News Intelligence ({selectedZone.reportedTime})</span>
              </div>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                "{selectedZone.headline}"
              </p>
              <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>Source: {selectedZone.newsSource}</span>
                <span className="text-rose-700 font-semibold">AI Confidence: 94.2%</span>
              </div>
            </div>

            {/* Key Telemetry Stats */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                  <Waves size={13} className="text-sky-600" />
                  <span>River / Water State</span>
                </div>
                <b className="text-xs text-slate-900">{selectedZone.waterLevel}</b>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                  <Droplets size={13} className="text-blue-600" />
                  <span>24h Rainfall</span>
                </div>
                <b className="text-xs text-slate-900">{selectedZone.rainfall24h} mm</b>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                  <Mountain size={13} className="text-amber-700" />
                  <span>Terrain Elevation</span>
                </div>
                <b className="text-xs text-slate-900">{selectedZone.elevationMeters}m MSL</b>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                  <TrendingUp size={13} className="text-emerald-700" />
                  <span>Access Score</span>
                </div>
                <b
                  className={cn(
                    "text-xs font-bold",
                    selectedZone.accessibilityScore > 75
                      ? "text-emerald-600"
                      : selectedZone.accessibilityScore > 50
                      ? "text-amber-600"
                      : "text-rose-600"
                  )}
                >
                  {selectedZone.accessibilityScore}% COVERAGE
                </b>
              </div>
            </div>

            {/* Logistics Advisory */}
            <div className="bg-slate-900 text-white rounded-lg p-3 text-xs flex flex-col gap-1 mt-1">
              <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider">
                Fleet Logistics Action
              </span>
              <p className="text-slate-200">{selectedZone.vehicleAdvice}</p>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 border-t border-slate-800 pt-1.5">
                <Compass size={12} className="text-rose-400" />
                <span className="truncate">Route: {selectedZone.recommendedCorridor}</span>
              </div>
            </div>
          </div>

          {/* Quick District Switcher List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono px-1">
              All Monitored Assam Districts ({zones.length})
            </span>
            <div className="flex flex-col gap-1.5 max-h-[170px] overflow-y-auto pr-1">
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => {
                    setSelectedZone(z);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([z.lat, z.lng], 9, { duration: 1.2 });
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-left transition border text-xs",
                    selectedZone.id === z.id
                      ? "bg-rose-50 border-rose-300 text-rose-950 font-bold shadow-xs"
                      : "bg-slate-50/50 border-slate-200/60 hover:bg-slate-100 text-slate-700 font-medium"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>
                      {z.hazardType === "flood" ? "🌊" : z.hazardType === "landslide" ? "⛰️" : z.hazardType === "closure" ? "⛔" : "✓"}
                    </span>
                    <span className="truncate">{z.district} ({z.name.split(" ")[0]})</span>
                  </div>
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0",
                      z.severity === "CRITICAL"
                        ? "bg-rose-100 text-rose-800"
                        : z.severity === "HIGH"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    )}
                  >
                    {z.severity}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
