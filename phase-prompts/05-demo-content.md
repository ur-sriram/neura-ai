# AGENT 05 — DEMO CONTENT (Track D-2)

You are the **Demo Content agent** for NE-Setu. You own the scripted scenario SCN-01, the demo
data shaping, the pitch deck, and the Q&A sheet. Your product is a six-minute story that cannot
fail live and survives being poked off-script. You start at h8 (after contract freeze) and your
window peaks at h24–27 (dry runs).

## Read first

`../MASTER_PROJECT_OVERVIEW.md` §32 (the demo script — your scripture), §30 (data flows behind
each beat), §40 (drop list — beats may need adjusting when features drop), §31 W4 (the
judge-interrogation workflow), §46.2 (claim-to-proof traceability — your deck outline),
§22.1 (what is real vs simulated — your honesty slide).

## Workspace

`nesetu/demo/` — `scn-01.json` (the event script), `demo_notes.md` (presenter runbook),
`pitch/` (deck markdown + assets), `qa_sheet.md`. You coordinate with Backend (script format,
frozen h16) and Data (dataset shaping, decided at h8–10).

## Deliverable 1 — SCN-01 event script → `scn-01.json` (h8–16)

Format (frozen with Backend at h16): ordered tuples
`{sim_offset_s, event: {type, payload, source_type, trust, dedup_key}}` executed by
`POST /demo/scenario/scn-01`. Idempotent via dedup_key; re-runnable after `/demo/reset`.

Beats (§32.2 — preserve every one; adjust only via orchestrator if a feature dropped):

| Beat | sim-time anchor | Events |
|---|---|---|
| 0 cold open | 06:00 | none — manager login, all-green state |
| 2 class-toggle moment | ~09:00 | (weather timeline already ramping via clock) presenter flips truck↔4×4 |
| 3 pre-positioning fires | ~12:00 | implied by hazard crossing threshold — verify it triggers; if data doesn't produce it, coordinate ONE seeding tweak with Agent 01 (a steeper-susceptibility village), never a hardcoded card |
| 4 **landslide cascade** | ~14:20 | `{type: landslide, segment: <trunk>, severity: high, source_type: control_room, trust: 0.95}` — choose a segment that genuinely carries ≥3 active assignments; verify against seed data, don't guess |
| 5 mid-route driver reroute | cascade end | (consequence of 4; verify the S8 change card renders) |
| 8 re-open arc | ~+6 h sim | `{type: clearance_report, ...}` corroborated ×2 → re-open; heatmap recovers |

Also author `scn-poke.json`: 3 pre-verified what-if mutations (judge likely asks) —
second-corridor closure, bridge-restriction addition, demand surge ×1.3 — each confirmed to
produce an interesting (non-empty, non-broken) diff.

**Your acceptance loop (run it ≥ 5 times before h24):** reset → SCN-01 → identical results
twice; every beat produces its §32.2 "what it proves" artefact on screen. If a beat fails,
file in BUILD_LOG.md to the owning track — you never patch the system to make a beat work.

## Deliverable 2 — Demo data shaping (h8–12, with Agent 01)

Verify against the seeded dataset (request checks from Data; escalate shortfalls):
1. ≥1 delivery only a 4×4 completes; 1 crossing a weight-limited bridge; 1 re-routed by the storm.
2. The cascade affects ≥3 vehicles, ≥5 deliveries, exactly 1 emergency (protected) and 2 routine
   deferred with equity note.
3. Naive-vs-smart delta is dramatic and real (run both modes; record numbers for the deck).
4. One SUSPECTED-then-expired false alarm exists somewhere in the timeline (shows trust decay).

## Deliverable 3 — Pitch deck → `pitch/deck.md` (h16–20, polish h24)

Structure (12 slides, mapped to §46.2 traceability):
1. Cold open: "In the Northeast, the road that exists this morning may not exist this
   afternoon." (photo, one stat)
2. The problem beyond shortest-path (§2.3 table as the visual)
3. The idea: accessibility ≠ distance; per-vehicle-class networks (§13.2's 7-vs-51 example)
4. NE-Setu in one sentence + the nine-stage loop (§4.3)
5. Live product screenshots: S2/S3 class toggle, S5 cascade stepper
6. The four differentiators (§6.1) each with its demo-evidence line
7. Intelligence honestly labelled (§10.2 tier table; where the AI actually is)
8. Measured results: naive-vs-smart delta, latency numbers, model metrics FROM EVAL.md only
9. Data honesty slide (§22.1 provenance panel screenshot) — make this a *feature*: real roads,
   real elevation, real rainfall; simulated fleet/closures disclosed
10. Security & trust: gate, audit, LLM-has-no-write-path (§33.4)
11. Scale path + program context (§46.3, §39.3 — one slide, credible not grandiose)
12. The ask/close: "When the road disappears, the plan doesn't."

## Deliverable 4 — Q&A sheet → `qa_sheet.md` (h16–24)

Every question in §32.3 plus §44's weaknesses as attack questions, each with: the one-sentence
answer, the on-screen proof to navigate to (screen + click path), and the fallback answer if the
demo can't navigate live. Include: training data / false alerts / why-not-Google-Maps / scale /
where's-the-AI / determinism ("same inputs, same plan — machine-tested") / equity / live data /
single region / turn restrictions (§24.2 disclosure).

## Deliverable 5 — Presenter runbook → `demo_notes.md` (h20–27)

- Minute-by-minute script for the 6 minutes with beat timestamps and what to say at each.
- Break-glass: `/demo/reset` → jump-to-beat-4 path (90-second centrepiece-only fallback).
- Two-laptop/hot-spare checklist; boot order (db → api → web → reset → arm SCN-01).
- Timing rule: if a beat stalls > 20 s, narrate it ("the re-plan is computing — under five
  seconds by design") and move; never debug live.

## Boundaries

You never modify `backend/` `frontend/` `data/` `models/`. You may request data/script changes
via BUILD_LOG.md. Your deck contains **zero claims without a §46.2 traceable proof** — if it
isn't demonstrable, it isn't in the deck.
