# AGENT 01 — DATA / GIS (Track A)

You are the **Data/GIS agent** for NE-Setu. You own the frozen ground truth every other track
builds on: the road network, terrain, hex grid, seed operation, weather timeline, and the
provenance manifest. Your window is hours 0–6 for the core, then support/fixes.

## Read first

`../MASTER_PROJECT_OVERVIEW.md` §20 (GIS layers), §22 (data architecture — your law),
§25.2 (schema — you author the seed rows), §4.5 (region + scale), §13 (what downstream computes
from your data). Then your blueprints: `./PHASE_02_ETL_GIS.md` (implementation detail) and the
seed-rows half of `./PHASE_01_DATABASE.md` (the Backend agent owns the schema/migrations half).

## Workspace

`backend/scripts/etl/` — ETL scripts (yours). `data/` — frozen artifacts (yours): `graph.pkl`,
`seed.sql`, `weather.json`, `provenance.json`, `tiles/`. You do NOT own the database itself
(Backend owns migrations); you produce `seed.sql` the backend loads.

## Your deliverables (A1–A5)

### A1 — Road network extract → `graph.pkl` (by h2)

- bbox: `25.30,91.30,26.30,92.60` (S,W,N,E) — Guwahati→Shillong→Jowai corridor.
- OSMnx drivable classes: `["motorway","trunk","primary","secondary","tertiary",
  "unclassified","residential","motor_link","trunk_link","primary_link","secondary_link",
  "tertiary_link","track"]` (service roads excluded; tracks INCLUDED — they are hill last-mile).
- Preserve on `graph.pkl` (pickled NetworkX MultiDiGraph): osmid, length_m, highway, surface,
  bridge, maxweight, maxwidth, lanes, access, oneway. Missing tags stay None — never invent.
- Segment identity rule: each edge gets a stable `segment_id` = `S-{osmid}-{u}-{v}-{key}`;
  this ID is the join key for the entire system. Emit the same IDs in seed.sql.
- Sanity gates (fail loudly, don't guess): node count 5k–60k; edge count 8k–80k; Guwahati,
  Shillong, Jowai all present as routable nodes; NH-6/NH-27 continuity Shillong→Jowai reachable.

### A2 — DEM slope enrichment (by h3)

- SRTM 30 m via the `elevation` python package. Sample along each edge geometry every ~50 m.
- Per edge: `mean_grade`, `max_grade` (max over 100 m windows, not single pixels — noise), both
  as percentages; store in graph.pkl edge attrs AND seed.sql columns.
- Fallback chain (§22.1-D3, in order, log which one you used): elevation-pkg SRTM → AWS Terrain
  Tiles via same package → OpenTopography API → grade proxy from OSM class+incline (DEGRADED —
  must set provenance flag and notify orchestrator).
- Verify: histograms plausible (plains ~0–3%, hill sections reaching 8–15%); spot-check 5 known
  steep roads vs 5 flat city streets.

### A3 — H3 grid, locations, seed fleet/deliveries → `seed.sql` (by h5)

- H3 res-7 index per segment (centroid); `h3_cells` table rows with geometry + population_class.
- Locations: 3 depots (Guwahati east, Nongpoh midpoint, Jowai), ~25 villages/towns snapped to
  graph nodes, ~10 health facilities (real names where OSM has them; else `kind=health` with
  plausible placement on routable nodes — provenance `seeded`). At least 4 villages must be
  hill-accessible ONLY via tracks/steep segments (that is where the truck-vs-4×4 story lives),
  at least 3 in flood-prone low elevation near the Brahmaputra.
- Fleet (§15.1 exact): 3 heavy (10 t), 4 mini (1 t), 3 4×4 (0.5 t), 1 ambulance, 1 accessible
  van. Fields per §25.2 `vehicles`.
- Deliveries: 35 rows across cargo types (medicine ×6 incl. 2 emergency-capable, food, water,
  emergency kit, general, 1 mobility-assist passenger), deadlines spread over sim hours 6–72,
  mixed destinations weighted toward the hill villages. The dataset MUST contain at least:
  one delivery only a 4×4 can complete, one crossing a weight-limited bridge (check §D2), one
  whose optimal route changes when the SCN-01 storm arrives (coordinate with Agent 05 at h8+).
- `cargo_types` rows with base_priority + risk_tolerance per §17.2.

### A4 — Weather timeline → `weather.json` (by h5)

- Pull Open-Meteo **archive** (a real heavy-monsoon week for the bbox centers; pick the wettest
  recent week you can find; log the dates) + **forecast** capture. Hourly rows: sim_hour 0–95,
  rain_mm_h, visibility, per weather-zone (3 zones: plains / mid-hills / high-hills).
- Shape the demo storm if reality is too mild: you may multiply intensities with a smooth
  ramp function peaking sim-h 18–30 — this is SIMULATED data and must be flagged so in
  provenance (honesty rule). Structure: quiet (0–14 h) → build (15–17) → peak (18–30) →
  decay (31–40) → quiet.

### A5 — Susceptibility priors + provenance (by h6)

- `suscept_landslide` per segment: normalized combination of max_grade (0.5), elevation-band ×
  slope-class interaction (0.3), curvature proxy (0.2). Range 0–1.
- `suscept_flood`: elevation percentile within floodplain zone + distance-to-major-river decays.
- GSI/Bhuvan historical layers: attempt fetch ONCE with a 10-minute cap; on any failure use the
  proxies above and set provenance. Do not burn the timeline on this.
- `data/provenance.json`: per-dataset `{source, obtained, mode: real|seeded|simulated,
  fallback_used, notes}` — this file feeds the /admin/data-provenance panel; Agent 03 renders it.

## Contract obligations (freeze h6–8)

You deliver to Backend: `graph.pkl` (format frozen: attrs listed in A1+A2), `seed.sql`
(schema-conformant, idempotent `ON CONFLICT DO NOTHING`), `weather.json`, `provenance.json`.
After freeze: **additive changes only**; any fix to segment IDs or schema columns needs
orchestrator sign-off (it breaks every downstream consumer).

## Verification before you hand off

Run yourself, include output in BUILD_LOG.md: (1) `dijkstra` Guwahati→Jowai on graph.pkl returns
a path; (2) seed.sql loads into empty Postgres with 0 errors; (3) row counts match §4.5 table;
(4) the A3 "must-contain" delivery scenarios verified by a short script; (5) every artifact file
loads in ≤ 2 s.

## Boundaries

No API servers, no frontend, no models. If OSM/DEM/weather acquisition fails entirely, use the
declared fallback and escalate — you never fabricate a road network.
