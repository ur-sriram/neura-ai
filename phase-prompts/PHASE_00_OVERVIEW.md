# NE-SETU — PHASE IMPLEMENTATION PROMPTS INDEX

**Project:** NE-Setu — AI-Powered Adaptive Logistics & Accessibility Intelligence Platform  
**Problem:** SIH26002 — AI Smart Logistics Platform for Ministry of DoNER  
**Build constraint:** 27-hour MVP using AI coding agents  
**Master spec:** `../MASTER_PROJECT_OVERVIEW.md`

---

## Phase Structure

Each file in this folder is a **self-contained implementation prompt** for an AI coding agent.
They are designed to be executed in parallel across 4 agent tracks after the Phase 0 freeze.

| File | Phase | Track | Hours | Dependencies |
|---|---|---|---|---|
| [PHASE_01_DATABASE.md](./PHASE_01_DATABASE.md) | Database & Schema | Track A | 0–4 | None — first to run |
| [PHASE_02_ETL_GIS.md](./PHASE_02_ETL_GIS.md) | ETL Pipeline & GIS | Track A | 4–10 | Phase 01 done |
| [PHASE_03_BACKEND_CORE.md](./PHASE_03_BACKEND_CORE.md) | Backend Core & Pipeline | Track B | 4–14 | Phase 01 schema frozen |
| [PHASE_04_AI_ML.md](./PHASE_04_AI_ML.md) | AI/ML Models | Track C | 4–12 | Phase 02 data ready |
| [PHASE_05_API.md](./PHASE_05_API.md) | Optimization Engine & REST API | Track B | 10–20 | Phase 03 core done |
| [PHASE_06_FRONTEND.md](./PHASE_06_FRONTEND.md) | Frontend & UI | Track D | 6–22 | Phase 05 API contract |
| [PHASE_07_TESTING.md](./PHASE_07_TESTING.md) | Testing & Invariants | Track A | 20–24 | All phases done |
| [PHASE_08_DEMO_DEPLOY.md](./PHASE_08_DEMO_DEPLOY.md) | Demo, Deploy & Rehearsal | All | 24–27 | All phases done |

> **Note (reconciled):** the role-layer files `00`–`06` and `README.md` define *who executes
> these phases, with which contracts and freezes*. Role file first, blueprint second.

---

## Execution Model (4 Parallel Agent Tracks)

```
HOUR  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27
       │                                                                                   │
TRACK A ████ DB SCHEMA ████ ──── ETL + GIS DATA PIPELINE ──── ──── TESTING + INVARIANTS ────
TRACK B           ──────── BACKEND CORE ──────── ──── OPTIMIZATION ──── ──── REST API ────
TRACK C           ──────── AI/ML TRAINING ──────────────────
TRACK D                 ──────── FRONTEND ────────────────────────────────────────────
       │                                                                                   │
       H0: DB schema frozen                                   H24: Feature freeze
       H4:  API contract frozen (OpenAPI spec committed)      H25: Demo rehearsal #1
       H10: Backend core + ETL integrated                     H26: Demo rehearsal #2
       H20: All tracks merge + integration test               H27: PRESENT
```

---

## Critical Contracts (Frozen at Hour 4)

These must not change after Hour 4. Every track depends on them:

1. **Database schema** → `alembic/versions/001_initial.py`
2. **OpenAPI spec** → `openapi.json` (generated from FastAPI at Hour 4)
3. **Graph pickle format** → `graph.pkl` (NetworkX MultiDiGraph)
4. **LNS overlay shape** → `segment_overlays` table definition
5. **WebSocket event envelope** → `{ type, payload, sim_time, wall_time }`

---

## The 5 Load-Bearing Features (Never Cut)

Per Section 40 of the master spec — if hours run short, cut everything else first:

1. **LNS + vehicle-class toggle** (F02–F04) — the thesis demo
2. **Event cascade + replan** (F14, F05) — the centrepiece
3. **CP-SAT joint optimization** (F12) — the differentiator
4. **What-if simulator** (F16) — the judge-facing killer
5. **Decision records + explanation templates** (F17/F18) — the audit trail

---

## Drop List (Cut in This Order Under Time Pressure)

1. F32 Natural-language query
2. F33 Deferral advisor
3. F29 Citizen report form
4. F28 Assisted mobility slice
5. F26/F27 Demand forecast + pre-positioning panels
6. F30 Model performance panel
7. F24 Timeline scrub (keep play + ×20 only)
8. Naive baseline comparator ← **keep if any time at all**
9. LLM prose ← template fallback is always complete

---

## Key Technical Decisions (Apply Across All Phases)

- **One language:** Python (FastAPI + GIS + ML). No Node backend.
- **One database:** PostgreSQL 16 + PostGIS. No Redis, no separate cache.
- **One process:** FastAPI with in-process async tasks. No Celery.
- **Deterministic everywhere:** fixed seeds; identical inputs → identical outputs.
- **Snapshot-first:** all external APIs called once at build, baked into DB.
- **Fallbacks are first-class:** every ML model has a T0 deterministic fallback.
- **Simulation time ≠ wall time:** `sim_time` on every mutable row — never conflate.
