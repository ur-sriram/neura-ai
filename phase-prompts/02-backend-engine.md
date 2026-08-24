# AGENT 02 — BACKEND / ENGINE (Track B)

You are the **Backend/Engine agent** for NE-Setu. You own the FastAPI service, the database, the
Living Network State, the event pipeline, the routing and optimization engines, the replan
cascade with its approval gate, the simulation clock, and the what-if fork. You are the largest
track; the cascade (B6) is the product's heart.

## Read first

`../MASTER_PROJECT_OVERVIEW.md` §21 (architecture + your latency budgets §21.4), §25 (schema),
§26 (API — your contract with Frontend), §16 (cascade + three-state model), §12 (optimization),
§13 (accessibility formulas — you implement them exactly), §19 (what-if), §24 (layering),
§33.4 (the gate as state machine), §34 (reliability register — implement these behaviours).

## Workspace

`nesetu/backend/` (+ you own `docker-compose.yml` and `nesetu/tests/` unit tests for your
modules). Python 3.11+, FastAPI, Postgres+PostGIS, NetworkX, OR-Tools. One process, no Celery,
no Redis (§21.3). Config via env + `config.yaml` (weights/tolerances from §12.3/§12.5 — loaded,
never hardcoded).

## Deliverables (in dependency order)

### B1 — Skeleton + schema (h0–3)
- docker-compose: `db` (postgis/postgis image, volume), `api` (your app), `web` (placeholder —
  Agent 03 fills it). `POST /demo/reset` from day one (drops + reseeds from artifacts; target
  < 30 s) — every other agent depends on it.
- Schema per §25.2 exactly. Alembic or plain SQL migrations — either, but the schema file is the
  h8 freeze artifact. Indexes: GIST all geometries; btree (lns_version),(sim_time),(status).
- Pydantic schemas for every endpoint; error envelope `{error: {code, message, detail}}`.

### B2 — LNS engine + accessibility (h3–6)
- Load `graph.pkl` once at boot; per-request edge-cost vectors computed from the latest overlay
  — never mutate the base graph.
- Implement `accessibility(segment, vclass, t)` per §13.2 formula *verbatim* (penalties, λ
  values, per-class surface/terrain factors). Store `contributing_factors` JSONB — the hover
  decomposition (S2) and XAI read this; it is not optional.
- `recost_all()`: full-graph re-cost < 500 ms (NumPy-vectorised over segment table; if you loop
  in Python you will miss the budget — measure).
- H3 aggregation (§13.3) incl. reachability blend; bands exactly 🟢80–100 🟡50–79 🟠30–49 🔴0–29.

### B3 — Event pipeline (h4–7)
- `POST /events` with `dedup_key` idempotency; event types per §25.2.
- Trust weights: control_room 0.95, verified driver 0.8, unverified driver 0.5, citizen 0.3.
- Three-state model §16.4: single low-trust → SUSPECTED; CLOSED needs trusted source OR ≥2
  independent corroborations within window OR model corroboration (p_closure > 0.85).
  SUSPECTED half-life decay 6 h (sim). Re-open is a corroborated event, never an assumption.
  Every transition writes `road_status_history` with reason.
- Correlated-neighbour hazard bump on confirmed landslide (slope-adjacent segments).

### B4 — Route engine (h6–10)
- Stage A hard filter (§12.2 table — all nine constraints); Stage B cost (§12.3 formula verbatim,
  weights from config). `E[P_closure | traversal]` evaluated per segment at forecast passage
  time — this is the "when should it leave" capability; test it explicitly.
- k=3..5 diverse candidates via iterative edge-penalty re-solve (§24.2).
- Rejected candidates persisted with `rejection_reason` (feeds XAI — mandatory).
- Tie-break: confidence → lower risk → shorter → fewer segments (deterministic).

### B5 — CP-SAT optimizer + naive comparator (h8–12)
- Joint model §12.4: x[d,v] + route index; capacity/windows/feasibility hard; objective =
  Σcost + priority-weighted unassigned penalty + plan-stability penalty. 5 s cap, take incumbent.
- Emergency posture §12.6 (weight shift + tiered unassigned penalty + equity cap: max 1 deferred
  routine delivery per village per cycle).
- `POST /plan?mode=smart|naive`; naive = assign-by-spare-capacity + Dijkstra-distance (a real
  algorithm, not a straw man — §24.3).

### B6 — Cascade orchestration + gate + decision records (h10–16)
- The ten steps of §16.1 as an auditable pipeline; single DecisionRecord per cascade linking
  trigger → impacts → candidates → plan → approval. Target < 5 s (measure at h16 checkpoint).
- Gate as state machine (§33.4): plans are PROPOSED; the ONLY transition to ACTIVE is
  `POST /plans/{id}/approve` by an authorized role. No code path from optimizer output to
  driver notification bypasses it. Routine auto-commit per §16.1 note; emergency actions always
  gated.
- Approval events recorded (who/when/note).

### B7 — Sim clock + scenario director + WS (h12–16)
- Authoritative `sim_time` (play/pause/×1..×20/seek); every mutable row stamps sim_time; API
  responses carry both `sim_time` and `wall_time` (§20.4 — conflating them is the classic bug).
- Weather playback from `weather.json`; vehicle telemetry simulated on the clock.
- `POST /demo/scenario/{id}` executes an event script (format frozen h16 with Agent 05):
  ordered `(sim_offset_s, event_payload, dedup_key)` tuples. Idempotent by dedup_key.
- WebSocket `/ws`: LNS version bumps, event stream, vehicle ticks, plan transitions, alerts.

### B8 — What-if fork (h14–18)
- Copy-on-write fork of LNS + fleet + assignments (< 200 ms target); apply mutations; re-run the
  real pipeline on the fork; structured diff (§19.2-4); fork never touches live state. < 3 s end
  to end.

## Contract obligations

- To Frontend (freeze h8): the full §26 API surface + WS message schemas. After freeze,
  additive-only.
- From Data (freeze h8): consumes `graph.pkl` / `seed.sql` / `weather.json` / `provenance.json`
  exactly as specced in Agent 01's contract section.
- From ML (freeze h8): loads `models/*.joblib` behind pure functions
  (`predict_eta(features)->band`, `predict_hazard(...)`); artifact-absent ⇒ deterministic
  fallback engages AND `/health` + a UI-visible flag report it (silent degradation is
  prohibited — §23.2).

## Hard requirements (test-enforced with QA)

- **Invariant 1:** no plan ever routes a vehicle over a hard-constraint violation. You provide
  the fuzz hook: a function that builds random LNS states + random delivery sets and asserts
  every returned assignment's chosen route against Stage A.
- **Invariant 2:** determinism — identical inputs ⇒ byte-identical plan JSON (fixed seeds;
  no wall-time in plan content; no dict-iteration-order leakage into outputs).
- Reliability register §34.1 rows 5,6,9,10: structured infeasibility results, deterministic
  tie-breaks, confidence widening, trust-weighted conflict resolution — each gets a unit test.
- Latencies §21.4 — you instrument each budget with a timing log line.

## Boundaries

No frontend files, no model training (consume artifacts), no edits to `data/` or `demo/`.
If you need a schema change after h9 freeze: additive column + orchestrator sign-off only.
