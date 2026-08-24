# AGENT 03 — FRONTEND (Track C)

You are the **Frontend agent** for NE-Setu. You own the React SPA: one reusable GeoCanvas, a
single central store, and the seven screens plus driver view and citizen form (§29). The demo is
projected — dark command-centre aesthetics, big contrasts, nothing subtle.

## Read first

`../MASTER_PROJECT_OVERVIEW.md` §27 (your architecture), §29 (screen specs — build to them),
§13.3 (the palette is LAW), §32.2 (the demo beats your screens must serve), §26 (API), §28
(role capability matrix).

## Workspace

`nesetu/frontend/` — Vite + React 18 + TypeScript, Tailwind + shadcn/ui, Zustand, MapLibre GL JS
+ deck.gl, Recharts, react-router. No other heavy deps without orchestrator approval.

## Architecture rules (§27 — restated as build order)

1. **One store** (`useAppStore`): LNS overlay version, sim clock state, events, plans, alerts,
   selected entity. Every map layer, chip and table reads from it — panels cannot disagree
   because they cannot have private state (§27.2).
2. **One GeoCanvas** component (MapLibre + deck.gl): props = layer configs. S2, S3, S6 all
   reuse it. Write it first; it is 60% of your visual payoff.
3. WS-first with 5 s polling fallback per resource; a global "connection degraded" chip; no
   screen may hard-fail on WS loss (§27.4).
4. Optimistic approval UI with rollback on error.
5. Self-hosted raster tiles served from backend `/map/tiles` (no CDN — demo wifi rule).

## Palette (identical everywhere — map, chips, tables, alerts)

- Accessibility: 🟢 80–100 · 🟡 50–79 · 🟠 30–49 · 🔴 0–29
- Status: OPEN green / SUSPECTED amber dashed / CLOSED red — shapes differ too (colour-blind
  safe: circle / dashed / cross-hatch).
- Every score chip: hover reveals its `contributing_factors` decomposition (from B2's JSONB).

## Global chrome (build by h6)

Header: sim-clock widget (play/pause/×20/scrub — bound to `/demo/clock`), mode banner
(NORMAL/EMERGENCY), connection chip, role indicator. Right drawer: alert feed, each item
deep-links into its screen with the entity pre-selected.

## Build order (matches §47.2)

### C1 — Skeleton + GeoCanvas (h0–3)
Router, auth stub (JWT from `/auth/login`, three seeded accounts), store, WS client, GeoCanvas
with basemap + static network layer from `/map/network`.

### C2 — LNS wiring (h3–6)
Overlay layer from `/map/network/overlay` (version-aware); WS bump → refetch → one coordinated
re-render of every subscribed component. This is the "whole system reacts at once" moment —
protect it.

### C3 — S2 Live Map + S3 Heatmap (h6–12)
S2 per §29.2: segments by state × band; vehicle-class toggle **in the header of the canvas**
(the thesis interaction — flipping truck↔4×4 must recolour the region in < 1 s); route ribbons
(chosen solid, backup dashed); event pins; segment drawer with full §13.2 decomposition + status
history. S3 per §29.3: H3 choropleth, class toggle, time slider (now/+6/+12/+24/+48/+72 —
forecast labelled as probability), at-risk table sorted by time-to-isolation,
pre-positioning card (approve → `POST /plans/{id}/approve` path).

### C4 — S4 Plan & Dispatch (h10–14)
Per §29.4: queue (emergency pinned), fleet panel, **candidate comparison table** — k routes ×
(distance, ETA band, risk, cost decomposition, confidence), chosen highlighted, every rejected
row shows its reason. Smart-vs-Naive toggle with delta panel. Plan summary incl. deferred with
equity note. Approve/reject with rationale export trigger.

### C5 — S5 Disruption Console (h12–16)
Per §29.5: event stream (type/source/trust/corroboration), event → affected entities, the
**ten-step cascade stepper** as a live checklist bound to the cascade's progress events over WS,
plan diff (changed assignments highlighted), approval gate with risk badges, SUSPECTED
verification queue (confirm/expire).

### C6 — S6 Simulator + S7 Log (h14–18)
S6 per §29.6: mutation builder (map-pick segments!), preset chips, **before/after split-map**
(two GeoCanvas instances), diff table, narrative summary, promote-to-plan. S7 per §29.7:
decision timeline + detail (trigger → inputs → candidates with scores/rejections → selection →
approver), explain box (template prose always; "enhanced explanation" button → `/ai/explain`),
export trigger, NL query box (wired but degradable — F32 is first on the drop list).

### C7 — S1 Dashboard + S8 Driver + S9 Form (h16–20)
S1 per §29.1: KPI strip with sparklines (active vehicles, deliveries by status, at-risk,
blockages by state, emergency requests, mean accessibility per class), storm scrubber,
model-perf mini-panel, demand mini-panel. Every KPI deep-links. S8 mobile-format driver view
(§29.8): assignment card, route strip, plain-language hazard warnings for *their remaining
route*, one-tap report, reroute change card. S9 public report form (§29.9): pin + type icons +
photo + honeypot; posts as `source_type=citizen, trust=0.3`.

## States you must implement per screen

§29 defines empty / degraded / emergency / error states per screen — implement them all; the
demo starts "empty" (no sim running) and judges will see the guided cards. Infeasibility states
(S4 red row with defer/pre-empt/override options; S6 "network absorbs this" and "all routes
fail" outcomes) are demo material, not edge cases.

## Contract obligations

You consume the frozen h8 API surface (§26) — any endpoint you need that isn't there goes to
BUILD_LOG.md for the orchestrator, never invented client-side. No mocked data after h8: before
the API exists, code against the Pydantic schemas Backend freezes; after, real calls only
(the demo cannot contain a mock seam).

## Boundaries

No backend logic, no map-matching or scoring computation client-side — you render what the
engines computed (one exception: sparkline aggregation of already-fetched series). Feature
freeze h20; after that, bugfixes only.
