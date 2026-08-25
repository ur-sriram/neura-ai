# AI Smart Logistics & Accessibility Platform - NER India

A FastAPI backend with multi-agent AI orchestration for the North Eastern Region (NER) of India. Built for SIH hackathon MVP with production-ready patterns and insight-derived adaptive intelligence features.

> **Core Loop**: Predict → Assess → Optimize → Act → Recalculate

## Tech Stack

- **Python 3.13** - Runtime
- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **LangGraph** - Multi-agent state orchestration
- **LangChain** - LLM chaining
- **Google Generative AI (Gemini)** - Multimodal AI
- **Pydantic v2** - Data validation
- **NetworkX** - Route optimization (A* algorithm)
- **aiohttp** - Async HTTP client
- **Open-Meteo API** - Live weather data integration
- **Nominatim API** - Geocoding and location search integration
- **httpx** - Async HTTP requests for external APIs

## Features

### Multi-Agent System (LangGraph)
- **SupervisorAgent** - Routes queries to specialist agents
- **LogisticsAgent** - Route optimization, shipment planning with terrain/weather awareness
- **AccessibilityAgent** - Wheelchair route planning, accessibility scoring
- **EmergencyAgent** - Disaster response, evacuation routing
- **CommunityAgent** - Feedback analysis, local partner matching

### Real-Time Integrations & Open Data
- **Live Weather Feed (Open-Meteo)** - Real-time temperature, wind, and precipitation integration.
- **Dynamic Risk Warning Engine** - Dynamic calculation of landslide and flood warnings by fusing live weather metrics (Open-Meteo) with geographic risk profiles of the NER states.
- **Geocoding & Interactive Maps** - Integrates Nominatim Search and multiple map layers (Standard OpenStreetMap, Satellite, Terrain) for the logistics and accessibility map views.
- **India Open Data Portal (`data.gov.in` style)** - Comprehensive API endpoints providing sandbox demographic data, infrastructure metrics, healthcare availability, education networks, and centrally-sponsored scheme coverage.

### Adaptive Intelligence (MVP v1.1 — insight-derived)

#### 1. Weighted 7-Factor Route Scoring
Not just shortest path. A composite cost formula that decides the *safest/fastest/most practical* route:
```
Composite Score =
    0.35 · Travel Time
  + 0.25 · Risk Score
  + 0.15 · Road Condition Penalty
  + 0.10 · Weather + Event Penalty
  + 0.10 · Terrain Difficulty
  + 0.05 · Vehicle Mismatch Penalty
  − 0.10 · Emergency Priority Bonus
```
Lower is better. Auto-attached to every `/optimize` response as `score_breakdown` with human-readable interpretation.

#### 2. Accessibility 0–100 Scale (Road Accessibility Agent)
```
Score = 100 − (0.20·Weather + 0.22·Landslide + 0.20·Roads + 0.10·Traffic + 0.28·Terrain)
```
Tiers: **80+ Highly Accessible | 50–79 Moderate | 30–49 Difficult | <30 Critical**.
Per-city output also includes vehicle suitability matrix (heavy_truck / mini_truck / 4x4 / ambulance / bike).

#### 3. Event Ingestion API (Road Block / Landslide / Flood Events)
Multi-source disruption ingestion: admin_panel, driver_report, district_control_room, police, news, satellite, sensor_iot, simulated.
- Ingested events automatically **penalize or block** road segments in the route graph.
- Severity-based weight multipliers: low ×1.8, medium ×5, high ×15, critical ×100.
- Cities blocked by high/critical events are removed from the graph entirely.

#### 4. Vehicle Intelligence Agent (Cargo-to-Vehicle Matching)
> *"Medicine + remote mountain village + heavy rain = 4x4 + safer route, NOT heavy truck + mountain route"*

Catalog of 6 vehicle profiles scored against: cargo weight, terrain (hilly state detection), delivery priority (emergency/express), cargo type (medicine / food / water / fuel / construction / livestock), special requirements (refrigeration, 4x4_required).
Returns recommended vehicle with suitability score, reason, and 3 ranked alternatives.

#### 5. Emergency Prioritization Agent
0–100 priority score with 5 tiers: **critical | high | medium | standard | low**.
Scored from: cargo type base (medicine=95, normal_parcel=40), delivery urgency, active emergency flag, medical urgency (none→critical), flood/landslide zone flag, affected population estimate.
- Score ≥85 → auto-bump normal deliveries
- Score ≥90 OR medical_urgency=critical → **human-in-the-loop approval required**

#### 6. What-if Simulation Agent (Killer Demo Feature)
Plays out disruption scenarios for officers:
```
Scenario: "What if the Shillong–Cherrapunji road landslides + weather worsens?"
→ Severity: critical
→ 10/10 vehicles, 37/40 deliveries rerouted
→ 8 emergency deliveries affected → assign 4x4 fleet
→ +108 min average delay
→ Activate DDMA control room, notify drivers SMS, confirm clearance
```
Supported scenarios: road_block | landslide | flood | weather_deterioration.

#### 7. Explainable AI Decisions & Audit Log
Every `/optimize` call is traced with a **DecisionLogEntry** containing:
- decision_id, trigger_event, timestamp
- inputs summary, scores calculated
- list of routes considered, final route selected
- natural-language reason, confidence (0–1)
- `human_in_loop_required` flag
- alternative option (for officer override)

Accessible at `GET /api/logistics/decisions?limit=50`.

### API Endpoints
- **Logistics** - `/api/logistics/*` - Route optimization, shipment CRUD, tracking, **vehicle-match**, **prioritize**, **what-if**, **decisions**
- **Accessibility** - `/api/accessibility/*` - Scoring (incl. 0-100 scale + vehicle suitability), routes, POIs
- **AI** - `/api/ai/*` - Chat, image analysis (road conditions), trip planning
- **Emergency** - `/api/emergency/*` - Alerts, evacuation routes, live weather snapshots
- **Communities** - `/api/communities/*` - Hubs, feedback
- **India Open Data** - `/api/india-data/*` - Demographics, transport infrastructure, hospital directories, scheme coverage, weather zones, education datasets
- **Events & Disruptions** - `/api/events/*` - **Ingest**, list, get, resolve landslide/flood/road_block events that auto-influence routing

### NER Data Coverage
8 states: Assam, Meghalaya, Manipur, Tripura, Mizoram, Nagaland, Arunachal Pradesh, Sikkim
- Cities with coordinates, road networks
- Hospitals, accessibility data
- Weather zones, landslide/flood risk
- Community hubs and local partners

### Agentic System Design (LLM ≠ Routing Engine)
Per insight, the LLM does **not** directly pick routes. Instead:
1. Deterministic A* routing engine calculates weighted paths
2. Risk models score weather/terrain/events
3. Rule-based safety engine enforces hard rules (no closed roads, no overweight bridges)
4. Optimization engine selects the best feasible option
5. LLM (Gemini) explains the decision in natural language
6. LangGraph orchestrates state across the pipeline
7. Human-in-the-loop for high-risk/emergency decisions

## Quick Start

```bash
# 1. Clone / navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
copy .env.example .env
# Edit .env and add your GOOGLE_API_KEY

# 5. Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/health (lists 7 new MVP features)
- Root: http://localhost:8000/ (lists all endpoints + new_mvp_features dict)

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry, CORS & routers setup (7 routers incl. events)
│   ├── config.py            # Pydantic settings
│   ├── agents/
│   │   ├── graph.py         # LangGraph StateGraph (supervisor + 4 specialists)
│   │   ├── state.py         # TypedDict shared state
│   │   └── nodes.py         # Agent node functions
│   ├── services/
│   │   ├── logistics_service.py     # A* routing + 7-factor scoring + vehicle matching + priority + what-if + decision log
│   │   ├── accessibility_service.py # 10-scale + 0-100 accessibility + vehicle suitability matrix
│   │   ├── events_service.py        # Event ingestion + active event index + segment/city block penalties
│   │   ├── gemini_service.py        # Gemini multimodal integration
│   │   ├── weather_service.py       # Live Open-Meteo integration & risk calculation
│   │   └── emergency_service.py     # Disaster alerts, evacuation
│   ├── routers/
│   │   ├── logistics.py             # optimize, shipments, track, vehicle-match, prioritize, what-if, decisions
│   │   ├── accessibility.py
│   │   ├── ai.py
│   │   ├── emergency.py
│   │   ├── communities.py
│   │   ├── india_data.py            # data.gov.in-style India open datasets
│   │   └── events.py                # ingest, list, get, resolve
│   ├── models/
│   │   └── schemas.py       # Pydantic request/response models (incl. events, vehicle, priority, simulation, decision log, score breakdown, acc100)
│   └── data/
│       └── ner_data.py      # Static NER dataset (8 states)
├── requirements.txt
├── .env.example
└── README.md
```

## LangGraph Agent Flow

```
[User Query / Real Event]
      │
      ▼
[SupervisorAgent] ─── determines intent ──┐
      │                                   │
      ├────────── route ─────────────► [LogisticsAgent ── Vehicle Matching]
      ├────────── accessibility ─────► [AccessibilityAgent ── 0-100 Score]
      ├────────── emergency ─────────► [EmergencyAgent ── Prioritization]
      ├────────── community ─────────► [CommunityAgent]
      └────────── simulation ────────► [What-if Agent]
                                          │
                                          ▼
                                   [Response Aggregator ── Explain Layer]
                                          │
                                          ▼
                                     [DecisionLog + User Output]
```

## Example API Calls

```bash
# === LOGISTICS ===

# Optimize a route (now includes score_breakdown + decision_log)
curl -X POST http://localhost:8000/api/logistics/optimize \
  -H "Content-Type: application/json" \
  -d '{"source":"Guwahati","destination":"Shillong","vehicle_type":"truck","priority":"fastest"}'

# Vehicle Intelligence: cargo-to-vehicle match
curl -X POST http://localhost:8000/api/logistics/vehicle-match \
  -H "Content-Type: application/json" \
  -d '{"cargo_type":"medicine","weight_kg":300,"delivery_priority":"emergency","origin":"Imphal","destination":"Ukhrul","special_requirements":["4x4_required"]}'

# Emergency delivery prioritization
curl -X POST http://localhost:8000/api/logistics/prioritize \
  -H "Content-Type: application/json" \
  -d '{"cargo_type":"medicine","destination":"Cherrapunji","delivery_type":"urgent","emergency_active":true,"medical_urgency":"high","landslide_affected":true,"affected_population_estimate":2500}'

# What-if: landslide scenario
curl -X POST http://localhost:8000/api/logistics/what-if \
  -H "Content-Type: application/json" \
  -d '{"scenario_type":"landslide","blocked_road_from":"Shillong","blocked_road_to":"Cherrapunji","blocked_cities":["Cherrapunji"],"weather_downgrade":true,"simulate_vehicles":10,"simulate_deliveries":40}'

# Decision log (explainability / audit)
curl http://localhost:8000/api/logistics/decisions?limit=10

# === EVENTS & DISRUPTIONS ===

# Ingest a disruption event (auto-influences routing graph)
curl -X POST http://localhost:8000/api/events/ingest \
  -H "Content-Type: application/json" \
  -d '{"type":"landslide","severity":"high","from_city":"Shillong","to_city":"Cherrapunji","blocked":true,"source":"district_control_room","confidence":0.92,"headline":"Landslide NH-40 Shillong bypass","affected_cities":["Shillong","Cherrapunji"],"duration_hours":48}'

# List all active events
curl "http://localhost:8000/api/events?active_only=true"

# Resolve / clear an event
curl -X POST http://localhost:8000/api/events/EVT-XXXXXXXX/resolve

# === ACCESSIBILITY ===

# Accessibility score (now also returns 0-100 detail + vehicle suitability)
curl "http://localhost:8000/api/accessibility/score?city=Shillong"

# === AI ===

# Chat with AI
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the best route from Imphal to Aizawl during monsoon?"}'

# === EMERGENCY ===

# Fetch Live Weather (Open-Meteo integrated)
curl "http://localhost:8000/api/emergency/weather?city=Shillong"

# === INDIA OPEN DATA ===

# Query India Open Data - States Demographics
curl "http://localhost:8000/api/india-data/states?min_literacy=75"

# Query India Open Data - Transport Infrastructure
curl "http://localhost:8000/api/india-data/transport"
```

## MVP Demo Walkthrough

1. **Normal condition** → Optimize Guwahati→Shillong, see composite score "Good: balanced route" + decision log.
2. **Trigger heavy rainfall** → Accessibility score for Shillong drops, landslide component → 0.
3. **Ingest landslide event** → `POST /events/ingest` Shillong↔Cherrapunji severity=high.
4. **System reacts automatically** → Next `/optimize` call either avoids Cherrapunji completely (blocked city) or applies ×15 weight penalty to the segment.
5. **Prioritize** an emergency medicine shipment → Score 100/critical, officer approval flag ON.
6. **Match vehicle** → Same medicine in Manipur hills → `4x4` with 0.91 suitability (not heavy truck).
7. **Run what-if simulation** → Landslide scenario → impact report with reroutes + officer checklist.

## Safety Rules Enforced (Non-Negotiable)

1. Closed road → route must not use it.
2. Bridge weight exceeded → heavy truck cannot use it.
3. Landslide risk > threshold → route risk becomes high.
4. Emergency medicine → priority auto-increases.
5. LLM cannot override safety rules.

## License

MIT
