# PHASE 01 — DATABASE & SCHEMA
**Track:** A | **Hours:** 0–4 | **Agent:** DB Agent  
**Output:** Working PostgreSQL + PostGIS database with full schema, migrations, and seed scripts  
**Master spec refs:** Section 25 (Database Architecture), Section 22 (Data Architecture)

---

## Context

You are building the database layer for **NE-Setu**, an AI-powered logistics platform for North Eastern India. The database is PostgreSQL 16 + PostGIS. Everything in the system reads from and writes to this database. Your schema is the frozen contract — no other agent may start until you commit migrations.

**Tech stack:** PostgreSQL 16, PostGIS 3.x, SQLAlchemy 2.x (async), Alembic for migrations.

---

## Deliverables (Must Complete Before Hour 4)

1. `docker-compose.yml` — services: `db` (postgres+postgis), `api` (fastapi), `web` (react vite), `tiles` (static file server)
2. `alembic/versions/001_initial.py` — full schema migration
3. `app/models/` — SQLAlchemy ORM models for every table
4. `scripts/seed_demo.py` — seeds the 3 demo users, 12 vehicles, 30 locations, 35 deliveries
5. `scripts/reset_demo.py` — backs `POST /demo/reset` — wipes runtime tables, re-seeds, re-initialises sim clock to 06:00

---

## Full Schema (implement exactly as specified)

### Static tables (build-time populated, never mutated at runtime)

```sql
-- Users & auth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager','officer','driver')),
  pass_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Road network (from OSMnx ETL — Phase 02 populates this)
CREATE TABLE road_segments (
  id BIGINT PRIMARY KEY,           -- OSM way id
  osm_id BIGINT NOT NULL,
  geom GEOMETRY(LINESTRING, 4326) NOT NULL,
  highway_class TEXT,              -- motorway/trunk/primary/secondary/tertiary/unclassified/track
  surface TEXT,                    -- paved/gravel/dirt/track/unknown
  oneway BOOLEAN DEFAULT FALSE,
  bridge BOOLEAN DEFAULT FALSE,
  maxweight FLOAT,                 -- tonnes; NULL = untagged (seeded with heuristic if bridge=true)
  maxwidth FLOAT,                  -- metres
  lanes INTEGER DEFAULT 1,
  access TEXT DEFAULT 'yes',
  length_m FLOAT NOT NULL,
  mean_grade FLOAT DEFAULT 0.0,   -- derived from DEM; positive = uphill
  max_grade FLOAT DEFAULT 0.0,
  h3_index TEXT,                   -- res-7 H3 cell
  suscept_landslide FLOAT DEFAULT 0.0,  -- static prior [0,1]
  suscept_flood FLOAT DEFAULT 0.0,
  provenance TEXT DEFAULT 'real'   -- 'real' | 'seeded' | 'simulated'
);
CREATE INDEX ON road_segments USING GIST (geom);
CREATE INDEX ON road_segments (h3_index);

-- Segment static factors (separate for clarity)
CREATE TABLE segment_static_factors (
  segment_id BIGINT REFERENCES road_segments(id),
  slope_class TEXT,               -- flat/gentle/moderate/steep/severe
  aspect_class TEXT,              -- N/NE/E/SE/S/SW/W/NW
  elevation_m FLOAT,
  near_river BOOLEAN DEFAULT FALSE,
  historical_inundation_class TEXT  -- none/low/medium/high
);

-- H3 hex cells
CREATE TABLE h3_cells (
  h3_index TEXT PRIMARY KEY,
  geom GEOMETRY(POLYGON, 4326),
  population_class TEXT CHECK (population_class IN ('low','medium','high','urban')),
  mean_a_heavy FLOAT,
  mean_a_mini FLOAT,
  mean_a_4x4 FLOAT,
  mean_a_special FLOAT,
  band_heavy TEXT,
  band_mini TEXT,
  band_4x4 TEXT,
  band_special TEXT
);

-- Locations (depots, villages, health facilities)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('depot','village','health')),
  geom GEOMETRY(POINT, 4326) NOT NULL,
  population_class TEXT,
  cold_chain BOOLEAN DEFAULT FALSE,
  accessible_entry BOOLEAN
);
CREATE INDEX ON locations USING GIST (geom);

-- Vehicle specs
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,            -- e.g. 'HT-01', '4x4-02'
  class TEXT NOT NULL CHECK (class IN ('heavy','mini','4x4','ambulance','accessible_van')),
  capacity_kg FLOAT NOT NULL,
  volume_m3 FLOAT NOT NULL,
  width_m FLOAT NOT NULL,
  weight_kg FLOAT NOT NULL,       -- gross vehicle weight
  cold_chain BOOLEAN DEFAULT FALSE,
  accessible BOOLEAN DEFAULT FALSE,
  home_depot UUID REFERENCES locations(id),
  range_km FLOAT DEFAULT 500.0
);

-- Cargo types
CREATE TABLE cargo_types (
  code TEXT PRIMARY KEY,           -- MEDICAL / FOOD / WATER / GENERAL / PASSENGER
  base_priority INTEGER NOT NULL,  -- 1-100
  risk_tolerance FLOAT NOT NULL,   -- max P_closure tolerated on route [0,1]
  needs_cold_chain BOOLEAN DEFAULT FALSE,
  is_passenger BOOLEAN DEFAULT FALSE
);

-- Weather timeline (seeded from Open-Meteo archive at build time)
CREATE TABLE weather_timeline (
  sim_hour INTEGER NOT NULL,       -- hours since sim epoch (0 = 06:00 day 1)
  zone TEXT NOT NULL,              -- 'brahmaputra_plain' | 'khasi_hills'
  rain_mm_h FLOAT DEFAULT 0.0,
  wind_kph FLOAT DEFAULT 0.0,
  visibility_km FLOAT DEFAULT 10.0,
  source TEXT DEFAULT 'open_meteo_archive',
  PRIMARY KEY (sim_hour, zone)
);
```

### Runtime tables (mutated during operation)

```sql
-- Living Network State — append-versioned overlays (THE SPINE)
CREATE TABLE segment_overlays (
  id BIGSERIAL PRIMARY KEY,
  segment_id BIGINT REFERENCES road_segments(id),
  lns_version INTEGER NOT NULL,
  valid_at_sim INTEGER NOT NULL,   -- sim_hour when this overlay becomes active
  status TEXT NOT NULL CHECK (status IN ('OPEN','SUSPECTED','CLOSED')),
  status_source TEXT,
  status_confidence FLOAT DEFAULT 1.0,
  -- Accessibility scores per vehicle class
  a_score_heavy FLOAT,
  a_score_mini FLOAT,
  a_score_4x4 FLOAT,
  a_score_special FLOAT,
  -- Hazard probabilities at horizons
  p_landslide_6h FLOAT, p_landslide_12h FLOAT, p_landslide_24h FLOAT,
  p_landslide_48h FLOAT, p_landslide_72h FLOAT,
  p_flood_6h FLOAT, p_flood_12h FLOAT, p_flood_24h FLOAT,
  p_flood_48h FLOAT, p_flood_72h FLOAT,
  eff_speed_kph FLOAT,
  confidence FLOAT DEFAULT 1.0,
  contributing_factors JSONB,       -- full decomposition for XAI
  computed_at_wall TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON segment_overlays (segment_id, lns_version);
CREATE INDEX ON segment_overlays (valid_at_sim);

-- Road status history
CREATE TABLE road_status_history (
  id BIGSERIAL PRIMARY KEY,
  segment_id BIGINT REFERENCES road_segments(id),
  from_status TEXT,
  to_status TEXT,
  event_id UUID,
  reason TEXT,
  at_sim INTEGER
);

-- Hazard forecasts
CREATE TABLE hazard_forecasts (
  id BIGSERIAL PRIMARY KEY,
  segment_id BIGINT REFERENCES road_segments(id),
  horizon_h INTEGER,
  p_landslide FLOAT,
  p_flood FLOAT,
  computed_at_sim INTEGER,
  model_version TEXT DEFAULT 'v1'
);

-- Vehicle runtime state
CREATE TABLE vehicle_states (
  vehicle_id UUID PRIMARY KEY REFERENCES vehicles(id),
  current_geom GEOMETRY(POINT, 4326),
  heading FLOAT,
  assignment_id UUID,              -- FK added after assignments table exists
  updated_sim INTEGER
);

-- Drivers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  user_id UUID REFERENCES users(id),
  duty_status TEXT DEFAULT 'available'
);

-- Deliveries
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_code TEXT REFERENCES cargo_types(code),
  weight_kg FLOAT NOT NULL,
  volume_m3 FLOAT NOT NULL,
  dest_id UUID REFERENCES locations(id),
  requested_by TEXT,
  deadline_sim INTEGER,            -- sim_hour deadline
  priority_score FLOAT DEFAULT 50.0,
  status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW','PLANNED','IN_TRANSIT','DELIVERED','DEFERRED','FAILED')),
  is_emergency BOOLEAN DEFAULT FALSE,
  created_sim INTEGER DEFAULT 0
);

-- Plans
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER DEFAULT 1,
  mode TEXT DEFAULT 'NORMAL' CHECK (mode IN ('NORMAL','EMERGENCY')),
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PROPOSED','APPROVED','ACTIVE','SUPERSEDED')),
  objective_value FLOAT,
  created_sim INTEGER,
  approved_by UUID REFERENCES users(id),
  approved_at_sim INTEGER
);

-- Assignments (vehicle → set of deliveries via a route)
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id),
  vehicle_id UUID REFERENCES vehicles(id),
  depart_sim INTEGER,
  eta_p50 INTEGER,                 -- sim_hour of expected arrival
  eta_p90 INTEGER,
  risk_score FLOAT,
  status TEXT DEFAULT 'PLANNED'
);

-- Stops within an assignment
CREATE TABLE stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id),
  delivery_id UUID REFERENCES deliveries(id),
  seq INTEGER NOT NULL,
  planned_arrival_sim INTEGER,
  actual_arrival_sim INTEGER
);

-- Route candidates (includes rejected ones — critical for XAI)
CREATE TABLE route_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id),
  delivery_id UUID REFERENCES deliveries(id),
  vehicle_class TEXT NOT NULL,
  geometry GEOMETRY(LINESTRING, 4326),
  segment_ids BIGINT[],
  distance_m FLOAT,
  eta_p50 INTEGER,
  eta_p90 INTEGER,
  cost_total FLOAT,
  cost_breakdown JSONB,           -- {time, reliab, risk, surface, terrain, conf, priority}
  feasible BOOLEAN DEFAULT TRUE,
  rejection_reason TEXT,          -- if infeasible: which constraint failed
  chosen BOOLEAN DEFAULT FALSE
);

-- Events (multi-source ingestion)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,             -- landslide/flood/report/weather/breakdown/surge/scenario
  payload JSONB NOT NULL,
  source_type TEXT,               -- control_room/driver/citizen/weather/system
  source_trust FLOAT DEFAULT 0.5, -- [0,1]
  received_sim INTEGER,
  dedup_key TEXT UNIQUE,          -- prevents replay duplicates
  corroboration_count INTEGER DEFAULT 1,
  resolved BOOLEAN DEFAULT FALSE
);

-- Event → segment impacts
CREATE TABLE event_segment_impacts (
  event_id UUID REFERENCES events(id),
  segment_id BIGINT REFERENCES road_segments(id),
  applied_status TEXT,
  confidence FLOAT,
  PRIMARY KEY (event_id, segment_id)
);

-- Decision records (full provenance for every recommendation)
CREATE TABLE decision_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_event_id UUID REFERENCES events(id),
  plan_id UUID REFERENCES plans(id),
  decision_type TEXT,
  inputs_snapshot JSONB,          -- snapshot of key inputs at decision time
  candidates JSONB NOT NULL,      -- full scored set including rejections
  selection JSONB,
  rationale_template TEXT,        -- pre-rendered explanation
  confidence FLOAT,
  created_sim INTEGER
);

-- Approval events
CREATE TABLE approval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES decision_records(id),
  user_id UUID REFERENCES users(id),
  action TEXT CHECK (action IN ('approve','reject','modify')),
  at_wall TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- What-if simulation runs
CREATE TABLE simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES users(id),
  fork_lns_version INTEGER,
  mutations JSONB,
  diff_result JSONB,
  status TEXT DEFAULT 'pending',
  created_wall TIMESTAMPTZ DEFAULT NOW()
);

-- Demand forecasts
CREATE TABLE demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  h3_index TEXT REFERENCES h3_cells(h3_index),
  commodity TEXT,
  horizon_h INTEGER,
  expected_uplift FLOAT,
  confidence FLOAT,
  model TEXT DEFAULT 'elasticity_v1'
);

-- Audit log (append-only)
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  wall_time TIMESTAMPTZ DEFAULT NOW(),
  sim_time INTEGER,
  actor_id UUID,
  entity_type TEXT,
  entity_id TEXT,
  action TEXT,
  detail JSONB
);

-- Model run tracking
CREATE TABLE model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact TEXT,                   -- 'hazard_model' | 'eta_model'
  metrics JSONB,
  trained_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
```

---

## Seed Data Script (`scripts/seed_demo.py`)

Seed exactly:

**3 Users:**
- `manager1 / manager / password: demo123`
- `officer1 / officer / password: demo123`
- `driver1 / driver / password: demo123`

**3 Depots** (Guwahati area):
- Guwahati Central Depot (26.14°N, 91.74°E)
- Shillong Forward Point (25.57°N, 91.88°E)
- Jowai Sub-depot (25.45°N, 92.20°E)

**~10 Health Facilities + ~20 Villages** in the Guwahati→Shillong→Jowai corridor bbox.

**12 Vehicles:**
| Label | Class | Weight kg | Width m | Capacity kg | Cold Chain | Accessible |
|---|---|---|---|---|---|---|
| HT-01 to HT-03 | heavy | 10000 | 2.5 | 8000 | N | N |
| MT-01 to MT-04 | mini | 3500 | 2.0 | 2500 | N | N |
| 4X-01 to 4X-03 | 4x4 | 2500 | 1.9 | 800 | N | N |
| AM-01 | ambulance | 3000 | 2.1 | 500 | Y | Y |
| AV-01 | accessible_van | 2800 | 2.2 | 600 | N | Y |

**35 Deliveries** (mixed): 4–6 marked `is_emergency=True` (MEDICAL cargo), rest general food/water/supplies.

**5 Cargo Types:**
- MEDICAL: priority=90, risk_tolerance=0.5, cold_chain=False
- MEDICINE_COLD: priority=95, risk_tolerance=0.4, cold_chain=True
- FOOD: priority=70, risk_tolerance=0.65
- WATER: priority=75, risk_tolerance=0.65
- GENERAL: priority=40, risk_tolerance=0.80
- PASSENGER: priority=85, risk_tolerance=0.45, is_passenger=True

---

## Docker Compose (`docker-compose.yml`)

```yaml
version: '3.9'
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: nesetu
      POSTGRES_USER: nesetu
      POSTGRES_PASSWORD: nesetu_dev
    volumes:
      - db_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nesetu"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://nesetu:nesetu_dev@db:5432/nesetu
      JWT_SECRET: change_in_prod_32chars_minimum
      SIM_START_HOUR: 0
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - ./models:/app/models
      - ./data:/app/data
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  web:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - api
    volumes:
      - ./frontend:/app
    command: npm run dev -- --host 0.0.0.0

  tiles:
    image: nginx:alpine
    volumes:
      - ./data/tiles:/usr/share/nginx/html/tiles:ro
    ports:
      - "8081:80"

volumes:
  db_data:
```

---

## Acceptance Criteria

- [ ] `docker compose up` completes without errors
- [ ] All tables created with correct types and constraints
- [ ] PostGIS extension enabled (`CREATE EXTENSION IF NOT EXISTS postgis`)
- [ ] Seed script runs without error and produces correct row counts
- [ ] `GET /health` returns `{"status": "ok", "db": "connected"}`
- [ ] Reset script wipes runtime tables and re-seeds in < 10 seconds

---

## Key Rules

- `sim_time` (INTEGER, sim hours since epoch) is **always separate** from `wall_time` (TIMESTAMPTZ). Never conflate.
- `provenance` column on `road_segments`: always `'real'` for OSM geometry, `'seeded'` for inferred attributes, `'simulated'` for generated events.
- All UUID primary keys use `gen_random_uuid()`.
- `audit_log` is append-only — no UPDATE or DELETE ever touches it.
