import React, { useState, useEffect, useRef } from 'react';
import LNSMap from './components/Map';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RouteCandidate {
  segment_id: string; name: string; feasible: boolean;
  rejection?: string; status: string; distance_km: number;
  eta_min?: number; eta_p90_min?: number; eta_uncertainty_min?: number;
  risk_score: number; cost?: number; recommended?: boolean; surface?: string;
  bridge_limit_t?: number; landslide_risk_pct?: number;
  flood_risk_pct?: number; notes?: string; coordinates: number[][];
  confidence?: number;
  resilience_score?: number;
  resilience_inputs?: any;
  resilience_breakdown?: string;
  freshness?: string;
  tradeoff_explanation?: string;
}

interface RouteResult {
  origin: string; destination: string;
  vehicle: string; vehicle_emoji: string;
  cargo_tonnes: number; total_weight_tonnes: number;
  feasible_routes: RouteCandidate[];
  blocked_routes: RouteCandidate[];
  summary: string;
}

interface CommunityReport {
  id: string; timestamp: string; location_name: string;
  issue_type: string; severity: string; description: string; reporter_type: string;
}

interface Segment {
  name: string; status: string; coordinates: number[][];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const API = 'http://localhost:8000/api/v1';

const VEHICLE_OPTIONS = [
  { value: 'motorbike', label: '🏍️ Motorbike / Two-Wheeler' },
  { value: 'car', label: '🚗 Car / SUV' },
  { value: 'ambulance', label: '🚑 Ambulance (Emergency)' },
  { value: '4x4', label: '🚙 4x4 / Jeep' },
  { value: 'light_truck', label: '🚛 Light Truck (< 10T)' },
  { value: 'heavy_truck', label: '🚚 Heavy Truck / Bus (> 10T)' },
];

const ISSUE_TYPES = [
  { value: 'landslide', label: '⛰️ Landslide' },
  { value: 'flood', label: '🌊 Flood / Waterlogging' },
  { value: 'blocked', label: '🚧 Road Blocked' },
  { value: 'fallen_tree', label: '🌲 Fallen Tree' },
  { value: 'pothole', label: '🕳️ Severe Pothole' },
  { value: 'other', label: '⚠️ Other Hazard' },
];

const EMERGENCY_TYPES = [
  { value: 'medical', label: '🏥 Medical Emergency' },
  { value: 'rescue', label: '🆘 Search & Rescue' },
  { value: 'supply', label: '📦 Essential Supply (Village Cut-off)' },
  { value: 'other', label: '⚠️ Other Emergency' },
];

const SEGMENT_OPTIONS = [
  { value: 'NH-6-GS', label: 'NH-6 Guwahati–Shillong' },
  { value: 'R-114-UMROI', label: 'R-114 Umroi Alternate' },
  { value: 'NH-6-SJ', label: 'NH-6 Shillong–Jowai' },
  { value: 'BYRNIHAT-SHL', label: 'Byrnihat–Shillong Back Road' },
];

// ─── Style Helpers ────────────────────────────────────────────────────────────
const C = {
  bg: '#0a0a0f', surface: '#14141a', border: '#2a2a35',
  primary: '#3b82f6', accent: '#60a5fa',
  green: '#22c55e', amber: '#f59e0b', red: '#ef4444', purple: '#a78bfa',
  text: '#f3f4f6', muted: '#9ca3af', dim: '#6b7280',
};

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
  padding: 16, marginBottom: 12, ...extra,
});

const label = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  display: 'block', fontSize: 11, fontWeight: 700, color: C.muted,
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, ...extra,
});

const input = (): React.CSSProperties => ({
  width: '100%', background: '#0a0a0f', border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
});

const btn = (color = C.primary, filled = false): React.CSSProperties => ({
  padding: '8px 14px', borderRadius: 8, border: `1px solid ${color}50`,
  background: filled ? color : `${color}18`, color: filled ? '#fff' : color,
  fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
  whiteSpace: 'nowrap' as const,
});

const riskBadge = (risk: number): React.CSSProperties => ({
  padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
  background: risk > 0.6 ? `${C.red}20` : risk > 0.3 ? `${C.amber}20` : `${C.green}20`,
  color: risk > 0.6 ? C.red : risk > 0.3 ? C.amber : C.green,
});

const statusBadge = (s: string): React.CSSProperties => ({
  padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
  background: s === 'CLOSED' ? `${C.red}20` : s === 'SUSPECTED' ? `${C.amber}20` : `${C.green}20`,
  color: s === 'CLOSED' ? C.red : s === 'SUSPECTED' ? C.amber : C.green,
});

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<'map' | 'route' | 'report' | 'emergency' | 'alerts' | 'weather'>('route');
  const [connected, setConnected] = useState(false);
  const [lnsSegments, setLnsSegments] = useState<Record<string, Segment>>({});
  const [lnsVersion, setLnsVersion] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Route planner
  const [origin, setOrigin] = useState('Guwahati');
  const [destination, setDestination] = useState('Shillong');
  const [vehicle, setVehicle] = useState('car');
  const [cargo, setCargo] = useState('0');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteCandidate | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationsData, setLocationsData] = useState<Record<string, any>>({});

  // Community report
  const [repLoc, setRepLoc] = useState('');
  const [repSeg, setRepSeg] = useState('NH-6-GS');
  const [repIssue, setRepIssue] = useState('landslide');
  const [repSeverity, setRepSeverity] = useState('moderate');
  const [repDesc, setRepDesc] = useState('');
  const [repType, setRepType] = useState('local');
  const [repSubmitting, setRepSubmitting] = useState(false);
  const [repSuccess, setRepSuccess] = useState('');

  // Emergency SOS
  const [sosName, setSosName] = useState('');
  const [sosContact, setSosContact] = useState('');
  const [sosLocation, setSosLocation] = useState('');
  const [sosType, setSosType] = useState('medical');
  const [sosPeople, setSosPeople] = useState('1');
  const [sosDesc, setSosDesc] = useState('');
  const [sosSending, setSosSending] = useState(false);
  const [sosResult, setSosResult] = useState('');

  // Scenario control
  const [scnSeg, setScnSeg] = useState('NH-6-GS');
  const [scnStatus, setScnStatus] = useState('CLOSED');
  const [scnTriggering, setScnTriggering] = useState(false);
  const [cascade, setCascade] = useState<any>(null);

  // Decisions
  const [decisions, setDecisions] = useState<any[]>([]);

  // Map Data Freshness
  const [selectedSegmentData, setSelectedSegmentData] = useState<any>(null);

  const addLog = (msg: string) =>
    setLog(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p.slice(0, 29)]);

  // WebSocket
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('ws://localhost:8000/ws');
      ws.onopen = () => { setConnected(true); addLog('Live connection established.'); };
      ws.onclose = () => { setConnected(false); addLog('Connection lost. Retrying in 3s…'); setTimeout(connect, 3000); };
      ws.onerror = () => setConnected(false);
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === 'LNS_UPDATE') {
          addLog(`🚧 Network update: ${m.segment_id} is now ${m.new_status}`);
          if (m.cascade) {
            setCascade(m.cascade);
            setTab('alerts');
          }
          fetchOverlay();
          fetchDecisions();
        }
        if (m.type === 'NEW_REPORT') { addLog(`📋 New community report: ${m.report_id}`); fetchReports(); }
        if (m.type === 'EMERGENCY_SOS') addLog(`🆘 SOS ALERT: ${m.type} at ${m.location}`);
        if (m.type === 'DEMO_RESET') { addLog('🔄 Demo reset complete.'); setRouteResult(null); setSelectedRoute(null); setCascade(null); fetchOverlay(); fetchDecisions(); }
      };
      return ws;
    };
    const ws = connect();
    fetchOverlay();
    fetchLocations();
    fetchReports();
    fetchWeather();
    return () => ws.close();
  }, []);

  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      const r = await fetch(`${API}/weather/all`);
      const d = await r.json();
      if (d.weather) setWeatherData(d.weather);
    } catch {}
    setWeatherLoading(false);
  };

  const fetchOverlay = async () => {
    try {
      const r = await fetch(`${API}/network/overlay`);
      const d = await r.json();
      setLnsSegments(d.segments ?? {});
      setLnsVersion(d.version ?? 0);
    } catch {}
  };

  const fetchLocations = async () => {
    try {
      const r = await fetch(`${API}/locations`);
      const d = await r.json();
      setLocations(Object.keys(d.locations ?? {}));
      setLocationsData(d.locations ?? {});
    } catch {}
  };

  const fetchDecisions = async () => {
    try {
      const r = await fetch(`${API}/decisions`);
      const d = await r.json();
      setDecisions(d.decisions ?? []);
    } catch {}
  };

  const fetchReports = async () => {
    try {
      const r = await fetch(`${API}/reports`);
      const d = await r.json();
      setReports(d.reports ?? []);
    } catch {}
  };

  const planRoute = async () => {
    setRouteLoading(true); setRouteResult(null); setSelectedRoute(null);
    try {
      const r = await fetch(`${API}/routes?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&vehicle=${vehicle}&cargo_tonnes=${cargo}`);
      const d: RouteResult = await r.json();
      setRouteResult(d);
      if (d.feasible_routes.length > 0) {
        setSelectedRoute(d.feasible_routes[0]);
        addLog(`🗺️ Route planned: ${origin} → ${destination} — ${d.feasible_routes.length} option(s) found.`);
      } else {
        addLog(`⚠️ No feasible routes for ${vehicle} from ${origin} to ${destination}.`);
      }
    } catch { addLog('❌ Route planning failed — is backend running?'); }
    setRouteLoading(false);
  };

  const triggerScenario = async () => {
    setScnTriggering(true);
    try {
      await fetch(`${API}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'scenario', source: 'operator', trust: 0.95, segment_id: scnSeg, status: scnStatus })
      });
      addLog(`Scenario: ${scnSeg} → ${scnStatus}`);
    } catch { addLog('Event failed.'); }
    setScnTriggering(false);
  };

  const submitReport = async () => {
    setRepSubmitting(true); setRepSuccess('');
    try {
      const r = await fetch(`${API}/reports`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporter_type: repType, location_name: repLoc, segment_id: repSeg, issue_type: repIssue, severity: repSeverity, description: repDesc, vehicle_class: vehicle })
      });
      const d = await r.json();
      setRepSuccess(`✅ Report ${d.report_id} submitted. Thank you!`);
      setRepDesc(''); setRepLoc('');
      fetchReports();
    } catch { setRepSuccess('❌ Failed to submit — is backend running?'); }
    setRepSubmitting(false);
  };

  const sendSOS = async () => {
    setSosSending(true); setSosResult('');
    try {
      const r = await fetch(`${API}/emergency`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_name: sosName, contact: sosContact, location: sosLocation, emergency_type: sosType, people_count: parseInt(sosPeople), description: sosDesc })
      });
      const d = await r.json();
      setSosResult(`✅ SOS Registered: ${d.sos_id} — ${d.message}`);
      addLog(`🆘 SOS sent: ${d.sos_id} — ${sosType} at ${sosLocation}`);
    } catch { setSosResult('❌ Failed to send SOS.'); }
    setSosSending(false);
  };

  const resetDemo = async () => {
    await fetch(`${API}/demo/reset`, { method: 'POST' });
  };

  // ── Layout ──
  const sidebar: React.CSSProperties = { width: 56, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 4, zIndex: 10 };
  const navBtn = (active: boolean): React.CSSProperties => ({ width: 40, height: 40, borderRadius: 10, border: 'none', background: active ? `${C.primary}25` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, transition: 'all 0.15s', color: active ? C.primary : C.dim });

  const navItems = [
    { id: 'route', icon: '🗺️', title: 'Route Planner' },
    { id: 'alerts', icon: '⚡', title: 'Scenario Control' },
    { id: 'decisions', icon: '🏛️', title: 'Decision Log' },
    { id: 'report', icon: '📋', title: 'Report Hazard' },
    { id: 'emergency', icon: '🆘', title: 'Emergency SOS' },
    { id: 'weather', icon: '🌤️', title: 'Live Weather' },
    { id: 'map', icon: '📡', title: 'Live Network' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' }}>

      {/* Icon Sidebar */}
      <div style={sidebar}>
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 20 }}>⚡</div>
          <div style={{ fontSize: 7, color: C.dim, fontWeight: 800, letterSpacing: 1 }}>NE-SETU</div>
        </div>
        {navItems.map(n => (
          <button key={n.id} title={n.title} style={navBtn(tab === n.id)} onClick={() => setTab(n.id as any)}>{n.icon}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? C.green : C.red, boxShadow: `0 0 8px ${connected ? C.green : C.red}`, marginBottom: 8 }} title={connected ? 'System Live' : 'Offline'} />
      </div>

      {/* Left Panel */}
      <div style={{ width: 360, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 17, fontWeight: 800, background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {navItems.find(n => n.id === tab)?.icon} {navItems.find(n => n.id === tab)?.title}
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>LNS v{lnsVersion} · {connected ? '🟢 Live' : '🔴 Offline'}</div>
        </div>

        <div key={tab} className="animate-fade-in" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

          {/* ── ROUTE PLANNER ── */}
          {tab === 'route' && (
            <>
              <div style={card()}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <span style={label()}>📍 From</span>
                    <select style={input()} value={origin} onChange={e => setOrigin(e.target.value)}>
                      {(locations.length ? locations : ['Guwahati','Shillong','Jowai','Silchar','Dimapur','Kohima','Imphal','Nongpoh','Cherrapunji']).map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span style={label()}>🏁 To</span>
                    <select style={input()} value={destination} onChange={e => setDestination(e.target.value)}>
                      {(locations.length ? locations : ['Guwahati','Shillong','Jowai','Silchar','Dimapur','Kohima','Imphal','Nongpoh','Cherrapunji']).map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <span style={label()}>🚗 Vehicle Type</span>
                  <select style={input()} value={vehicle} onChange={e => setVehicle(e.target.value)}>
                    {VEHICLE_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                {['heavy_truck', 'light_truck'].includes(vehicle) && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={label()}>📦 Cargo Weight (tonnes)</span>
                    <input style={input()} type="number" min="0" max="30" value={cargo} onChange={e => setCargo(e.target.value)} />
                  </div>
                )}
                <button style={{ ...btn(C.primary, true), width: '100%', padding: '10px', fontSize: 13 }}
                  onClick={planRoute} disabled={routeLoading || origin === destination}>
                  {routeLoading ? '⏳ Finding Routes…' : `🔍 Find Best Route`}
                </button>
                {origin === destination && <div style={{ color: C.amber, fontSize: 11, marginTop: 6 }}>⚠️ Origin and destination must be different.</div>}
              </div>

              {routeResult && (
                <>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{routeResult.summary}</div>

                  {routeResult.feasible_routes.map(r => (
                    <div key={r.segment_id} onClick={() => setSelectedRoute(r)} style={{ ...card({ cursor: 'pointer', borderColor: selectedRoute?.segment_id === r.segment_id ? C.purple : C.border, background: selectedRoute?.segment_id === r.segment_id ? '#1a1428' : C.surface }) }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          {r.recommended && <span style={{ fontSize: 10, color: C.green, fontWeight: 700, background: `${C.green}15`, padding: '1px 6px', borderRadius: 4, marginRight: 6 }}>✅ RECOMMENDED</span>}
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: r.recommended ? 4 : 0 }}>{r.name}</div>
                        </div>
                        <span style={statusBadge(r.status)}>{r.status}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                        {[['🛣️ Distance', `${r.distance_km} km`], ['⏱️ ETA', `${r.eta_min} min`], ['🛡️ Resilience', `${r.resilience_score}/100`], ['🔍 Confidence', `${Math.round((r.confidence || 0)*100)}%`]].map(([ic, val]) => (
                          <div key={ic} style={{ background: '#0a0a0f', borderRadius: 6, padding: '6px 8px', textAlign: 'center' as const }}>
                            <div style={{ fontSize: 10, color: C.dim }}>{ic}</div>
                            <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 6 }}>
                        <span style={riskBadge(r.risk_score)}>⛰️ Landslide {r.landslide_risk_pct}%</span>
                        <span style={riskBadge((r.flood_risk_pct ?? 0) / 100)}>🌊 Flood {r.flood_risk_pct}%</span>
                        <span style={{ ...riskBadge(0), background: '#1e293b', color: C.muted }}>🛤️ {r.surface}</span>
                        <span style={{ ...riskBadge(0), background: '#3b0764', color: '#d8b4fe' }}>⚖️ Uncert. ±{r.eta_uncertainty_min}m</span>
                      </div>
                      {r.tradeoff_explanation && (
                        <div style={{ marginTop: 8, padding: '8px 10px', background: r.recommended ? `${C.green}10` : `${C.surface}`, border: `1px solid ${r.recommended ? C.green+'30' : C.border}`, borderRadius: 6 }}>
                          <div style={{ fontSize: 10, color: r.recommended ? C.green : C.dim, fontWeight: 700, marginBottom: 4 }}>
                            {r.recommended ? 'WHY SELECTED' : 'REJECTED ALTERNATIVE'}
                          </div>
                          <div style={{ fontSize: 11, color: C.text }}>{r.tradeoff_explanation}</div>
                        </div>
                      )}
                      {r.notes && <div style={{ fontSize: 11, color: C.dim, fontStyle: 'italic', lineHeight: 1.4, marginTop: 8 }}>💬 {r.notes}</div>}
                    </div>
                  ))}

                  {routeResult.blocked_routes.length > 0 && (
                    <>
                      <div style={{ ...label({ marginTop: 4 }) }}>❌ Blocked / Incompatible Routes</div>
                      {routeResult.blocked_routes.map(r => (
                        <div key={r.segment_id} style={{ ...card({ borderColor: `${C.red}30`, opacity: 0.75 }) }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 12, color: C.text }}>{r.name}</div>
                            <span style={statusBadge(r.status)}>{r.status}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>🚫 {r.rejection}</div>
                        </div>
                      ))}
                    </>
                  )}

                  {routeResult.feasible_routes.length === 0 && (
                    <div style={{ ...card({ borderColor: `${C.red}40`, background: `${C.red}08` }) }}>
                      <div style={{ fontSize: 14, color: C.red, fontWeight: 700 }}>🚫 No Passable Routes</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>All routes are currently blocked or incompatible with your vehicle. Consider a different vehicle class or wait for road clearance.</div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── SCENARIO CONTROL ── */}
          {tab === 'alerts' && (
            <>
              {cascade && (
                <div className="animate-fade-in" style={{ ...card({ borderColor: C.red, background: '#2d0a0f', marginBottom: 16 }) }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.red, marginBottom: 8 }}>🚨 DISRUPTION CASCADE: {cascade.event.segment_name} {cascade.event.new_status}</div>
                  <div style={{ fontSize: 11, color: C.text, marginBottom: 12 }}>{cascade.summary}</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: C.dim }}>Affected Routes</div>
                      <div style={{ fontSize: 18, color: C.amber, fontWeight: 700 }}>{cascade.affected_routes_count}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: C.dim }}>Affected Vehicles</div>
                      <div style={{ fontSize: 18, color: C.amber, fontWeight: 700 }}>{cascade.affected_vehicles_count}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: C.dim }}>Affected Deliveries</div>
                      <div style={{ fontSize: 18, color: C.amber, fontWeight: 700 }}>{cascade.affected_deliveries_count}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: C.dim }}>Emergencies At Risk</div>
                      <div style={{ fontSize: 18, color: C.red, fontWeight: 700 }}>{cascade.emergency_at_risk_count}</div>
                    </div>
                  </div>
                  
                  {cascade.reassignments_count > 0 && (
                    <div style={{ fontSize: 11, color: C.green, background: 'rgba(34, 197, 94, 0.1)', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                      ✅ <b>New Plan Generated</b>: {cascade.reassignments_count} vehicles reassigned to alternate routes.
                    </div>
                  )}
                  {cascade.deferred_count > 0 && (
                    <div style={{ fontSize: 11, color: C.amber, background: 'rgba(245, 158, 11, 0.1)', padding: 8, borderRadius: 6 }}>
                      ⚠️ <b>Deliveries Deferred</b>: {cascade.deferred_count} routine deliveries halted due to lack of viable alternate routes.
                    </div>
                  )}
                  
                  <button style={{ ...btn(C.dim, false), width: '100%', marginTop: 12, padding: 6, fontSize: 11 }} onClick={() => setCascade(null)}>Dismiss Cascade Alert</button>
                </div>
              )}

              <div style={card()}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12 }}>🎛️ Operator Scenario Control</div>
                <span style={label()}>Road Segment</span>
                <select style={{ ...input(), marginBottom: 10 }} value={scnSeg} onChange={e => setScnSeg(e.target.value)}>
                  {SEGMENT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <span style={label()}>Update Status To</span>
                <select style={{ ...input(), marginBottom: 12 }} value={scnStatus} onChange={e => setScnStatus(e.target.value)}>
                  {[['OPEN','✅ Open'], ['SUSPECTED','⚠️ Suspected Disruption'], ['CLOSED','🔴 Closed — Hazard Active']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button style={btn(C.primary, true)} onClick={triggerScenario} disabled={scnTriggering}>
                    {scnTriggering ? '⏳ Sending…' : '⚡ Apply Update'}
                  </button>
                  <button style={btn(C.purple)} onClick={async () => {
                    await fetch(`${API}/demo/resilience`, { method: 'POST' });
                    addLog('🎬 Started Full Demo Scenario');
                    fetchDecisions();
                  }}>🎬 Run Demo Scenario</button>
                </div>
              </div>

              <div style={{ ...label(), marginTop: 4 }}>📡 Quick Controls</div>
              {[
                { label: '🔄 Reset All Network State', action: resetDemo, color: C.dim },
              ].map(({ label: l, action, color }) => (
                <button key={l} style={{ ...btn(color), display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }} onClick={action}>
                  {l}
                </button>
              ))}

              <div style={{ ...label(), marginTop: 12 }}>📋 Live Event Log</div>
              <div style={{ ...card({ padding: '8px 12px', maxHeight: 200, overflowY: 'auto' as const }) }}>
                {log.length === 0 ? <div style={{ fontSize: 11, color: C.dim }}>Waiting for events…</div> : log.map((l, i) => (
                  <div key={i} style={{ fontSize: 11, color: i === 0 ? C.text : C.dim, padding: '3px 0', borderBottom: `1px solid ${C.border}` }}>{l}</div>
                ))}
              </div>
            </>
          )}

          {/* ── DECISION LOG ── */}
          {tab === 'decisions' && (
            <>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
                🏛️ Complete provenance tracking. Every automated decision, simulation, and disruption cascade is permanently logged here with inputs, context, and reasoning.
              </div>
              <button style={{ ...btn(C.dim, false), width: '100%', padding: '6px', fontSize: 11, marginBottom: 12 }} onClick={fetchDecisions}>🔄 Refresh Log</button>
              
              {decisions.slice().reverse().map(d => (
                <div key={d.id} style={{ ...card({ padding: 12 }) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{d.id}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>{new Date(d.timestamp).toLocaleTimeString()}</div>
                  </div>
                  
                  <div style={{ fontSize: 11, color: C.text, marginBottom: 6 }}>
                    <span style={{ color: C.dim, width: 90, display: 'inline-block' }}>Trigger:</span> 
                    <span style={{ fontWeight: 600 }}>{d.trigger.toUpperCase()}</span>
                  </div>
                  
                  {d.trigger === 'route_planning' && (
                    <>
                      <div style={{ fontSize: 11, color: C.text, marginBottom: 6 }}>
                        <span style={{ color: C.dim, width: 90, display: 'inline-block' }}>Route:</span> 
                        {d.inputs.origin} → {d.inputs.destination} ({d.inputs.vehicle_class})
                      </div>
                      <div style={{ fontSize: 11, color: C.text, marginBottom: 6 }}>
                        <span style={{ color: C.dim, width: 90, display: 'inline-block' }}>Selected:</span> 
                        {d.selected_route ? <span style={{ color: C.green }}>{d.selected_route}</span> : <span style={{ color: C.red }}>NONE (Blocked)</span>}
                      </div>
                      {d.selected_resilience && (
                        <div style={{ fontSize: 11, color: C.text, marginBottom: 6 }}>
                          <span style={{ color: C.dim, width: 90, display: 'inline-block' }}>Resilience:</span> 
                          {d.selected_resilience}/100 (Conf: {Math.round(d.selected_confidence*100)}%)
                        </div>
                      )}
                    </>
                  )}
                  
                  {d.trigger === 'disruption_cascade' && (
                    <>
                      <div style={{ fontSize: 11, color: C.text, marginBottom: 6 }}>
                        <span style={{ color: C.dim, width: 90, display: 'inline-block' }}>Event:</span> 
                        {d.inputs.segment_id} → <span style={{ color: C.red }}>{d.inputs.new_status}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.text, marginBottom: 6 }}>
                        <span style={{ color: C.dim, width: 90, display: 'inline-block' }}>Impact:</span> 
                        {d.affected_routes_count} routes, {d.affected_vehicles_count} vehicles, {d.affected_deliveries_count} deliveries
                      </div>
                      <div style={{ fontSize: 11, color: C.text, marginBottom: 6 }}>
                        <span style={{ color: C.dim, width: 90, display: 'inline-block' }}>Response:</span> 
                        {d.reassignments_count} reassigned, {d.deferred_count} deferred
                      </div>
                    </>
                  )}
                  
                  <div style={{ fontSize: 10, marginTop: 8, textAlign: 'right' }}>
                    <span style={{ padding: '2px 6px', background: `${C.amber}20`, color: C.amber, borderRadius: 4 }}>Human Approval: {d.human_approval_state}</span>
                  </div>
                </div>
              ))}
              
              {decisions.length === 0 && (
                <div style={{ textAlign: 'center', color: C.dim, fontSize: 12, marginTop: 20 }}>No decisions logged yet.</div>
              )}
            </>
          )}

          {/* ── COMMUNITY REPORT ── */}
          {tab === 'report' && (
            <>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
                🏔️ You are the first line of information in the Northeast. Report a road hazard and help your community stay safe.
              </div>
              <div style={card()}>
                <span style={label()}>Who are you?</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                  {[['local','🏠 Local'], ['driver','🚗 Driver'], ['official','👮 Official']].map(([v, l]) => (
                    <button key={v} style={{ ...btn(repType === v ? C.primary : C.dim, repType === v), padding: '8px 4px', fontSize: 11 }} onClick={() => setRepType(v)}>{l}</button>
                  ))}
                </div>

                <span style={label()}>📍 Location / Village Name</span>
                <input style={{ ...input(), marginBottom: 10 }} placeholder="e.g. Near Mawlai, km 28 on NH-6" value={repLoc} onChange={e => setRepLoc(e.target.value)} />

                <span style={label()}>🛣️ Which Road Segment?</span>
                <select style={{ ...input(), marginBottom: 10 }} value={repSeg} onChange={e => setRepSeg(e.target.value)}>
                  {SEGMENT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>

                <span style={label()}>⚠️ Issue Type</span>
                <select style={{ ...input(), marginBottom: 10 }} value={repIssue} onChange={e => setRepIssue(e.target.value)}>
                  {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                <span style={label()}>🔴 Severity</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                  {[['minor','Minor', C.green], ['moderate','Moderate', C.amber], ['severe','Severe', C.red]].map(([v, l, c]) => (
                    <button key={v} style={{ ...btn(repSeverity === v ? c : C.dim, repSeverity === v), padding: '8px 4px', fontSize: 11 }} onClick={() => setRepSeverity(v)}>{l}</button>
                  ))}
                </div>

                <span style={label()}>💬 Description</span>
                <textarea style={{ ...input(), minHeight: 72, resize: 'vertical' as const, marginBottom: 12 }}
                  placeholder="Describe what you see — landslide size, water level, vehicles stuck…"
                  value={repDesc} onChange={e => setRepDesc(e.target.value)} />

                <button style={{ ...btn(C.primary, true), width: '100%', padding: 10 }} onClick={submitReport} disabled={repSubmitting || !repLoc || !repDesc}>
                  {repSubmitting ? '⏳ Submitting…' : '📤 Submit Report'}
                </button>
                {repSuccess && <div style={{ marginTop: 8, fontSize: 12, color: repSuccess.startsWith('✅') ? C.green : C.red }}>{repSuccess}</div>}
              </div>

              {reports.length > 0 && (
                <>
                  <div style={label()}>Recent Community Reports</div>
                  {reports.slice().reverse().slice(0, 5).map(r => (
                    <div key={r.id} style={card({ padding: '10px 12px' })}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{ISSUE_TYPES.find(t => t.value === r.issue_type)?.label ?? r.issue_type}</span>
                        <span style={{ fontSize: 10, color: r.severity === 'severe' ? C.red : r.severity === 'moderate' ? C.amber : C.green }}>⬤ {r.severity}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{r.location_name}</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{r.description}</div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {/* ── EMERGENCY SOS ── */}
          {tab === 'emergency' && (
            <>
              <div style={{ ...card({ borderColor: `${C.red}50`, background: `${C.red}08` }), marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.red, marginBottom: 6 }}>🆘 Emergency SOS</div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>Use this for urgent situations — medical evacuation, village cut-off from supplies, or search & rescue. Your request goes directly to district emergency coordinators.</div>
              </div>

              <div style={card()}>
                <span style={label()}>Emergency Type</span>
                <select style={{ ...input(), marginBottom: 10 }} value={sosType} onChange={e => setSosType(e.target.value)}>
                  {EMERGENCY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <span style={label()}>Your Name</span>
                    <input style={input()} placeholder="Full name" value={sosName} onChange={e => setSosName(e.target.value)} />
                  </div>
                  <div>
                    <span style={label()}>Contact Number</span>
                    <input style={input()} placeholder="Mobile / Sat phone" value={sosContact} onChange={e => setSosContact(e.target.value)} />
                  </div>
                </div>

                <span style={label()}>📍 Your Location</span>
                <input style={{ ...input(), marginBottom: 10 }} placeholder="Village name, km marker, or landmark" value={sosLocation} onChange={e => setSosLocation(e.target.value)} />

                <span style={label()}>👥 Number of People Affected</span>
                <input style={{ ...input(), marginBottom: 10 }} type="number" min="1" value={sosPeople} onChange={e => setSosPeople(e.target.value)} />

                <span style={label()}>📝 Situation Description</span>
                <textarea style={{ ...input(), minHeight: 72, resize: 'vertical' as const, marginBottom: 12 }}
                  placeholder="Describe the emergency, current conditions, any resources already on the way…"
                  value={sosDesc} onChange={e => setSosDesc(e.target.value)} />

                <button style={{ ...btn(C.red, true), width: '100%', padding: 12, fontSize: 14, fontWeight: 800 }}
                  onClick={sendSOS} disabled={sosSending || !sosName || !sosLocation}>
                  {sosSending ? '⏳ Sending SOS…' : '🆘 SEND EMERGENCY REQUEST'}
                </button>
                {sosResult && <div style={{ marginTop: 10, fontSize: 12, color: sosResult.startsWith('✅') ? C.green : C.red, lineHeight: 1.5 }}>{sosResult}</div>}
              </div>

              <div style={card({ background: '#0a0f1a', borderColor: `${C.primary}30` })}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 8 }}>📞 Emergency Contacts (NE India)</div>
                {[
                  ['Police Control Room', '100'],
                  ['Ambulance', '108'],
                  ['Disaster Management (Assam)', '1800-345-3600'],
                  ['NDRF Helpline', '011-24363260'],
                  ['Meghalaya Control Room', '0364-2224703'],
                ].map(([n, num]) => (
                  <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                    <span style={{ color: C.muted }}>{n}</span>
                    <span style={{ color: C.accent, fontWeight: 700 }}>{num}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── LIVE MAP TAB (Sidebar) ── */}
          {tab === 'map' && (
            <>
              <div style={card()}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>📡 Current Network Status</div>
                {Object.entries(lnsSegments).length === 0 ? (
                  <div style={{ fontSize: 12, color: C.dim }}>All corridors nominal. No active disruptions.</div>
                ) : Object.entries(lnsSegments).map(([id, seg]: [string, any]) => (
                  <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 12, color: C.text }}>{seg.name || id}</div>
                    </div>
                    <span style={statusBadge(seg.status)}>{seg.status}</span>
                  </div>
                ))}
              </div>
              <div style={card({ padding: '10px 12px', maxHeight: 240, overflowY: 'auto' as const })}>
                <div style={{ ...label(), marginBottom: 8 }}>📋 Live Event Log</div>
                {log.length === 0 ? <div style={{ fontSize: 11, color: C.dim }}>No events yet.</div> : log.map((l, i) => (
                  <div key={i} style={{ fontSize: 11, color: i === 0 ? C.text : C.dim, padding: '3px 0', borderBottom: `1px solid ${C.border}` }}>{l}</div>
                ))}
              </div>
            </>
          )}

          {/* ── LIVE WEATHER ── */}
          {tab === 'weather' && (
            <>
              <div style={{ ...card({ borderColor: `${C.accent}50`, background: `${C.accent}08` }), marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.accent, marginBottom: 6 }}>🌤️ Regional Weather Intelligence</div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                  Powered by high-resolution multi-model forecasts via Open-Meteo. Essential for predicting landslides and flood risks in the Northeast.
                </div>
                <button style={{ ...btn(C.accent, false), marginTop: 10, fontSize: 11, padding: '6px 12px' }} onClick={fetchWeather} disabled={weatherLoading}>
                  {weatherLoading ? '⏳ Refreshing...' : '🔄 Refresh Data'}
                </button>
              </div>

              {weatherLoading && !weatherData && <div style={{ color: C.dim, fontSize: 12 }}>Loading meteorological data...</div>}
              
              {weatherData && Object.entries(weatherData).map(([loc, w]: [string, any]) => (
                <div key={loc} style={card({ padding: '12px' })}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{loc}</div>
                      <div style={{ fontSize: 10, color: C.dim }}>{w.state}</div>
                    </div>
                    <div style={{ fontSize: 24 }}>{w.emoji}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    <div style={{ background: '#0a0a0f', borderRadius: 6, padding: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: C.dim }}>Temp</div>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{w.temp_c}°C</div>
                    </div>
                    <div style={{ background: '#0a0a0f', borderRadius: 6, padding: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: C.dim }}>Rain</div>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{w.rain_mm}mm</div>
                    </div>
                    <div style={{ background: '#0a0a0f', borderRadius: 6, padding: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: C.dim }}>Wind</div>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{w.wind_kmh}</div>
                    </div>
                    <div style={{ background: '#0a0a0f', borderRadius: 6, padding: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: C.dim }}>Precip</div>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{w.precipitation_mm}</div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.dim }}>
          NE-Setu · Northeast India Adaptive Logistics Intelligence · LNS v{lnsVersion}
        </div>
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <LNSMap
          segments={lnsSegments}
          routeCoords={selectedRoute?.coordinates}
          routeStatus={selectedRoute?.status}
          locations={locationsData}
          onSegmentClick={async (id) => {
            try {
              const r = await fetch(`${API}/segments/${id}/details`);
              const d = await r.json();
              setSelectedSegmentData(d);
            } catch {}
          }} 
        />

        {selectedSegmentData && (
          <div className="animate-fade-in" style={{ position: 'absolute', top: 16, right: 16, width: 340, background: 'rgba(14,14,20,0.95)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{selectedSegmentData.name}</div>
              <button style={{ background: 'transparent', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 16 }} onClick={() => setSelectedSegmentData(null)}>×</button>
            </div>
            
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <span style={statusBadge(selectedSegmentData.status)}>{selectedSegmentData.status}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: selectedSegmentData.freshness === 'FRESH' ? `${C.green}20` : selectedSegmentData.freshness === 'AGING' ? `${C.amber}20` : `${C.red}20`, color: selectedSegmentData.freshness === 'FRESH' ? C.green : selectedSegmentData.freshness === 'AGING' ? C.amber : C.red }}>
                ⏱️ {selectedSegmentData.freshness}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${C.purple}20`, color: C.purple }}>
                🔍 CONF: {Math.round(selectedSegmentData.confidence * 100)}%
              </span>
            </div>
            
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>
              Updated {selectedSegmentData.age_minutes != null ? `${selectedSegmentData.age_minutes} min ago` : 'Baseline'}
            </div>

            {selectedSegmentData.warnings && selectedSegmentData.warnings.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {selectedSegmentData.warnings.map((w: string, i: number) => (
                  <div key={i} style={{ fontSize: 11, color: C.amber, background: `${C.amber}15`, padding: '6px 8px', borderRadius: 4, marginBottom: 4 }}>
                    ⚠️ {w}
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase' }}>Evidence / Reports</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
              {selectedSegmentData.evidence && selectedSegmentData.evidence.length > 0 ? (
                selectedSegmentData.evidence.slice().reverse().map((e: any, i: number) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 6, borderLeft: `2px solid ${e.trust > 0.8 ? C.green : e.trust > 0.4 ? C.amber : C.red}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: C.text, fontWeight: 600 }}>{e.source.toUpperCase()}</span>
                      <span style={{ fontSize: 9, color: C.dim }}>Trust: {Math.round(e.trust * 100)}%</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.dim }}>{e.description}</div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 10, color: C.dim }}>No evidence found.</div>
              )}
            </div>
          </div>
        )}

        {/* Route info floating card on map */}
        {selectedRoute && tab === 'route' && (
          <div style={{ position: 'absolute', top: 16, left: 16, width: 260, background: 'rgba(14,14,20,0.95)', border: `1px solid ${C.purple}50`, borderRadius: 12, padding: 14, backdropFilter: 'blur(12px)', boxShadow: `0 0 30px ${C.purple}20` }}>
            <div style={{ fontSize: 11, color: C.purple, fontWeight: 800, marginBottom: 4 }}>🗺️ SELECTED ROUTE</div>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 700, marginBottom: 8 }}>{selectedRoute.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[['📍 Distance', `${selectedRoute.distance_km} km`], ['⏱️ ETA (P50)', `${selectedRoute.eta_min} min`], ['⏱️ ETA (P90)', `${selectedRoute.eta_p90_min} min`], ['🏋️ Bridge Max', `${selectedRoute.bridge_limit_t}T`]].map(([k, v]) => (
                <div key={k} style={{ background: '#0a0a0f', borderRadius: 6, padding: '6px 8px' }}>
                  <div style={{ fontSize: 10, color: C.dim }}>{k}</div>
                  <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
            {selectedRoute.status !== 'OPEN' && (
              <div style={{ marginTop: 8, padding: '6px 10px', background: `${C.amber}15`, borderRadius: 6, fontSize: 11, color: C.amber }}>
                ⚠️ Proceed with caution — route status: {selectedRoute.status}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
