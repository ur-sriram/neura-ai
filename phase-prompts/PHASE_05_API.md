# PHASE 05 — OPTIMIZATION ENGINE & REST API
**Track:** B | **Hours:** 10–20 | **Agent:** Backend Agent (continued)  
**Output:** All REST API endpoints + WebSocket + demo endpoints, all wired and tested  
**Master spec refs:** Section 26 (API Architecture), Section 24 (Optimization Architecture), Section 19 (What-if Simulator)

---

## Context

You are completing the **REST API and optimization endpoints** for NE-Setu. The backend core pipeline (Phase 03) is done. Now wire all API routes, implement the what-if simulator, and add the demo control endpoints.

**All endpoints must:** validate inputs with Pydantic, enforce role-based access via JWT, write to `audit_log`, return `sim_time` + `wall_time` on every mutating response.

---

## Auth Endpoints (`routers/auth.py`)

```python
POST /auth/login          → {access_token, token_type, user: {id, name, role}}
GET  /auth/me             → {id, name, role}
```

JWT payload: `{sub: user_id, role: role, exp: ...}`. Short-lived (4h) + refresh token (demo: no expiry to avoid mid-demo failures).

---

## Map Endpoints (`routers/map.py`)

```python
# Static road network as GeoJSON (cached — never changes after ETL)
GET /map/network?bbox=25.3,91.3,26.3,92.6&vclass=heavy
Response: GeoJSON FeatureCollection, each feature has:
  - properties: {segment_id, highway_class, surface, bridge, maxweight, length_m, mean_grade}

# Dynamic LNS overlay (polled every 5s or received via WS push)
GET /map/network/overlay?version=0&vclass=heavy
Response: [{segment_id, status, a_score, p_landslide_24h, confidence, contributing_factors}]
# Returns only segments changed since the requested version (delta)

# Basemap tiles (served by nginx/tiles service, not FastAPI)
GET /tiles/{z}/{x}/{y}.png  → static tile files
```

---

## Accessibility Endpoints (`routers/accessibility.py`)

```python
GET /accessibility/segments/{id}/score?vclass=heavy&sim_hour=0
Response: {
  segment_id, vehicle_class, sim_hour,
  a_score, status, confidence,
  contributing_factors: {hazard, status, surface, terrain, weather, final_score},
  p_landslide: {6h, 12h, 24h, 48h, 72h},
  p_flood: {6h, 12h, 24h, 48h, 72h}
}

GET /accessibility/heatmap?vclass=heavy&horizon=0
Response: [{h3_index, a_score, band, geometry_wkt}]

GET /accessibility/locations/{id}?vclass=heavy
Response: {
  location_id, name,
  redundancy_count: int,      # number of distinct routes to nearest depot
  time_to_isolation_h: float, # hours until isolation under current forecast
  a_score_now: float,
  a_score_24h: float
}
```

---

## Events Endpoint (`routers/events.py`)

```python
POST /events
Body: {
  type: "landslide"|"flood"|"report"|"weather"|"breakdown"|"surge"|"scenario",
  payload: {...},               # type-specific
  source_type: "control_room"|"driver"|"citizen"|"system",
  dedup_key: str,               # required for idempotency
  segment_ids?: int[],          # if known
  lat?: float, lon?: float      # for geo-matching
}
Response: {event_id, status: "ingested"|"duplicate", sim_time, wall_time}
# Triggers cascade as background task

GET /events?from_sim=0&to_sim=96&type=landslide
Response: [{event_id, type, payload, source_type, source_trust, corroboration_count, received_sim}]

POST /events/{id}/corroborate    → increments corroboration_count
POST /events/{id}/resolve        → marks event resolved (road re-opened)
```

---

## Vehicles & Deliveries (`routers/fleet.py`)

```python
GET /vehicles               → [{id, label, class, status, assignment_id, current_geom}]
GET /vehicles/{id}          → full vehicle detail + current assignment

GET /deliveries             → [{id, cargo_code, dest_name, priority_score, status, is_emergency, deadline_sim}]
POST /deliveries            # Create delivery (supports emergency flag + passenger-cargo type)
Body: {cargo_code, weight_kg, volume_m3, dest_id, deadline_sim, is_emergency, is_passenger}
POST /deliveries/{id}/defer  # Officer defers a delivery
```

---

## Optimization Endpoints (`routers/optimization.py`)

```python
POST /optimization/plan?mode=smart|naive
# mode=smart: full CP-SAT joint optimization
# mode=naive: shortest-distance baseline (for comparator)
Response: {
  plan_id,
  status: "PROPOSED"|"APPROVED",
  objective_value,
  assignments: [...],
  deferred: [...],
  decision_record_id,
  sim_time, wall_time
}

GET /plans                  → [plan summaries]
GET /plans/{id}             → full plan with assignments, route candidates, rationale
POST /plans/{id}/approve    # Human gate — changes status PROPOSED → APPROVED
POST /plans/{id}/reject     # Human gate — with note

GET /plans/compare?plan_a={id}&plan_b={id}
# Returns delta: ETA difference, risk difference, deliveries succeeded, deliveries failed
```

---

## What-if Simulator (`routers/simulation.py`)

```python
POST /simulation/runs
Body: {
  mutations: [
    {type: "close_segment", segment_id: int},
    {type: "set_weather", zone: str, rain_mm_h: float},
    {type: "disable_vehicle", vehicle_id: str},
    {type: "add_emergency_delivery", dest_id: str, cargo_code: str},
    {type: "demand_surge", cluster_h3: str, multiplier: float}
  ],
  time_offset_h?: int        # simulate starting from now + N hours
}
Response: {run_id, status: "running"}

GET /simulation/runs/{id}
Response: {
  run_id, status: "done"|"running"|"failed",
  diff: {
    assignments_changed: [...],
    deliveries_deferred: [...],
    eta_deltas: [{delivery_id, old_eta, new_eta, delta_h}],
    risk_deltas: [{delivery_id, old_risk, new_risk}],
    cluster_accessibility_deltas: [{h3_index, old_score, new_score, band_change}]
  },
  narrative: str,            # template-rendered summary
  fork_plan_id: str          # the new plan on the fork (promotable)
}

POST /simulation/runs/{id}/promote   # Promote fork plan to real plan
```

**What-if Implementation (Section 19):**
```python
async def run_simulation(run_id: UUID, mutations: list, time_offset: int = 0):
    """
    FORK → APPLY → PROPAGATE → DIFF
    """
    # 1. FORK: copy-on-write snapshot of current LNS + fleet + active plans
    fork_sim_hour = sim_clock.sim_hour + time_offset
    fork = await create_lns_fork(db, fork_sim_hour)   # deep copy in Postgres JSON
    
    # 2. APPLY: mutations to the fork
    for mutation in mutations:
        if mutation.type == 'close_segment':
            await set_segment_status(fork, mutation.segment_id, 'CLOSED', trust=1.0)
        elif mutation.type == 'set_weather':
            await override_weather(fork, mutation.zone, mutation.rain_mm_h)
        # ... etc
    
    # 3. PROPAGATE: run full pipeline on fork (hazard → accessibility → route → CP-SAT)
    fork_plan = await run_cascade_on_fork(db, fork, fork_sim_hour)
    
    # 4. DIFF: compare fork_plan vs current active plan
    diff = compute_plan_diff(current_plan, fork_plan)
    
    # 5. Store result + narrative
    await save_simulation_result(db, run_id, diff, fork_plan)
    
    # < 3 seconds total (budget: Section 21.4)
```

---

## Emergency Mode Endpoint

```python
POST /emergency/mode
Body: {active: bool, cluster_h3?: str}
# Switches optimization objective weights (Section 12.6):
# w_risk: 0.25 → 0.40, w_reliab: 0.15 → 0.25, w_time: 0.30 → 0.20

GET /emergency/impact?cluster=<h3_index>
Response: {
  at_risk_locations: [...],
  in_transit_vehicles: [...],
  critical_deliveries_at_risk: [...],
  estimated_isolation_h: float
}
```

---

## Demo Control Endpoints (`routers/demo.py`)

```python
POST /demo/reset
# Wipes all runtime tables (events, overlays, plans, assignments, etc.)
# Re-seeds from immutable seed data
# Resets sim_clock to sim_hour=0
# Re-runs initial LNS computation
# < 30 seconds — tested in acceptance criteria

POST /demo/scenario/{scenario_id}
# Loads and starts a scripted scenario
# scenario_id: "scn-01" (Monsoon Cascade — the main demo)
# Injects pre-scripted events at pre-scripted sim_hours

POST /demo/clock
Body: {action: "play"|"pause"|"seek"|"speed", value?: int}
# action=play → starts sim_clock advancing
# action=pause → pauses
# action=speed → sets multiplier (1, 5, 10, 20)
# action=seek → jumps to sim_hour=value
```

**SCN-01 Monsoon Cascade Script:**
```python
SCN_01_EVENTS = [
    # Hour 0: calm start — no events
    # Hour 18: weather intensifies in Khasi hills
    {"sim_hour": 18, "type": "weather", "payload": {"zone": "khasi_hills", "rain_mm_h": 12.0}},
    # Hour 30: antecedent rain saturates slopes — heatmap degrades
    {"sim_hour": 30, "type": "weather", "payload": {"zone": "khasi_hills", "rain_mm_h": 18.0}},
    # Hour 36: LANDSLIDE — the centrepiece event
    {"sim_hour": 36, "type": "landslide",
     "payload": {"segment_id": SCRIPTED_TRUNK_SEGMENT_ID, "source_type": "control_room",
                 "description": "Landslide confirmed on NH-6 near Nongstoin"},
     "source_type": "control_room", "source_trust": 0.95,
     "dedup_key": "scn01_landslide_nh6"},
    # Hour 42: emergency medicine delivery created
    {"sim_hour": 42, "type": "scenario",
     "payload": {"action": "create_emergency_delivery",
                 "cargo_code": "MEDICAL", "dest": "Civil Hospital Jowai", "deadline_h": 4}},
    # Hour 60: rain subsides — recovery begins
    {"sim_hour": 60, "type": "weather", "payload": {"zone": "khasi_hills", "rain_mm_h": 2.0}},
    # Hour 72: road re-opens (corroborated)
    {"sim_hour": 72, "type": "scenario",
     "payload": {"action": "reopen_segment", "segment_id": SCRIPTED_TRUNK_SEGMENT_ID}},
]
```

---

## Predictions Endpoint (`routers/predictions.py`)

```python
GET /predictions/hazard?segment_id={id}&sim_hour={h}
Response: {p_landslide: {6h, 12h, 24h, 48h, 72h}, p_flood: {...}, confidence: float}

GET /predictions/eta?route_id={id}&vclass=heavy
Response: {eta_p50_h: float, eta_p90_h: float, confidence: float, model_mode: "ml"|"baseline"}

GET /predictions/demand?h3_index={idx}&horizon_h=24
Response: {expected_uplift: float, confidence: float, breakdown_by_commodity: {...}}
```

---

## Analytics Endpoint (`routers/analytics.py`)

```python
GET /analytics/kpi
Response: {
  active_vehicles: int,
  deliveries_by_status: {planned: int, in_transit: int, delivered: int, deferred: int},
  at_risk_deliveries: int,
  road_blockages: {open: int, suspected: int, closed: int},
  emergency_requests: int,
  mean_network_accessibility: {heavy: float, 4x4: float}
}

GET /analytics/model-performance
Response: {
  eta_mae_last_10: float,          # MAE of recent ETA predictions vs actuals
  closure_precision: float,         # closure predictions that were correct
  closure_recall: float,            # actual closures that were predicted
  model_mode: "ml"|"baseline"
}
```

---

## AI/XAI Endpoint (`routers/ai.py`)

```python
POST /ai/explain
Body: {decision_id: str}
Response: {
  explanation: str,          # template prose (always)
  enhanced: str|null,        # LLM prose (only if LLM_API_KEY configured)
  source: "template"|"llm",
  decision_record: {...}     # full record
}

POST /ai/ask    # SHOULD — natural language query over state
Body: {question: str}
Response: {answer: str, supporting_records: [...]}
```

---

## WebSocket (`app/main.py`)

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    user = verify_jwt(token)  # auth on WS connect
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()  # keep-alive pings
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
```

---

## Acceptance Criteria

- [ ] All endpoints return correct HTTP status codes (401 without token, 403 wrong role, 422 bad body)
- [ ] `POST /demo/reset` completes in < 30s and leaves database in clean initial state
- [ ] `POST /demo/scenario/scn-01` + `POST /demo/clock {action:"play", value:20}` runs the Monsoon Cascade
- [ ] `POST /simulation/runs` with `{mutations: [{type:"close_segment", segment_id:X}]}` returns diff in < 3s
- [ ] `POST /optimization/plan?mode=naive` returns different (worse) plan than `mode=smart`
- [ ] WS clients receive `lns_update` message within 1s of `POST /events` for a CLOSED segment
- [ ] `GET /map/network/overlay?version=N` returns only delta since version N (not full dataset)
