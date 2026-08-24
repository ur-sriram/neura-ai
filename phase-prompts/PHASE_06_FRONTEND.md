# PHASE 06 — FRONTEND & UI
**Track:** D | **Hours:** 6–22 | **Agent:** Frontend Agent  
**Output:** React SPA with 7 screens — all wired to the backend API and WebSocket  
**Master spec refs:** Section 27 (Frontend Architecture), Section 29 (Screen Specifications), Section 32 (Demo Script)

---

## Context

You are building the **React frontend** for NE-Setu — a dark command-centre interface with a live geospatial map at its core. The UI must look like a professional disaster-response ops platform, not a generic CRUD app.

**Tech:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, MapLibre GL JS, deck.gl, Zustand, Recharts, React Router v6.

---

## Project Structure

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx                  # Router + auth guard
│   ├── store/
│   │   ├── lnsStore.ts          # LNS state (the one source of truth client-side)
│   │   ├── simStore.ts          # sim clock state
│   │   └── authStore.ts
│   ├── api/
│   │   ├── client.ts            # axios instance with JWT interceptor
│   │   ├── events.ts
│   │   ├── plans.ts
│   │   ├── simulation.ts
│   │   └── ...
│   ├── ws/
│   │   └── wsClient.ts          # WebSocket client + reconnect logic
│   ├── components/
│   │   ├── GeoCanvas/           # MapLibre + deck.gl map component
│   │   ├── SimClock/            # Persistent header clock widget
│   │   ├── AlertDrawer/         # Global alert panel
│   │   ├── ScoreChip/           # Accessibility score with hover decomposition
│   │   └── ui/                  # shadcn/ui components
│   ├── screens/
│   │   ├── S1_Dashboard/
│   │   ├── S2_LiveMap/
│   │   ├── S3_Heatmap/
│   │   ├── S4_PlanDispatch/
│   │   ├── S5_DisruptionConsole/
│   │   ├── S6_WhatIf/
│   │   ├── S7_DecisionLog/
│   │   ├── S8_DriverView/
│   │   └── S9_CitizenForm/
│   └── types/
│       └── index.ts             # shared TypeScript types
├── index.html
├── vite.config.ts
└── tailwind.config.ts
```

---

## Design System (Critical — Apply Everywhere)

**Colour palette (dark command-centre):**
```css
/* globals.css */
:root {
  --bg-base:      #0a0f1a;   /* near-black navy */
  --bg-surface:   #111827;   /* card backgrounds */
  --bg-elevated:  #1f2937;   /* hover state, dropdowns */
  --border:       #374151;
  --text-primary: #f9fafb;
  --text-muted:   #9ca3af;
  
  /* Accessibility band — used IDENTICALLY on map, chips, tables, alerts */
  --band-green:   #22c55e;   /* 80–100 highly accessible */
  --band-yellow:  #eab308;   /* 50–79 moderate */
  --band-orange:  #f97316;   /* 30–49 difficult */
  --band-red:     #ef4444;   /* 0–29 critical */
  
  /* Road status */
  --status-open:      #22c55e;
  --status-suspected: #f59e0b;
  --status-closed:    #ef4444;
  
  --accent:       #6366f1;   /* indigo — primary interactive */
  --accent-hover: #4f46e5;
  --emergency:    #dc2626;   /* emergency mode */
}
```

**Typography:**
```
font-family: 'Inter', system-ui, sans-serif  (via Google Fonts)
Numerals: font-variant-numeric: tabular-nums  (monospaced numbers — apply to all KPI values)
```

---

## Global State (`store/lnsStore.ts`)

```typescript
// The single source of truth for all map-related state client-side
interface LNSStore {
  version: number;
  overlays: Record<string, SegmentOverlay>;  // keyed by segment_id
  heatmap: Record<string, HexCell>;           // keyed by h3_index
  selectedVehicleClass: 'heavy' | 'mini' | '4x4' | 'special';
  
  // Actions
  setVersion: (v: number) => void;
  applyOverlayDelta: (delta: SegmentOverlay[]) => void;
  setVehicleClass: (c: string) => void;
}
```

**State flow (Section 27.2):**
```
WS push (lns_update) → fetch overlay delta → lnsStore.applyOverlayDelta()
→ map layers + score chips + heatmap ALL re-render from same store
```

---

## WebSocket Client (`ws/wsClient.ts`)

```typescript
class WSClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  
  connect(token: string) {
    this.ws = new WebSocket(`ws://localhost:8000/ws?token=${token}`);
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.handleMessage(msg);
    };
    
    this.ws.onclose = () => {
      // Silent reconnect after 3s — show "connection degraded" indicator
      simStore.setConnectionStatus('degraded');
      this.reconnectTimer = setTimeout(() => this.connect(token), 3000);
    };
  }
  
  handleMessage(msg: WSMessage) {
    switch (msg.type) {
      case 'lns_update':
        // Fetch delta from /map/network/overlay?version=msg.version
        fetchOverlayDelta(msg.version).then(lnsStore.applyOverlayDelta);
        break;
      case 'clock_tick':
        simStore.setSimHour(msg.sim_time);
        break;
      case 'plan_proposed':
        // Show approval notification
        alertStore.addAlert({ type: 'approval_needed', plan_id: msg.plan_id });
        break;
      case 'event_ingested':
        // Flash affected segments on map
        mapStore.flashSegments(msg.segment_ids, msg.status);
        break;
    }
  }
}
```

---

## GeoCanvas Component (`components/GeoCanvas/`)

The reusable map component used by S2, S3, S4, S6:

```typescript
import maplibregl from 'maplibre-gl';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { H3HexagonLayer } from '@deck.gl/geo-layers';

interface GeoCanvasProps {
  showHeatmap?: boolean;
  showVehicles?: boolean;
  showRoutes?: boolean;
  interactiveSegments?: boolean;
  onSegmentClick?: (segmentId: string) => void;
}

export function GeoCanvas({ showHeatmap, showVehicles, showRoutes, onSegmentClick }: GeoCanvasProps) {
  const { overlays, heatmap, selectedVehicleClass } = useLNSStore();
  
  // Road segment layer — coloured by accessibility band
  const segmentLayer = new GeoJsonLayer({
    id: 'road-segments',
    data: segmentsGeoJSON,
    getLineColor: (f) => bandToColor(overlays[f.properties.segment_id]?.a_score_heavy),
    getLineWidth: (f) => roadClassToWidth(f.properties.highway_class),
    lineWidthMinPixels: 1,
    pickable: interactiveSegments,
    onClick: ({ object }) => onSegmentClick?.(object.properties.segment_id),
    updateTriggers: { getLineColor: [overlays, selectedVehicleClass] }
  });
  
  // H3 heatmap layer
  const hexLayer = showHeatmap ? new H3HexagonLayer({
    id: 'heatmap',
    data: Object.values(heatmap),
    getHexagon: (d) => d.h3_index,
    getFillColor: (d) => bandToColorRGBA(d[`mean_a_${selectedVehicleClass}`], 0.6),
    extruded: false,
    updateTriggers: { getFillColor: [heatmap, selectedVehicleClass] }
  }) : null;
  
  // Vehicle markers
  const vehicleLayer = showVehicles ? new ScatterplotLayer({
    id: 'vehicles',
    data: vehicles,
    getPosition: (v) => [v.lon, v.lat],
    getRadius: 800,
    getFillColor: vehicleClassToColor,
    pickable: true,
  }) : null;
  
  return (
    <DeckGL layers={[hexLayer, segmentLayer, vehicleLayer].filter(Boolean)} ...>
      <Map mapStyle="http://localhost:8081/tiles/style.json" ... />
    </DeckGL>
  );
}

function bandToColor(score: number | undefined): [number,number,number] {
  if (score === undefined) return [55, 65, 81];   // grey (unknown)
  if (score >= 80) return [34, 197, 94];           // --band-green
  if (score >= 50) return [234, 179, 8];           // --band-yellow
  if (score >= 30) return [249, 115, 22];          // --band-orange
  return [239, 68, 68];                             // --band-red
}
```

---

## Sim Clock Widget (`components/SimClock/`)

Persistent in the header — always visible:

```tsx
export function SimClock() {
  const { simHour, isPlaying, speed, connectionStatus } = useSimStore();
  
  const displayTime = simHourToDisplayTime(simHour); // "Day 2, 14:00"
  
  return (
    <div className="flex items-center gap-3 bg-bg-elevated rounded-lg px-4 py-2">
      <div className="font-mono text-lg text-white">{displayTime}</div>
      <button onClick={togglePlay}>{isPlaying ? <PauseIcon/> : <PlayIcon/>}</button>
      <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
        <option value={1}>×1</option>
        <option value={5}>×5</option>
        <option value={10}>×10</option>
        <option value={20}>×20</option>
      </select>
      {connectionStatus === 'degraded' && (
        <span className="text-amber-400 text-xs">● polling</span>
      )}
    </div>
  );
}
```

---

## Score Chip Component (`components/ScoreChip/`)

Used everywhere a score is displayed — hover reveals decomposition:

```tsx
interface ScoreChipProps {
  score: number;
  vehicleClass: string;
  contributing_factors?: Record<string, number>;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreChip({ score, contributing_factors, size = 'md' }: ScoreChipProps) {
  const band = getBand(score);  // green/yellow/orange/red
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className={`font-mono font-bold rounded px-2 py-1 text-${size} bg-${band}-500/20 text-${band}-400`}>
            {score.toFixed(0)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            {contributing_factors && Object.entries(contributing_factors).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className="text-gray-400">{k}</span>
                <span className="font-mono">{(v * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

## Screen Specifications

### S1 — Command Dashboard

```tsx
// Layout: KPI strip at top, then 2-column: alert feed + sparklines
export function Dashboard() {
  const kpi = useKPI();  // polls GET /analytics/kpi every 5s
  
  return (
    <div className="grid grid-cols-6 gap-4 p-4">
      {/* KPI Strip */}
      <KPICard label="Active Vehicles" value={kpi.active_vehicles} icon={<TruckIcon/>} />
      <KPICard label="In Transit" value={kpi.deliveries_by_status.in_transit} />
      <KPICard label="At Risk" value={kpi.at_risk_deliveries} urgent={kpi.at_risk_deliveries > 0} />
      <KPICard label="Road Closures" value={kpi.road_blockages.closed} urgent />
      <KPICard label="Emergency Requests" value={kpi.emergency_requests} urgent />
      <KPICard label="Network Access (4×4)" value={`${kpi.mean_network_accessibility['4x4'].toFixed(0)}%`} />
      
      {/* Live alert feed */}
      <div className="col-span-3">
        <AlertFeed />
      </div>
      
      {/* Model performance mini-panel */}
      <div className="col-span-3">
        <ModelPerformancePanel />
      </div>
    </div>
  );
}
```

### S2 — Live Map

```tsx
export function LiveMap() {
  const [selectedSegment, setSelectedSegment] = useState(null);
  const { selectedVehicleClass, setVehicleClass } = useLNSStore();
  
  return (
    <div className="relative h-full">
      <GeoCanvas showVehicles showRoutes interactiveSegments onSegmentClick={setSelectedSegment} />
      
      {/* Vehicle class toggle — THE DEMO SIGNATURE INTERACTION */}
      <div className="absolute top-4 right-4 bg-bg-surface rounded-lg p-2 flex gap-2">
        {['heavy','mini','4x4','special'].map(cls => (
          <button key={cls}
            onClick={() => setVehicleClass(cls)}
            className={cls === selectedVehicleClass ? 'bg-accent text-white' : 'text-gray-400'}
          >
            {cls}
          </button>
        ))}
      </div>
      
      {/* Segment detail drawer (slides in from right) */}
      {selectedSegment && <SegmentDetailDrawer segmentId={selectedSegment} onClose={() => setSelectedSegment(null)} />}
    </div>
  );
}
```

### S3 — Accessibility Heatmap

```tsx
export function HeatmapScreen() {
  const [horizon, setHorizon] = useState(0);  // 0/6/12/24/48/72h
  const { selectedVehicleClass } = useLNSStore();
  
  return (
    <div className="grid grid-cols-3 gap-4 h-full p-4">
      <div className="col-span-2">
        <GeoCanvas showHeatmap />
        {/* Horizon time slider */}
        <select value={horizon} onChange={e => setHorizon(Number(e.target.value))}>
          {[0,6,12,24,48,72].map(h => <option key={h} value={h}>+{h}h</option>)}
        </select>
      </div>
      
      <div className="col-span-1 space-y-4">
        {/* At-risk locations table */}
        <AtRiskLocationsTable />
        {/* Pre-positioning recommendation */}
        <PrePositioningCard />
      </div>
    </div>
  );
}
```

### S4 — Plan & Dispatch

```tsx
export function PlanDispatch() {
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showNaive, setShowNaive] = useState(false);
  
  return (
    <div className="grid grid-cols-2 gap-4 p-4 h-full">
      {/* Delivery queue */}
      <DeliveryQueue onSelect={setSelectedDelivery} />
      
      {/* Right panel: candidate routes for selected delivery */}
      {selectedDelivery && (
        <div>
          {/* Smart vs Naive toggle */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setShowNaive(false)} className={!showNaive ? 'active' : ''}>Smart</button>
            <button onClick={() => setShowNaive(true)} className={showNaive ? 'active' : ''}>Naive</button>
          </div>
          
          <RouteCandidateTable deliveryId={selectedDelivery} mode={showNaive ? 'naive' : 'smart'} />
          
          {/* Approval button */}
          <Button onClick={approvePlan} className="w-full bg-accent mt-4">
            Approve Plan
          </Button>
        </div>
      )}
    </div>
  );
}

// Route candidate table — SHOWS REJECTED ROUTES WITH REASONS
function RouteCandidateTable({ deliveryId, mode }) {
  return (
    <table>
      <thead>
        <tr><th>Route</th><th>ETA</th><th>Risk</th><th>Cost</th><th>Status</th></tr>
      </thead>
      <tbody>
        {candidates.map(c => (
          <tr key={c.id} className={c.chosen ? 'bg-green-900/20' : c.feasible ? '' : 'opacity-50 line-through'}>
            <td>{c.route_label}</td>
            <td className="font-mono">{c.eta_p50}–{c.eta_p90}h</td>
            <td><ScoreChip score={(1-c.risk)*100} /></td>
            <td className="font-mono">{c.cost_total.toFixed(2)}</td>
            <td>
              {!c.feasible && <span className="text-red-400 text-xs">{c.rejection_reason}</span>}
              {c.chosen && <span className="text-green-400">✓ Selected</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### S5 — Disruption Console

```tsx
export function DisruptionConsole() {
  const [activeEvent, setActiveEvent] = useState(null);
  
  return (
    <div className="grid grid-cols-3 gap-4 p-4 h-full">
      {/* Event stream */}
      <EventStream onSelect={setActiveEvent} />
      
      {/* Cascade stepper — THE DEMO CENTREPIECE */}
      {activeEvent && (
        <div className="col-span-2">
          <CascadeStepper eventId={activeEvent.id} />
          <PlanDiffView />
          
          {/* Approval gate — impossible to miss */}
          {pendingPlan && (
            <div className="border-2 border-red-500 rounded-lg p-4 bg-red-900/10 mt-4">
              <h3 className="text-red-400 font-bold text-lg">⚠ Awaiting Approval</h3>
              <Button onClick={approve} className="bg-accent">Approve Replan</Button>
              <Button onClick={reject} variant="ghost">Reject</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 10-step cascade stepper with live checkmarks
function CascadeStepper({ eventId }) {
  const stages = [
    'Event ingested', 'Trust-weighted', 'Segment status updated',
    'Hazard recomputed', 'Accessibility scored', 'Routes generated',
    'Vehicles matched', 'CP-SAT assignment', 'Plan proposed', 'Awaiting approval'
  ];
  
  return (
    <div className="space-y-2">
      {stages.map((stage, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full ${i <= completedStage ? 'bg-green-500' : 'bg-gray-700'}`}>
            {i <= completedStage && <CheckIcon />}
          </div>
          <span className={i <= completedStage ? 'text-white' : 'text-gray-500'}>{stage}</span>
          {timestamps[i] && <span className="text-xs text-gray-500 ml-auto">+{timestamps[i]}ms</span>}
        </div>
      ))}
    </div>
  );
}
```

### S6 — What-if Simulator

```tsx
export function WhatIfSimulator() {
  const [mutations, setMutations] = useState([]);
  const [runResult, setRunResult] = useState(null);
  
  return (
    <div className="grid grid-cols-2 gap-4 p-4 h-full">
      {/* Mutation builder */}
      <div>
        <h2>Scenario Builder</h2>
        <Button onClick={() => addMutation({type: 'close_segment'})}>Close Segment</Button>
        <Button onClick={() => addMutation({type: 'add_emergency_delivery'})}>Add Emergency</Button>
        {/* Preset scenarios */}
        <div className="mt-4">
          <Button onClick={() => loadPreset('bypass_closes')}>Preset: Bypass Also Closes</Button>
        </div>
        <Button onClick={runSimulation} className="mt-4 w-full bg-accent">Run Analysis</Button>
      </div>
      
      {/* Before/after split map + diff table */}
      {runResult ? (
        <div>
          <SplitMapView beforePlan={currentPlan} afterPlan={runResult.fork_plan} />
          <DiffTable diff={runResult.diff} />
          <div className="mt-2 p-3 bg-bg-elevated rounded">
            <p className="text-sm">{runResult.narrative}</p>
          </div>
          <Button onClick={promote} variant="outline" className="mt-2">Promote to Real Plan</Button>
        </div>
      ) : (
        <div className="flex items-center justify-center text-gray-500">
          Build a scenario and run analysis
        </div>
      )}
    </div>
  );
}
```

### S7 — Decision Log

```tsx
export function DecisionLog() {
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  return (
    <div className="grid grid-cols-3 gap-4 p-4 h-full">
      <DecisionTimeline onSelect={setSelectedRecord} />
      
      {selectedRecord && (
        <div className="col-span-2">
          {/* Full candidate set with rejection reasons */}
          <CandidateBreakdown record={selectedRecord} />
          
          {/* Explanation */}
          <div className="mt-4 p-4 bg-bg-elevated rounded">
            <h3>Explanation</h3>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap">{selectedRecord.rationale_template}</pre>
            <Button onClick={fetchLLMExplanation} size="sm" className="mt-2">
              Enhanced Explanation (AI)
            </Button>
          </div>
          
          {/* Export button */}
          <Button onClick={exportSituationReport} className="mt-4">Export Situation Report</Button>
        </div>
      )}
    </div>
  );
}
```

### S8 — Driver View (Mobile Format)

```tsx
export function DriverView() {
  const assignment = useDriverAssignment();
  
  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {/* Assignment card */}
      <div className="bg-bg-surface rounded-xl p-4">
        <h2 className="font-bold text-xl">{assignment?.vehicle_label}</h2>
        <div className="text-gray-400">{assignment?.stops.length} stops today</div>
        <div className="font-mono text-lg">ETA: {assignment?.eta_p50}–{assignment?.eta_p90}h</div>
      </div>
      
      {/* Hazard warnings */}
      {warnings.map(w => (
        <div key={w.id} className="border border-orange-500 bg-orange-900/10 rounded-lg p-3">
          <span className="text-orange-400 font-bold">⚠ {w.severity.toUpperCase()}</span>
          <p className="text-sm mt-1">{w.message}</p>
        </div>
      ))}
      
      {/* Reroute notification */}
      {rerouteNotification && (
        <div className="border-2 border-blue-500 bg-blue-900/10 rounded-lg p-4">
          <h3 className="font-bold text-blue-400">Route Changed</h3>
          <p className="text-sm">{rerouteNotification.reason}</p>
          <p className="font-mono">New ETA: {rerouteNotification.new_eta}</p>
        </div>
      )}
      
      {/* One-tap report button */}
      <Button onClick={() => setShowReport(true)} className="w-full" variant="outline">
        📍 Report Road Condition
      </Button>
    </div>
  );
}
```

---

## App Layout & Navigation

```tsx
// App.tsx
const ROUTES = [
  { path: '/dashboard',   element: <Dashboard />,          roles: ['manager','officer'] },
  { path: '/map',         element: <LiveMap />,             roles: ['manager','officer','driver'] },
  { path: '/heatmap',     element: <HeatmapScreen />,       roles: ['manager','officer'] },
  { path: '/plan',        element: <PlanDispatch />,        roles: ['manager','officer'] },
  { path: '/disruption',  element: <DisruptionConsole />,   roles: ['manager','officer'] },
  { path: '/whatif',      element: <WhatIfSimulator />,     roles: ['manager','officer'] },
  { path: '/log',         element: <DecisionLog />,         roles: ['manager','officer'] },
  { path: '/driver',      element: <DriverView />,          roles: ['driver'] },
  { path: '/report',      element: <CitizenReportForm />,   roles: ['*'] },
];

// Keyboard shortcut: M → go to map (Section 29.10)
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'm' && !e.ctrlKey) navigate('/map');
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, []);
```

---

## Acceptance Criteria

- [ ] Dark command-centre aesthetic — looks like a real ops platform
- [ ] Vehicle-class toggle on S2 and S3 recolours the map in < 500ms without page reload
- [ ] Score chips show decomposition on hover everywhere they appear
- [ ] `bandToColor` uses identical colour values on map, chips, tables, and alerts
- [ ] WS disconnect shows "● polling" indicator in SimClock; reconnects automatically
- [ ] S5 cascade stepper animates 10 steps to completion in < 5 seconds after a landslide event
- [ ] Approval gate in S5 is impossible to miss (prominent border, sticky to viewport)
- [ ] S6 simulation runs return diff in < 3 seconds and display the before/after split map
- [ ] S4 candidate table shows rejected routes with grey strikethrough + rejection reason
- [ ] `POST /demo/reset` followed by refresh leaves UI in clean initial state
- [ ] Driver view (S8) renders correctly on 390px width (mobile-first)
