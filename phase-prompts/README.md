# NE-Setu — Agent Roster & Phase Prompts

This directory contains **two complementary layers** of agent instructions, both derived from
`../MASTER_PROJECT_OVERVIEW.md` (the single source of truth):

1. **Role layer — the numbered agents (`00`–`06`).** Who does what, in which window, owning
   which contracts and freezes. Hand one file to each AI coding agent as its opening brief.
2. **Blueprint layer — the `PHASE_xx` files (written first, very detailed).** The file-by-file
   implementation specs each agent executes inside its lane. Read your role file first, then
   your blueprint files.

If any prompt conflicts with `MASTER_PROJECT_OVERVIEW.md`, **the master document wins**; log the
conflict in `BUILD_LOG.md` for the orchestrator.

## Roster → blueprint mapping

| Role file | Agent | Blueprint files to execute | Window (from T0) |
|---|---|---|---|
| `00-orchestrator.md` | **Orchestrator** | `AGENT_QUICKSTART.md` (circulate to all) | full window 0–27 h |
| `01-data-gis.md` | **Data/GIS Agent** | `PHASE_01_DATABASE.md` (seed rows), `PHASE_02_ETL_GIS.md` | 0–6 h build, then support |
| `02-backend-engine.md` | **Backend/Engine Agent** | `PHASE_01_DATABASE.md` (schema/migrations), `PHASE_03_BACKEND_CORE.md`, `PHASE_05_API.md` (optimization + REST/WS) | 0–24 h |
| `03-frontend.md` | **Frontend Agent** | `PHASE_06_FRONTEND.md` | 0–24 h (freeze h20) |
| `04-ml-models.md` | **ML Agent** | `PHASE_04_AI_ML.md` | 0–12 h |
| `05-demo-content.md` | **Demo Content Agent** | `PHASE_08_DEMO_DEPLOY.md` (content half) | 8–27 h |
| `06-qa-integration.md` | **QA/Integration Agent** | `PHASE_07_TESTING.md`, `PHASE_08_DEMO_DEPLOY.md` (rehearsal half) | 8–27 h |

## Dependency graph (contract joins)

```
01-data-gis ──graph.pkl + seed.sql + weather timeline──► 02-backend-engine
04-ml-models ─hazard/eta artifacts + feature schemas───► 02-backend-engine
02-backend-engine ──REST/WS contracts (by h8)──────────► 03-frontend
05-demo-content ──SCN-01 event script (h16)────────────► 02-backend-engine (sim clock)
06-qa-integration ──invariant + e2e tests──────────────► all tracks
                     ▲
        00-orchestrator (sequences, freezes, arbitrates)
```

## Freeze schedule (hard, enforced by orchestrator — earlier allowed, later never)

| By | Frozen artifact | Owner |
|---|---|---|
| h6–8 | DB schema (§25.2), API surface (§26), `graph.pkl` format, seed SQL, model-artifact interfaces | A+B+D → all |
| h16 | SCN-01 event script format (event types, dedup keys, timing) | D → B |
| h20 | **Feature freeze** — bugfixes only, drop-list (§40) applies | Orchestrator |
| h24–27 | Dry runs, acceptance gates (§47.6), runbook drill | QA + Demo |

Note: `PHASE_00_OVERVIEW.md` sketches an earlier H0/H4 freeze of schema/API — treat that as the
*stretch* schedule. The binding commitment is **no later than h8**.

## Canonical repository layout (per `AGENT_QUICKSTART.md`)

```
soap.ai/
  MASTER_PROJECT_OVERVIEW.md      # read-only for agents
  phase-prompts/                  # this directory (both layers)
  BUILD_LOG.md                    # orchestrator-maintained progress log
  backend/                        # FastAPI app (Track B owns)
    app/  scripts/etl/  scripts/ml/  models/  tests/
  frontend/                       # Vite/React app (Track C owns)
  data/                           # frozen artifacts (graph.pkl, tiles, scenarios/, provenance)
  pitch/                          # deck + Q&A sheet (Track D-2)
  docker-compose.yml
```

## Ground rules (apply to every agent)

1. **The master document wins** over any prompt here.
2. **Never modify another track's owned files.** Consume frozen contracts only.
3. **Every simulated/seeded value carries provenance** (`real | seeded | simulated`) — §22.1 rule.
4. **Determinism**: fixed seeds everywhere; identical inputs ⇒ identical outputs.
5. **No new external runtime dependencies** beyond §36 without orchestrator approval.
6. **Log each completed milestone** in `BUILD_LOG.md` (append-only: time, track, item).
7. **Escalate, don't improvise**, on: contract drift, data-acquisition failure (use the declared
   fallback and log it), or a budget miss (§21.4 latencies).
8. **Role file first, blueprint second**: the role file defines ownership, contracts and
   boundaries; the blueprint defines implementation detail. On overlap, ownership rules.
