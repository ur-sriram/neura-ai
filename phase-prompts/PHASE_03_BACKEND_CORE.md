# PHASE 03 — BACKEND CORE & PIPELINE ENGINES
**Track:** B | **Hours:** 4–14 | **Agent:** Backend Agent  
**Output:** All 8 deterministic pipeline stages implemented as Python modules, wired into FastAPI  
**Master spec refs:** Section 4.4 (8 pipeline stages), Sections 11–19, Section 21 (architecture), Section 26 (API)

---

## Context

You are building the **backend intelligence pipeline** for NE-Setu. This is the heart of the system — 8 deterministic pipeline stages that run in sequence when anything changes in the network. The pipeline must be:
- **Deterministic:** identical inputs → identical outputs (fixed seeds everywhere)
- **Fast:** full cascade < 5 seconds (Section 21.4)
- **Fallback-safe:** every ML model has a T0 deterministic fallback
- **Auditable:** every stage writes to `decision_records`

**Tech:** Python 3.11, FastAPI (async), SQLAlchemy 2.x async, NetworkX, OR-Tools, NumPy.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, routers, lifespan
│   ├── config.py            # settings via pydantic-settings
│   ├── database.py          # async SQLAlchemy engine + session
│   ├── models/              # SQLAlchemy ORM (from Phase 01)
│   ├── schemas/             # Pydantic request/response schemas
│   ├── pipeline/
│   │   ├── event_ingestor.py      # Stage: SENSE + UNDERSTAND
│   │   ├── hazard_engine.py       # Stage: PREDICT (hazard)
│   │   ├── accessibility_engine.py # Stage: ASSESS → writes LNS
│   │   ├── route_engine.py        # Stage: OPTIMIZE (routes)
│   │   ├── vehicle_matcher.py     # Stage: OPTIMIZE (vehicle suitability)
│   │   ├── priority_engine.py     # Stage: ASSESS (priorities)
│   │   ├── plan_optimizer.py      # Stage: OPTIMIZE (CP-SAT)
│   │   ├── explanation_layer.py   # Stage: XAI (template + LLM)
│   │   └── cascade.py             # Orchestrates full 9-stage loop
│   ├── routers/
│   │   ├── auth.py
│   │   ├── map.py
│   │   ├── events.py
│   │   ├── plans.py
│   │   ├── optimization.py
│   │   ├── simulation.py
│   │   ├── demo.py
│   │   └── ...
│   ├── services/
│   │   ├── sim_clock.py     # simulation time management
│   │   ├── websocket.py     # WS fan-out manager
│   │   └── providers.py     # WeatherProvider interface (snapshot vs live)
│   └── ml/
│       ├── hazard_model.py  # loads hazard_model.joblib + T1 fallback
│       └── eta_model.py     # loads eta_model.joblib + T0 baseline
├── models/                  # .joblib artifacts (from Phase 04)
├── data/
│   └── graph.pkl            # NetworkX graph (from Phase 02)
└── requirements.txt
```

---

## Stage 1 & 2: Event Ingestor (`pipeline/event_ingestor.py`)

**Responsibility:** Single entry point for all incoming signals. Validates, deduplicates, trust-weights, corroborates, and maps to road segments.

```python
SOURCE_TRUST = {
    'control_room': 0.95,
    'government_api': 0.90,
    'driver': 0.75,
    'citizen': 0.30,
    'weather_system': 0.85,
    'system': 1.00,
}

CORROBORATION_THRESHOLD_FOR_CLOSE = 2  # min corroborating reports to → CLOSED

async def ingest_event(db, payload: EventCreate) -> Event:
    """
    1. Check dedup_key — if exists, increment corroboration_count and return
    2. Validate payload schema
    3. Assign source_trust from SOURCE_TRUST map
    4. Geo-match to affected road_segments (spatial query via PostGIS)
    5. Apply three-state transition:
       - Single low-trust report → SUSPECTED (if currently OPEN)
       - Single high-trust report (≥0.85) → CLOSED
       - Corroboration_count ≥ threshold → CLOSED
    6. Insert Event + EventSegmentImpacts
    7. Trigger cascade (async background task)
    """
```

**Three-state road model transitions:**
```
OPEN → SUSPECTED: any report, low trust, or P_landslide crosses 0.6 threshold
OPEN → CLOSED:   high-trust source (≥0.85) OR corroboration ≥ 2 reports
SUSPECTED → CLOSED: corroboration threshold met OR trusted confirmation
SUSPECTED → OPEN:   decay after 2h sim time without corroboration OR verified-clear
CLOSED → OPEN:   explicit re-open event from trusted source
```

---

## Stage 3: Hazard Engine (`pipeline/hazard_engine.py`)

**Responsibility:** Compute landslide and flood closure probabilities per segment per horizon.

```python
HORIZONS = [6, 12, 24, 48, 72]  # hours

async def compute_hazard_forecasts(db, sim_hour: int) -> None:
    """
    For all road segments, compute P(closure) at each horizon.
    
    Method: Two-layer (T1 physical + T2 calibrated if model available)
    
    T1 Physical susceptibility index:
      S(seg, t) = suscept_landslide * rain_saturation_factor(t)
      
      rain_saturation_factor = min(1.0, antecedent_24h_mm / 80.0)
                             + 0.5 * min(1.0, current_rain_mm_h / 15.0)
    
    T2 Calibrated probability (if model available):
      P = logistic_model.predict(S, horizon, slope, elevation)
    
    Fallback (if model fails):
      P = S * horizon_decay[horizon]
      horizon_decay = {6:0.4, 12:0.6, 24:0.8, 48:0.9, 72:1.0}
    """
    weather = await get_weather_at(db, sim_hour)
    antecedent = await get_antecedent_rainfall(db, sim_hour, hours=24)
    segments = await get_all_segments(db)
    
    for seg in segments:
        rain_factor = min(1.0, antecedent / 80.0) + 0.5 * min(1.0, weather.rain_mm_h / 15.0)
        S_landslide = seg.suscept_landslide * rain_factor
        S_flood = seg.suscept_flood * min(1.0, antecedent / 60.0)
        
        for h in HORIZONS:
            decay = h / 72.0
            p_ls = hazard_model.predict(S_landslide, h) if hazard_model else S_landslide * decay
            p_fl = S_flood * decay
            # Insert hazard_forecasts row
```

---

## Stage 4: Accessibility Engine (`pipeline/accessibility_engine.py`)

**Responsibility:** Compute Accessibility Score per segment × vehicle class, write LNS overlays.

```python
VEHICLE_CLASSES = ['heavy', 'mini', '4x4', 'special']

VEHICLE_WEIGHTS_KG = {'heavy': 10000, 'mini': 3500, '4x4': 2500, 'special': 3000}
GRADE_COMFORT = {'heavy': 5.0, 'mini': 7.0, '4x4': 12.0, 'special': 8.0}

SURFACE_FACTORS = {
    'paved':  {'heavy':1.0, 'mini':1.0, '4x4':1.0, 'special':1.0},
    'gravel': {'heavy':0.75,'mini':0.85,'4x4':0.92,'special':0.88},
    'dirt':   {'heavy':0.45,'mini':0.65,'4x4':0.85,'special':0.75},
    'track':  {'heavy':0.30,'mini':0.50,'4x4':0.90,'special':0.80},
    'unknown':{'heavy':0.60,'mini':0.70,'4x4':0.85,'special':0.80},
}

STATUS_FACTOR = {'OPEN': 1.0, 'SUSPECTED': 0.4, 'CLOSED': 0.0}

def compute_accessibility(segment, vclass, weather_rain_mm, hazard_p, status):
    """Section 13.2 formula. Returns (score, contributing_factors dict)."""
    
    # Hard check: weight restriction
    if segment.maxweight and VEHICLE_WEIGHTS_KG[vclass] > segment.maxweight * 1000:
        return 0.0, {'rejection': f'maxweight {segment.maxweight}t < vehicle {VEHICLE_WEIGHTS_KG[vclass]/1000}t'}
    
    f_hazard  = 1 - 0.9 * hazard_p
    f_status  = STATUS_FACTOR[status]
    f_surface = SURFACE_FACTORS.get(segment.surface, SURFACE_FACTORS['unknown'])[vclass]
    f_terrain = max(0.0, 1 - 0.08 * max(0, abs(segment.mean_grade) - GRADE_COMFORT[vclass]))
    f_weather = 1 - 0.05 * min(weather_rain_mm, 10.0)
    
    score = 100 * f_hazard * f_status * f_surface * f_terrain * f_weather
    score = max(0.0, min(100.0, score))
    
    factors = {
        'hazard': round(f_hazard, 3),
        'status': f_status,
        'surface': round(f_surface, 3),
        'terrain': round(f_terrain, 3),
        'weather': round(f_weather, 3),
        'final_score': round(score, 1)
    }
    return score, factors

async def update_lns(db, sim_hour: int) -> int:
    """
    Recompute all segment overlays for the current sim_hour.
    Returns the new lns_version number.
    """
    # Get new version number
    new_version = await get_next_lns_version(db)
    
    # Batch compute all segments (vectorised with NumPy where possible)
    # Insert all new segment_overlays rows
    # Update h3_cells aggregation
    # Notify WebSocket clients of LNS version bump
    # Return new_version
```

**H3 Aggregation:**
```python
def aggregate_to_hex(segment_scores: dict, h3_index: str) -> dict:
    """Length-weighted mean accessibility per vehicle class for a hex."""
    # Group segments by h3_index, compute weighted mean
    # Assign band: 80-100=green, 50-79=yellow, 30-49=orange, 0-29=red
    BANDS = [(80,'green'), (50,'yellow'), (30,'orange'), (0,'red')]
```

---

## Stage 5: Route Engine (`pipeline/route_engine.py`)

**Responsibility:** Generate k diverse feasible candidate routes for a (delivery, vehicle) pair.

```python
HARD_CONSTRAINTS = {
    'status_closed': lambda seg, overlay: overlay.status == 'CLOSED',
    'max_weight': lambda seg, vehicle: seg.maxweight and vehicle.weight_kg > seg.maxweight * 1000,
    'max_grade': lambda seg, vehicle: abs(seg.mean_grade) > GRADE_COMFORT[vehicle.class_] * 1.5,
    'access': lambda seg, mode: seg.access == 'private' and mode != 'emergency',
}

def build_weighted_graph(G_base, lns_overlays, vehicle, weather_rain_mm, sim_hour):
    """
    Copy base graph, apply LNS edge weights.
    Edges that violate hard constraints get weight = infinity (removed from routing).
    """
    G = G_base.copy()
    for edge_id, overlay in lns_overlays.items():
        segment = overlay.segment
        
        # Hard constraint check
        for constraint_name, check_fn in HARD_CONSTRAINTS.items():
            if check_fn(segment, overlay):  # or against vehicle
                G[u][v][key]['weight'] = float('inf')
                continue
        
        # Soft cost = RouteCost formula (Section 12.3)
        eta_p50 = eta_model.predict(segment, vehicle.class_, weather_rain_mm)
        eta_p90 = eta_p50 * (1 + 0.3 * (1 - overlay.confidence))  # uncertainty band
        p_closure = getattr(overlay, f'p_landslide_{horizon}h', 0.0)
        
        cost = (
            0.30 * normalise(eta_p50) +
            0.15 * normalise(eta_p90 - eta_p50) +
            0.25 * p_closure +
            0.10 * surface_penalty(segment.surface, vehicle.class_) +
            0.10 * grade_penalty(segment.mean_grade, vehicle.class_) +
            0.05 * (1 - overlay.confidence)
        )
        G[u][v][key]['weight'] = cost
    return G

def get_k_diverse_routes(G, origin, destination, k=3):
    """
    Generate k diverse routes using iterative edge penalisation.
    Route 1: standard Dijkstra shortest path.
    Routes 2..k: re-solve with segments of previous routes penalised ×3.
    """
    routes = []
    G_iter = G.copy()
    
    for i in range(k):
        try:
            path = nx.shortest_path(G_iter, origin, destination, weight='weight')
            routes.append(path)
            # Penalise segments of this route for diversity
            for u, v in zip(path[:-1], path[1:]):
                G_iter[u][v][0]['weight'] *= 3.0
        except nx.NetworkXNoPath:
            break
    
    return routes
```

---

## Stage 6: Vehicle Matcher (`pipeline/vehicle_matcher.py`)

**Responsibility:** Score vehicle suitability for each (delivery, destination, conditions) pair.

```python
def score_vehicle_suitability(vehicle, delivery, dest_accessibility, route_max_grade):
    """Returns suitability score [0,1] — 0 = infeasible."""
    
    # Hard checks
    if delivery.weight_kg > vehicle.capacity_kg: return 0.0
    if delivery.needs_cold_chain and not vehicle.cold_chain: return 0.0
    if delivery.is_passenger and not vehicle.accessible: return 0.0
    if dest_accessibility[vehicle.class_] == 0.0: return 0.0  # unreachable
    
    # Soft score
    capacity_util = delivery.weight_kg / vehicle.capacity_kg  # prefer right-sized
    terrain_fit = 1.0 if route_max_grade <= GRADE_COMFORT[vehicle.class_] else 0.7
    
    return 0.5 * (1 - abs(capacity_util - 0.6)) + 0.5 * terrain_fit
```

---

## Stage 7: Plan Optimizer (`pipeline/plan_optimizer.py`)

**Responsibility:** Joint cargo→vehicle→route assignment using OR-Tools CP-SAT.

```python
from ortools.sat.python import cp_model

def optimise_plan(deliveries, vehicles, route_candidates, mode='NORMAL'):
    """
    Section 12.4 CP-SAT model.
    Returns assigned Plan with DecisionRecord.
    """
    model = cp_model.CpModel()
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0  # anytime — always returns incumbent
    solver.parameters.random_seed = 42            # determinism
    
    # Decision variables: x[d][v] = 1 if delivery d assigned to vehicle v
    x = {}
    for d in deliveries:
        for v in vehicles:
            x[d.id, v.id] = model.NewBoolVar(f'x_{d.id}_{v.id}')
    
    # Each delivery assigned to exactly one vehicle (or marked deferred)
    deferred = {}
    for d in deliveries:
        deferred[d.id] = model.NewBoolVar(f'deferred_{d.id}')
        model.Add(sum(x[d.id, v.id] for v in vehicles) + deferred[d.id] == 1)
    
    # Vehicle capacity constraints
    for v in vehicles:
        model.Add(
            sum(x[d.id, v.id] * int(d.weight_kg) for d in deliveries) <= int(v.capacity_kg)
        )
    
    # Objective: minimise total route cost + heavy penalty for unassigned priority deliveries
    EMERGENCY_UNASSIGNED_PENALTY = 10000
    ROUTINE_UNASSIGNED_PENALTY = 100
    EMERGENCY_WEIGHT = 2.0 if mode == 'EMERGENCY' else 1.0
    
    obj_terms = []
    for d in deliveries:
        for v in vehicles:
            if (d.id, v.id) in route_candidates:
                cost = int(route_candidates[d.id, v.id].cost_total * 1000)
                obj_terms.append(x[d.id, v.id] * cost)
        
        penalty = EMERGENCY_UNASSIGNED_PENALTY if d.is_emergency else ROUTINE_UNASSIGNED_PENALTY
        obj_terms.append(deferred[d.id] * penalty)
    
    model.Minimize(sum(obj_terms))
    
    status = solver.Solve(model)
    
    # Extract solution + build Plan + DecisionRecord
    # Mark emergency deliveries that are deferred as critical alerts
```

**Naive baseline** (`optimise_plan(mode='naive')`): assign by spare capacity, route by shortest distance only. Used for the Smart vs Naive comparator screen.

---

## Stage 8: Explanation Layer (`pipeline/explanation_layer.py`)

**Responsibility:** Render DecisionRecord into readable prose. Templates always, LLM optional.

```python
def render_explanation(decision_record: DecisionRecord) -> str:
    """
    Template-based explanation — always available, no API dependency.
    Produces the exact format shown in Section 35.1 of the master spec.
    """
    selected = decision_record.selection
    rejected = [c for c in decision_record.candidates if not c['chosen']]
    
    parts = [f"**{selected['route_label']} recommended** because:"]
    
    for r in rejected:
        if r['rejection_reason']:
            parts.append(f"- {r['route_label']} — {r['rejection_reason']}")
        else:
            parts.append(f"- {r['route_label']} — cost {r['cost_total']:.2f} vs selected {selected['cost_total']:.2f}")
    
    parts.append(
        f"**Selected: {selected['route_label']}** — "
        f"ETA {selected['eta_p50']}–{selected['eta_p90']}h, "
        f"risk {selected['risk']:.0%}, "
        f"confidence {decision_record.confidence:.0%}"
    )
    
    return "\n".join(parts)
```

---

## Cascade Orchestrator (`pipeline/cascade.py`)

The 9-stage loop — triggered by any event:

```python
async def run_cascade(db, trigger_event_id: UUID, sim_hour: int):
    """
    SENSE → UNDERSTAND (done by event_ingestor before this is called)
    PREDICT → ASSESS → OPTIMIZE → APPROVE → ACT → MONITOR → RECALCULATE
    """
    async with CascadeTimer() as timer:
        # PREDICT
        await hazard_engine.compute_hazard_forecasts(db, sim_hour)
        timer.checkpoint("hazard")
        
        # ASSESS → writes LNS
        new_lns_version = await accessibility_engine.update_lns(db, sim_hour)
        timer.checkpoint("accessibility")
        
        # OPTIMIZE
        deliveries = await get_active_deliveries(db)
        vehicles = await get_available_vehicles(db)
        candidates = await route_engine.generate_all_candidates(db, deliveries, vehicles, new_lns_version)
        plan = await plan_optimizer.optimise_plan(deliveries, vehicles, candidates)
        timer.checkpoint("optimization")
        
        # APPROVE — determine gate
        requires_human = needs_human_approval(plan, trigger_event_id)
        if not requires_human:
            plan.status = 'APPROVED'
        else:
            plan.status = 'PROPOSED'
            # Send WS notification: plan awaiting approval
        
        # ACT (if auto-approved or after human approval)
        # MONITOR: record cascade timing + decision
        await record_decision(db, plan, trigger_event_id, timer.checkpoints)
        
        # Push LNS version bump to all WS clients
        await ws_manager.broadcast({'type': 'lns_update', 'version': new_lns_version, 'sim_time': sim_hour})
    
    assert timer.total < 5.0, f"Cascade took {timer.total:.1f}s — exceeds 5s budget"
```

**Auto-approve vs human-gate** (Section 33.4):
```python
def needs_human_approval(plan, trigger_event):
    return any([
        plan.mode == 'EMERGENCY',
        any(a.risk_score > 0.7 for a in plan.assignments),
        any(d.is_emergency for d in plan.deferred_deliveries),
        trigger_event and trigger_event.type == 'landslide',
    ])
```

---

## Simulation Clock (`services/sim_clock.py`)

```python
class SimClock:
    """Authoritative simulation time. Drives weather + vehicle positions."""
    
    def __init__(self, start_hour=0, speed_multiplier=1):
        self.sim_hour = start_hour     # integer hours since epoch
        self.speed = speed_multiplier  # 1=realtime, 20=demo speed
        self._running = False
    
    async def tick(self):
        """Called by background task every (3600/speed) real seconds."""
        self.sim_hour += 1
        await trigger_weather_update(self.sim_hour)
        await trigger_vehicle_positions(self.sim_hour)
        await ws_manager.broadcast({'type': 'clock_tick', 'sim_time': self.sim_hour})
    
    def set_speed(self, multiplier: int):
        self.speed = multiplier  # 1, 5, 10, 20
    
    async def seek(self, target_hour: int):
        """Jump to a specific sim_hour (for demo scrubbing)."""
        self.sim_hour = target_hour
        await recompute_full_state(target_hour)
```

---

## WebSocket Manager (`services/websocket.py`)

```python
class WSManager:
    def __init__(self):
        self.connections: list[WebSocket] = []
    
    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)
    
    async def broadcast(self, message: dict):
        for conn in self.connections[:]:  # copy to avoid mutation during iteration
            try:
                await conn.send_json(message)
            except:
                self.connections.remove(conn)
```

**WS message types:**
- `lns_update` → `{type, version, sim_time}` — triggers map layer refresh
- `clock_tick` → `{type, sim_time}`
- `event_ingested` → `{type, event_id, segment_ids, status}`
- `plan_proposed` → `{type, plan_id, requires_approval}`
- `plan_approved` → `{type, plan_id}`
- `alert` → `{type, severity, message, cluster}`

---

## Acceptance Criteria

- [ ] `POST /events` → triggers full cascade in < 5 seconds
- [ ] `GET /accessibility/segments/{id}/score?vclass=heavy` returns score + full `contributing_factors`
- [ ] A 10-tonne truck (heavy class) scores 0 on a segment with `maxweight=5t`
- [ ] Identical event posted twice is deduplicated (dedup_key check)
- [ ] SUSPECTED road: cost multiplied, not removed from routing
- [ ] CLOSED road: removed from routing (infinite weight)
- [ ] Cascade writes a `decision_records` row for every plan generated
- [ ] Determinism test: same event posted after `/demo/reset` produces same plan_id's routes

---

## Key Invariants (Machine-Checked in Phase 08)

1. **No plan ever routes a vehicle over a CLOSED segment or a segment violating maxweight**
2. **Identical inputs → identical plan** (determinism — fixed seeds, no randomness at runtime)
