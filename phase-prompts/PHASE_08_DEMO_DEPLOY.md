# PHASE 08 — DEMO SETUP, DEPLOYMENT & REHEARSAL
**Track:** All | **Hours:** 24–27 | **All agents converge**  
**Output:** Running system on target machine + 2 successful demo rehearsals  
**Master spec refs:** Section 32 (Demo Scenario), Section 38 (Definition of Done)

---

## Context

This is the final phase — all code is frozen, all tests pass, and you are preparing the system for the 6-minute live demo to judges. The goal is a **zero-surprise demo**. Every failure scenario has a fallback. The reset path works. The system has been rehearsed twice consecutively.

---

## Hour 24: Feature Freeze Checklist

Run this checklist before doing anything else:

```
FEATURE FREEZE GATE:
[ ] docker compose up → all 4 services healthy
[ ] GET /health → {"status": "ok", "db": "connected", "models": {"hazard": "ml", "eta": "ml"}}
[ ] Frontend loads at http://localhost:5173 without console errors
[ ] Login as manager1 → reaches Dashboard
[ ] pytest tests/test_invariants.py -v → ALL GREEN
[ ] pytest tests/unit/ -v → ALL GREEN
[ ] POST /demo/reset → completes in < 30s

IF ANY OF THE ABOVE FAIL → fix before proceeding. No demo without a green invariant suite.
```

---

## System Configuration for Demo

### Environment Variables

Create `backend/.env`:
```bash
DATABASE_URL=postgresql+asyncpg://nesetu:nesetu_dev@db:5432/nesetu
JWT_SECRET=nesetu_demo_secret_32chars_min_
SIM_START_HOUR=0
SIM_DEFAULT_SPEED=1
LLM_API_KEY=           # leave empty → template fallback (safer for demo)
LOG_LEVEL=INFO
ENVIRONMENT=demo
```

### Demo-Specific Config

`backend/app/config.py` — demo settings:
```python
class Settings(BaseSettings):
    demo_mode: bool = True
    
    # In demo mode, these are active:
    demo_jwt_no_expiry: bool = True     # tokens don't expire during demo
    demo_fast_cascade: bool = True      # skip sleeps in cascade animation
    demo_scenario_dir: str = "data/scenarios"
```

---

## Demo Data Verification

Before rehearsal, verify that key data looks right:

```bash
# Check road segment count
psql nesetu -c "SELECT COUNT(*) FROM road_segments;"
# Expect: 3000–8000

# Check weather timeline has the storm peak
psql nesetu -c "SELECT sim_hour, rain_mm_h FROM weather_timeline WHERE zone='khasi_hills' ORDER BY rain_mm_h DESC LIMIT 5;"
# Expect: hours 36–48 have rain_mm_h > 15

# Check initial LNS
psql nesetu -c "SELECT status, COUNT(*) FROM segment_overlays WHERE lns_version=0 GROUP BY status;"
# Expect: all OPEN at version 0

# Check scripted trunk segment exists
psql nesetu -c "SELECT id, highway_class, length_m FROM road_segments WHERE highway_class IN ('primary','trunk') LIMIT 10;"
# Pick the best candidate and update SCRIPTED_TRUNK_SEGMENT_ID in scenario config

# Verify model artifacts
ls -la backend/models/
# Expect: hazard_model.joblib, eta_model.joblib, EVAL.md (all < 24h old)
```

---

## Offline Basemap Tiles

The demo must work without internet. Generate tiles at build time:

```bash
# Download OSM basemap tiles for the bbox at zoom levels 8–14
# Use tilemaker or mbtiles approach
cd data/
python scripts/etl/generate_tiles.py  # outputs tiles/ directory

# Verify nginx serves them
curl http://localhost:8081/tiles/10/735/456.png  # adjust for bbox
```

**Tile style file** (`data/tiles/style.json`):
```json
{
  "version": 8,
  "name": "NE-Setu Dark",
  "sources": {
    "osm": {
      "type": "raster",
      "tiles": ["http://localhost:8081/tiles/{z}/{x}/{y}.png"],
      "tileSize": 256
    }
  },
  "layers": [{"id": "background", "type": "raster", "source": "osm"}]
}
```

---

## Demo Reset Verification

Test the reset path 3 times before rehearsal:

```bash
for i in 1 2 3; do
  echo "Reset $i..."
  curl -s -X POST http://localhost:8000/demo/reset \
    -H "Authorization: Bearer $MANAGER_TOKEN" | jq .status
  sleep 5
  curl -s http://localhost:8000/analytics/kpi \
    -H "Authorization: Bearer $MANAGER_TOKEN" | jq .
done
# All 3 should return identical KPI values
```

---

## Demo Script (6 Minutes)

The presenter follows this beat-by-beat script. All steps have fallbacks.

### Setup (2 min before demo)
```bash
# 1. Reset to clean state
POST /demo/reset

# 2. Open browser tabs (pre-open, do not navigate during demo):
#    Tab 1: Dashboard (http://localhost:5173/dashboard) 
#    Tab 2: Live Map (/map)
#    Tab 3: Heatmap (/heatmap)
#    Tab 4: Disruption Console (/disruption)
#    Tab 5: What-if (/whatif)
#    Tab 6: Decision Log (/log)

# 3. Login as manager1 in all tabs (single SSO not needed — demo tokens are pre-set)

# 4. Verify: Dashboard shows green KPIs, S3 shows all-green hexes, clock shows 06:00 Day 1
```

### Beat 0 — Cold Open (~30s)
- Screen: **Dashboard (Tab 1)**
- Say: "This is NE-Setu — a real-time logistics intelligence platform for Northeast India. Right now it's 6 AM, network is healthy, 12 vehicles are ready, 35 deliveries queued."
- Show: green KPIs, green heatmap mini-panel

### Beat 1 — Clock starts (~30s)
- Screen: **Live Map (Tab 2)**
- Action: `POST /demo/scenario/scn-01` then `POST /demo/clock {action:"play", value:20}`
- Say: "We're running at 20× speed. Watch the weather move in from the Brahmaputra."
- Show: sim clock advancing, weather zone indicator changing

### Beat 2 — The Thesis (~45s)
- Screen: **Heatmap (Tab 3)**
- Action: Flip vehicle-class toggle: heavy → 4×4
- Say: "The system doesn't see 'road accessible' — it sees 'accessible for which vehicle'. Watch: this 12km stretch scores 7 for a 10-tonne truck and 51 for a 4×4. **Same road, different physics.**"
- Show: hexes recolour as toggle flips

### Beat 3 — Pre-positioning (~30s)
- Screen: **Heatmap (Tab 3)**
- Action: Set horizon to +24h
- Say: "The system predicts: in 24 hours, two villages will be isolated. It's recommending we pre-position stock **now**, before the closure."
- Action: Click "Approve" on the pre-positioning card
- Show: recommendation → approval → plan created

### Beat 4 — Centrepiece (~90s)
- Screen: **Disruption Console (Tab 4)**
- Action: Sim clock reaches hour 36 → landslide event fires automatically (scripted)
- Say: "Landslide confirmed on the trunk corridor. Watch the system respond."
- Show: cascade stepper animating 10 stages, < 5 seconds, plan proposed
- Say: "One emergency medicine delivery protected. Two routine deliveries deferred. Equity cap applied — no village cut off entirely."
- Point to: deferred deliveries list with equity note

### Beat 5 — Human Gate (~30s)
- Screen: **Disruption Console (Tab 4)**
- Action: Click "Approve Replan"
- Say: "The system never acts alone. One click, the drivers get new routes."
- Switch: briefly to Driver View on mobile browser
- Show: reroute card on driver screen

### Beat 6 — Measured Intelligence (~30s)
- Screen: **Plan & Dispatch (Tab pre-open)**
- Action: Flip Smart → Naive toggle
- Say: "Here's what the naive algorithm would have done: 3 deliveries fail, 2 vehicles dispatched to unreachable destinations. Here's what ours does. The gap is measured on screen, not asserted."
- Show: delta panel (failed deliveries: 0 smart vs 3 naive)

### Beat 7 — Judge Drives (~45s)
- Screen: **What-if (Tab 5)**
- Say: "Your turn. Close any road you like."
- Action: Invite judge to click a segment on the map
- Show: diff appears in < 3s
- Say: "Why did V-07 get rerouted?" → click row → S7 shows full provenance

### Beat 8 — Recovery (~30s)
- Screen: **Live Map (Tab 2)**
- Action: Corroborate road re-opening at hour 72
- Say: "Road reopens. The system verifies the report, confirms clearance, map recovers."
- Show: red segment turns green, heatmap recovers

---

## Fallback Protocols

### If the cascade takes > 5s
```bash
# Navigate directly to the disruption console and refresh the page
# The plan was computed — it just didn't animate. Show the result directly.
POST /demo/scenario/scn-01?beat=4
# Jumps directly to beat 4's result state
```

### If any service crashes
```bash
docker compose restart api
# API restarts in < 10s with data intact (DB volume persists)
# Frontend reconnects via WS automatically
```

### If the demo state gets corrupted
```bash
POST /demo/reset
# Then POST /demo/scenario/scn-01?start_beat=4
# Jump directly to the centrepiece — judges see the core in 90 seconds
```

### If the judge's what-if produces an unexpected result
```
This is by design. Any scenario runs real computation.
If the network genuinely absorbs the disruption: "The system concludes: this corridor has
enough redundancy to absorb this closure with no plan change. That's also an answer."
```

---

## Q&A Ammunition (Pre-Computed Answers)

| Question | Answer |
|---|---|
| "Where's the training data?" | "Real terrain (OSM + SRTM DEM), real rainfall (Open-Meteo 2023 monsoon archive), closure events generated from those via physical model. Cold start — in production, the system builds its own training data from day one. EVAL.md is on screen." |
| "How do you handle false alerts?" | "Three layers: SUSPECTED ≠ CLOSED, corroboration threshold, confidence decay. Beat 8 just showed a re-open. The trust system is designed for this." |
| "Why not use Google Maps / Valhalla?" | "Google Maps doesn't know a bridge's weight limit, or that a slope is impassable for a 10-tonne truck after 40mm of rain. We model the physics. Beat 2 proved it." |
| "What if it scales beyond this corridor?" | "The region is a config bbox. The graph is generic. The architecture document records the production scaling path." |
| "Is any of this real?" | "Roads: real OSM. Elevation: real SRTM 30m DEM. Weather: real Open-Meteo archive for August 2023. Fleet and delivery orders: simulated by design, disclosed in the provenance panel right there." |
| "How is this different from a spreadsheet?" | "A spreadsheet can't replan 12 vehicles across 8,000 road segments in 4 seconds, predict isolation 24 hours ahead, or answer your what-if live. The naive comparator in Beat 6 measures the gap." |

---

## Final Acceptance Checklist (Hour 27)

```
DEMO READINESS GATE:
[ ] docker compose up → all services healthy (no manual restarts needed)
[ ] SCN-01 runs end-to-end (Beat 0 through Beat 8)
[ ] POST /demo/reset between runs → Run 2 identical to Run 1
[ ] Cascade: trigger-to-proposal < 5s (stopwatch-checked)
[ ] What-if: mutation-to-diff < 3s (stopwatch-checked)
[ ] Both invariant tests green
[ ] No external network required (all tiles, weather, graph are local)
[ ] 3 demo accounts logged in across 3 browser windows
[ ] Fallback paths tested: service restart, demo reset, beat-4 jump
[ ] EVAL.md open in a browser tab (for judge questions about training data)
[ ] Rehearsal #1 completed (timed: target < 6 min)
[ ] Rehearsal #2 completed (with simulated interruption)
```

---

## What to Say If Something Goes Wrong Live

**"Let me reset and show you the core."**
```bash
POST /demo/reset
POST /demo/scenario/scn-01?start_beat=4
```
This gets you to the centrepiece (cascade + approval) in 30 seconds. The minimum viable demo is Beat 4 + Beat 5 + Beat 7 (what-if). Everything else enriches — these three prove the thesis.
