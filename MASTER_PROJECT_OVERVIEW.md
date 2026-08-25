# NE-SETU — MASTER PROJECT OVERVIEW

**AI-Powered Adaptive Logistics & Accessibility Intelligence Platform for Difficult Terrain**

**SIH Problem Statement:** SIH26002 — AI Smart Logistics Platform
**Document type:** Master source of truth (architecture + product blueprint)
**Build constraint:** Complete, demonstrable MVP in **27 hours** using AI coding agents
**Document status:** Final — revised once after self-evaluation (see Sections 43–46)

---

## HOW TO READ THIS DOCUMENT

This document is the **single source of truth** for the NE-Setu project. It defines *what* we
are building, *why*, *how the components relate*, *what technology is required*, and *what the
final system must do*. It deliberately does **not** dictate implementation order beyond the
build plan in Section 47 — separate phase plans (backend, frontend, AI/ML, GIS, database, API,
testing, deployment, documentation) will be generated from this document later.

Three conventions are used throughout, and they matter:

| Tag | Meaning |
|---|---|
| `[SOURCE]` | Directly derived from the SIH problem statement or the three provided idea documents. |
| `[PROPOSED]` | A new recommendation introduced by this analysis. Rationale always given. |
| `[ASSUMPTION]` | Unverified. Must be confirmed, or a stated fallback applies. |

Every dataset, API and model claim is marked **VERIFIED** (the source exists and was confirmed
to exist) or **ASSUMED** (plausible but unconfirmed). No API is invented. Where real-time data
cannot be guaranteed, a fallback is specified rather than glossed over.

---

## 0. SOURCE MATERIAL RECONCILIATION

Three input documents were provided. They do not agree with each other. Resolving those
disagreements *before* designing is the reason this document is coherent, so the conflicts are
recorded openly rather than silently averaged away.

### 0.1 What each source contributed

**File 1 — `richtext_converted_to_markdown.md` ("NE-Setu AI")**
A government program proposal. Strong on: regional framing, the multimodal insight (road /
rail / river / air / drone as one network), the Digital Twin concept, emergency command centre,
citizen accessibility for elderly and disabled users, stakeholder map, KPIs, privacy governance,
pilot geography, and a ₹3–5 crore budget over 36 months.
*Weakness:* it is a 36-month, multi-crore program. Almost none of it is buildable in 27 hours.
Its scope, taken literally, would guarantee a shallow demo across twelve half-features.

**File 2 — `e2b6e502-…md` (problem analysis)**
The sharpest strategic thinking of the three. Contributes the single most important idea in the
project: **Accessibility ≠ Distance**, and therefore *Best Feasible Route ≠ Shortest Route*. Also
contributes the Accessibility Score concept, vehicle-route co-optimization, dynamic re-routing as
the hero demo feature, emergency prioritization, the what-if simulator, the accessibility heatmap,
the three-user model, and the explicit warning not to build "ChatGPT + dashboard".
*Weakness:* it is analysis, not architecture. No schema, no data plan, no failure handling.

**File 3 — `53cd45da-…md` (technical implementation guide)**
Concrete tooling. Contributes the library and API survey (OSMnx, NetworkX, GeoPandas, PostGIS,
H3, OR-Tools, LightGBM/XGBoost, Prophet, MapLibre, deck.gl, Open-Meteo, Overpass, Sentinel,
Bhuvan), the Accessibility Score formula, the route cost formula, the Event Ingestion API idea,
the five agent design rules (LLM must not optimize; deterministic safety rules; every decision
explained; confidence scores; human-in-the-loop), and the automatic-vs-human-approved split.
Its most valuable single observation: **there is no clean API that says "Road X is blocked by a
landslide."** That constraint shapes the entire data architecture.
*Weakness:* proposes "1 supervisor + 7 specialized LLM agents", which contradicts File 2's own
warning and is architecturally wrong for this problem.

### 0.2 The five conflicts and their resolutions

**Conflict 1 — "Accessibility" means two incompatible things.**
File 1 uses it to mean *disability and elderly mobility* (ramps, wheelchair routes, assisted
transport). Files 2 and 3 use it to mean *terrain reachability* (can a vehicle physically and
safely get there right now). These are different products.

*Resolution:* **Terrain reachability is the core engine.** It is what SIH26002 asks for, it is
where the AI lives, and it is what the demo shows. Citizen accessibility is not discarded — it
survives as one narrow, fully-integrated slice: an **Assisted Mobility Request** is modelled as a
delivery whose cargo is a person, carrying a hard constraint requiring an accessibility-equipped
vehicle. It flows through the *same* optimizer, the *same* risk engine, the *same* approval gate.

*Why this resolution:* it costs roughly one hour of build time, adds a genuine social-impact
narrative that pure freight optimization lacks, and — critically — it demonstrates that the
constraint system is general rather than hardcoded for boxes. When a judge asks "could this
handle passengers?", the answer is a live demo rather than a promise. Conversely, building
File 1's full citizen app, IVR, SMS gateway and multilingual voice interface would consume the
entire 27 hours and produce a worse logistics platform.

**Conflict 2 — Program scope versus hackathon scope.**
File 1 plans 36 months and four phases. Files 2 and 3 both explicitly say "do not build all of
India; build one small extremely convincing region."

*Resolution:* Files 2 and 3 win for the build. File 1 wins for the *pitch*. File 1's
stakeholder map, KPI framework, privacy governance and pilot geography are retained as clearly
labelled **Future Scope** and **Program Context** sections (Sections 39 and 33), because they are
exactly what makes a government-facing pitch credible — but nothing in them is on the build
critical path. Drone airbridge, shared freight marketplace, ferry/air scheduling, SMS/IVR, and
the budget are all Future Scope, explicitly and honestly labelled as such.

*Why:* judges reward a working system plus a credible scaling story. They punish a broken system
with an ambitious roadmap. The roadmap is free; the working system is not.

**Conflict 3 — Seven LLM agents versus "do not overengineer".**
File 3 proposes a supervisor plus seven LLM agents. File 2 warns against LLM theatre. File 3's
*own* Rule 1 says the LLM must not be the optimizer. File 3 therefore contradicts itself.

*Resolution:* **Rejected as literal LLM agents. Implemented as deterministic pipeline stages.**
The eight "agents" become eight named, individually testable, deterministic pipeline stages
(Section 21). One LLM sits at the edge of the system doing only two jobs: rendering a stored
decision record into natural-language prose, and translating natural-language questions into
structured queries.

*Why this matters more than it appears:* an LLM-orchestrated pipeline is non-reproducible. The
same disruption could produce different reroutes on two runs. For a disaster-response system that
is disqualifying, and a judge asking "would it give the same answer twice?" exposes it instantly.
Deterministic stages are reproducible, unit-testable, fast (milliseconds, not seconds), free to
run, and cannot fail because an API key expired mid-demo. We keep the *conceptual* clarity of
File 3's agent decomposition — it is a genuinely good decomposition — and drop the LLM plumbing.

**Conflict 4 — Live external APIs versus demo reliability.**
File 3 recommends live Open-Meteo, OpenRouteService, Mappls. A hackathon demo runs on venue wifi.

*Resolution:* **Snapshot at build time, replay at demo time.** All external data is fetched once
during the build, validated, and baked into the database. A simulation clock replays the weather
timeline. Live API adapters are written behind an interface and are genuinely functional, but the
demo never depends on them. The seam is real: `WeatherProvider` has two implementations, and the
snapshot one is the default.

*Why:* no network call can break the demo. This is not a compromise on ambition — the risk model
consumes identical inputs either way. It also lets us *control time*, which is what makes a
72-hour disruption narrative fit into a 6-minute demo.

**Conflict 5 — Which routing engine.**
File 3 offers OSRM, Valhalla, GraphHopper, OpenRouteService, Mappls, Google, HERE, TomTom, and
"OSMnx + NetworkX custom graph".

*Resolution:* **OSMnx + NetworkX custom graph.** File 3 itself notes this gives "maximum
control", and control is the entire product. Hosted engines optimize a *fixed* cost function;
our cost function changes per request, per vehicle class, and per current hazard state. Bending
OSRM to that would take longer than writing our own Dijkstra over a pre-built graph, and would
hide the intelligence inside a black box we cannot explain to a judge.

*Why this is also the safer choice:* the intelligence being visibly ours is a scoring advantage.
"We compute a custom multi-factor edge cost and re-cost the graph on every hazard event" is a
stronger claim than "we call OpenRouteService with avoid-polygons."

### 0.3 Ideas explicitly rejected, with reasons

| Rejected idea | Source | Why rejected |
|---|---|---|
| Drone / helicopter airbridge module | F1 | No drone, no airspace clearance, no way to validate. Unfalsifiable claims lose credibility. → Future Scope. |
| Shared freight marketplace | F1 | A two-sided marketplace is a separate product with its own network-effects problem. Dilutes the decision-intelligence story. → Future Scope. |
| SMS / IVR / WhatsApp Business API | F1 | Requires paid accounts and approval workflows. Days of latency, zero visual payoff on a projector. → Future Scope. |
| Live satellite change detection (Sentinel / GEE) | F1, F3 | Multi-day latency, cloud cover in monsoon NE India, heavy geospatial pipeline. Cannot detect a landslide in demo-time. → Future Scope; historical imagery used as a static risk-prior layer instead. |
| Reinforcement learning for routing | F2 | No environment, no reward signal, no training time. Would be a random policy wearing an RL label. |
| Prophet for demand forecasting | F3 | Needs years of real per-commodity history we do not have. Replaced by a transparent seasonal-hazard-elasticity model (Section 18) that is honest about being a model rather than a fitted forecast. |
| Full citizen mobile app + offline maps | F1 | Second frontend. Halves the quality of the primary one. |
| Multimodal ferry / rail / air scheduling | F1 | Needs timetable data that is not openly available for the region. The *graph* is built mode-aware so this is a data problem later, not a rewrite. |
| Apache Superset dashboard | F3 | Heavy install, generic BI look. Custom React screens demo far better. |
| CrewAI / AutoGen multi-agent | F3 | See Conflict 3. |

### 0.4 Ideas merged or upgraded

- File 1's **Digital Twin** + File 2's **Accessibility Score** → the *Living Network State*: a
  single authoritative, versioned, timestamped model of every road segment's current traversability
  per vehicle class. This is the spine of the system and the merge is the document's central
  architectural move.
- File 2's **what-if simulation** + File 1's **pre-positioning** → the simulator does not only
  answer "what breaks?" but "what should we move *now* so that it does not matter?"
- File 3's **Event Ingestion API** + File 1's **community reporting** → one multi-source event
  pipeline with per-source trust weighting and a corroboration threshold (Section 34), which is
  also the answer to "what about false alerts?"
- File 2's **three users** + File 1's **four stakeholder tiers** → three roles for the MVP
  (Section 28). A fourth admin role is stubbed because model-monitoring screens do not demo.

---

## 1. EXECUTIVE SUMMARY

**NE-Setu** is an adaptive logistics decision-intelligence platform for regions where the road
network is not a stable object. In North Eastern India, a road that existed this morning may be
gone this afternoon — landslide, flood, bridge damage, washout. Every conventional logistics
system, from Google Maps to enterprise fleet management, is built on the assumption that the
network is fixed and only traffic varies. In the Northeast that assumption is simply false, and
it is the reason logistics there costs more, takes longer, and fails when it matters most.

NE-Setu replaces "find the shortest path" with a different question:

> **Given the current and forecast state of the terrain, weather, road conditions, vehicle fleet,
> and cargo priorities — what is the safest, most practical, most feasible way to move this
> specific resource to this specific place, and what do we do the moment that stops being true?**

The system runs a continuous nine-stage loop:

```
SENSE → UNDERSTAND → PREDICT → ASSESS → OPTIMIZE → APPROVE → ACT → MONITOR → RECALCULATE
                                                                          └──────↺
```

Four capabilities distinguish it, and each one is demonstrable rather than aspirational:

1. **A per-vehicle-class Accessibility Score for every road segment and every region**, recomputed
   as conditions change. A 4×4 and a 10-tonne truck get genuinely different networks, not the same
   network with different speeds.
2. **Cargo → Vehicle → Route co-optimization.** The system does not accept a vehicle assignment
   and then route it. It chooses both together, because on mountain roads the choice of vehicle
   *determines* which routes exist.
3. **Autonomous disruption response with a human approval gate.** A landslide event triggers
   automatic hazard propagation, accessibility recomputation, affected-entity identification, and
   replanning — then *stops* and presents a plan for a human to approve. The AI never dispatches
   into a high-risk zone on its own authority.
4. **What-if simulation over a forked system state.** An officer asks "what if the Shillong bypass
   also closes?" and receives a full impact analysis — affected vehicles, affected deliveries,
   emergency deliveries at risk, added delay, and the new plan — computed by the real engine on a
   real copy of real state, in seconds, with zero effect on live operations.

Every recommendation carries a stored, auditable explanation: the trigger, the inputs used, the
candidate options considered, the score of each, the reason each rejected option was rejected, and
a confidence value. This is not a nice-to-have. For government decision-making it is the
difference between a tool an officer can defend in an inquiry and one they cannot.

**Scope discipline.** This is a 27-hour build. The MVP covers one bounded region — the
Guwahati → Shillong → Jowai corridor, chosen because it contains Brahmaputra floodplain *and*
Khasi/Jaintia hill landslide terrain, so a single dataset exercises both hazard models. Within
that region every component is real: a real OSM road graph with real bridge weight limits, real
elevation-derived slope, real historical rainfall, a real constraint solver, real trained models.
Nothing in the demo is a mockup or a hardcoded response.

---

## 2. SIH PROBLEM UNDERSTANDING

### 2.1 What SIH26002 is literally asking for `[SOURCE]`

The statement asks for an AI-powered system that improves **logistics, accessibility, routing,
resource allocation, prediction, and emergency response in North Eastern India**, in a context
where terrain, weather, road conditions, remoteness, floods and landslides make logistics
difficult.

Read carefully, that sentence contains six deliverables, not one:

| Term in the statement | What it actually demands |
|---|---|
| **logistics** | Moving physical goods with vehicles, capacity, schedules and cost. |
| **accessibility** | A measure of *whether a place can be reached at all*, and how easily. |
| **routing** | Path selection — but under the constraints the other five terms impose. |
| **resource allocation** | Assigning finite vehicles and finite supplies to competing demands. |
| **prediction** | Forward-looking. Something must be forecast before it happens. |
| **emergency response** | A distinct operating mode with different priorities and different rules. |

The critical reading: **routing is one of six, not the whole thing.** A submission that builds a
router and calls it done has addressed roughly one-sixth of the statement. "Accessibility" and
"prediction" are listed as first-class deliverables alongside routing, and "resource allocation"
implies contention — multiple demands competing for one fleet.

### 2.2 The real decision problem behind the statement

Strip away the framing and the problem is this:

> **Sequential resource allocation under a non-stationary, partially-observable constraint graph
> with heterogeneous agents and priority-weighted demands.**

Unpacked, term by term, because each term maps to a design requirement:

- **Sequential** — decisions are made repeatedly over time, and each decision changes the state
  the next one is made in. A vehicle committed to a route is no longer available.
- **Non-stationary** — the graph itself changes. Edges disappear. This is the defining property
  and the reason existing tools fail. Traffic-aware routing handles *edge weights* changing;
  it does not handle *edges vanishing* and having to atomically re-plan a whole fleet.
- **Partially-observable** — we do not know the true road state. We infer it from rainfall, slope,
  history and unreliable human reports. Every accessibility number is an estimate with a
  confidence, and the system must be honest about that.
- **Heterogeneous agents** — a 4×4 and a 10-tonne truck do not experience the same network.
  A bridge with a 5-tonne limit exists for one and does not exist for the other.
- **Priority-weighted demands** — anti-snake-venom to a health centre and a parcel of shoes are
  not interchangeable. Under scarcity the system must be able to say *whose delivery gets delayed*.

Designing for that sentence, rather than for "shortest route", is what produces the architecture
in Section 21.

### 2.3 Shortest Route vs Best Feasible Route `[SOURCE — File 2, the project's core insight]`

This distinction is the intellectual centre of the project, so it is worth stating precisely.

**Shortest route** minimises a single static scalar — distance, or free-flow travel time — over a
graph assumed to be fully traversable.

**Best feasible route** is a two-stage decision:

1. **Feasibility (a hard filter).** Which routes are *possible at all* for this specific vehicle,
   in the network's current state? A route through a closed segment is not a slow route; it is not
   a route. A route across a 5-tonne bridge does not exist for a 10-tonne truck. Feasibility is
   binary and non-negotiable, and no optimizer, no model and no LLM may trade it away.
2. **Desirability (a soft ranking).** Among the feasible routes, which best balances travel time,
   hazard risk, road-surface quality, terrain difficulty, vehicle suitability, and the cargo's
   priority? These are commensurable and weighted.

The canonical illustration, adapted from File 2 `[SOURCE]`, using a 10-tonne truck:

| Route | Distance | Current condition | ETA | Landslide risk | Verdict |
|---|---:|---|---:|---:|---|
| Route 1 | 80 km | Segment R-114 closed (landslide, confirmed) | — | — | **Infeasible.** Not ranked. |
| Route 2 | 110 km | Open, sealed surface | 3 h 05 m | 0.12 | **Recommended.** |
| Route 3 | 95 km | Open, unsealed, 11% grade | 5 h 20 m | 0.34 | **Backup.** |
| Route 4 | 88 km | Open, but bridge B-31 limit 5 t | — | — | **Infeasible for this vehicle.** |

A distance-minimising algorithm returns Route 1 and the delivery fails on the road, hours later,
with a vehicle stranded and no fallback. Naive time-minimisation returns Route 4 and the truck is
turned back at the bridge. NE-Setu returns Route 2 and, crucially, *states why*: Route 1 and
Route 4 are reported as excluded with the specific reason for each, and Route 3 is offered as the
backup so the operator retains agency.

Two consequences follow from this that shape the whole system:

- **Rejected options are part of the output, not discarded intermediate state.** An operator who
  sees only the winner cannot trust it. An operator who sees the four candidates and why three
  lost can. This is why `DecisionRecord` persists candidates (Section 25).
- **Feasibility is vehicle-specific, therefore routing must be vehicle-specific, therefore vehicle
  and route must be chosen together.** Route 4's infeasibility is not a property of Route 4; it is
  a property of the *pair*. This is the formal justification for Section 15's co-optimization.

### 2.4 Why North Eastern India specifically `[SOURCE — all three files]`

The region is not merely "difficult terrain". It has a specific combination of properties, and
each one breaks a specific assumption that conventional logistics software relies on.

**Terrain.** Mountainous topography with steep slopes, narrow carriageways, hairpin bends, and
very few parallel corridors. The operational consequence is *low route redundancy*: in a plains
network, losing one road means a 10% detour; in the hills it can mean a 200 km detour or complete
isolation. A 50 km road distance is not a 50 km journey — sustained gradients can halve effective
speed, and gradient is not in most road datasets. **Broken assumption:** that distance predicts
time, and that alternatives always exist.

**Monsoon intensity.** The region includes some of the wettest inhabited places on earth. The
problem is not rain as an inconvenience but rain as a *state-change trigger*: accessibility can
invert within a single working day. File 2's illustration `[SOURCE]` — Road A open at 09:00,
landslide at 14:00, Road A gone — is the normal case, not the edge case. **Broken assumption:**
that the network topology is constant over the duration of a delivery.

**Landslides.** Rainfall-triggered slope failure is the dominant road-closure mechanism in the
hill districts. It is *partially predictable*: susceptibility is a function of slope angle, soil
and lithology, land cover, and — most usefully — **antecedent rainfall**, the cumulative rain over
the preceding days that saturates the soil. This predictability is precisely what makes an AI
system worth building rather than a dashboard. **Broken assumption:** that closures are random and
therefore only reactive handling is possible.

**Floods.** In the Brahmaputra and Barak basins, seasonal inundation removes road access across
wide areas for extended periods. Unlike landslides — a point failure on one segment — floods are
*areal*: they disconnect whole clusters of villages simultaneously, and the failure is
spatially correlated, so alternative routes tend to fail together. **Broken assumption:** that
failures are independent, so having a backup route is sufficient.

**Bridges and river crossings.** Numerous crossings, many with weight, width or height
restrictions, several single-lane. A bridge is a *cut vertex* in graph terms — its loss can
disconnect a subgraph entirely, with no alternative at any distance. **Broken assumption:** that
the graph stays connected.

**Remoteness and last-mile fragility.** Many villages are served by a single unsealed track. The
final 5 km is often harder than the preceding 200 km, and is frequently the part with the worst
data quality. **Broken assumption:** that map data quality is uniform.

**Fleet heterogeneity, and it is not optional.** Because of the above, the fleet *must* be mixed —
heavy trucks for trunk hauls, mini-trucks for district roads, 4×4s for hill last-mile. This is a
practical necessity, and it is exactly what makes vehicle-route co-optimization the right model
rather than an over-refinement.

**Data fragmentation `[SOURCE — File 1]`.** Road authority data, IMD weather, disaster management
alerts, health facility inventories and transporter fleets sit in separate systems with no common
spatial key. Nobody has a single view. **Broken assumption:** that the operator has the
information needed to decide well. Often the information exists but not in one place — and fusing
it is a large part of the value NE-Setu delivers.

**Emergency co-incidence.** The moment the network degrades is the same moment demand for critical
supplies spikes. Capacity falls and demand rises together. **Broken assumption:** that normal-mode
optimization is adequate; the system needs a genuinely different objective function under
emergency, not a tweaked weight.

### 2.5 What the system must therefore be able to do

Derived directly from 2.4, each item traceable to a broken assumption:

1. Maintain a **live, versioned model of network traversability**, per vehicle class, that can
   change during a delivery.
2. **Predict** hazard-driven closures before they occur, using antecedent rainfall and slope.
3. Treat **feasibility as a hard constraint** that nothing may override.
4. **Co-optimize** vehicle and route.
5. **Re-plan atomically** across the whole affected fleet when the graph changes — not one vehicle
   at a time, because vehicles compete for the remaining capacity.
6. Handle **priority contention** explicitly and visibly.
7. Support a **distinct emergency mode**.
8. **Explain every decision** with the alternatives considered and the reason each lost.
9. **Require human approval** for consequential and irreversible actions.
10. **Degrade gracefully** when data is missing, stale, contradictory or wrong — which is the
    normal condition, not the exception.

---

## 3. REAL-WORLD PROBLEM ANALYSIS

Section 2 established what the statement asks. This section examines the operational reality the
system must survive, because several of these realities dictate architecture directly.

### 3.1 The information problem is worse than the optimization problem

It is tempting to treat this as an optimization challenge. It is not, primarily. The optimization
is tractable — OR-Tools solves fleet assignment for our problem size in well under a second. The
hard part is that **the inputs to the optimization are unknown, stale, or contradictory.**

Specifically `[SOURCE — File 3's key observation]`: **there is no API that reports "Road X is
currently blocked by a landslide."** No authoritative, machine-readable, region-wide real-time
road status feed exists for North Eastern India. This is not an oversight in our research; it is a
property of the domain, and it is arguably the single most important design input in this document.

Everything follows from it:

- Road state must be **inferred** from proxies (rainfall, slope, history) and **asserted** by
  humans (drivers, control rooms, field staff), never simply *read*.
- Every state value therefore carries **provenance and confidence**.
- Human reports are **unreliable** — mistaken, exaggerated, duplicated, or occasionally malicious —
  so the ingestion pipeline needs trust weighting and corroboration, not blind acceptance.
- The system must remain useful **at low confidence**, by widening ETA bands and escalating to
  human judgement rather than by falling silent or bluffing.

A submission that ignores this and assumes clean real-time road data has, in effect, solved a
problem that does not exist. Confronting it directly is a differentiator.

### 3.2 Uncertain travel times are structural, not noise

In a well-mapped plains network, travel time variance is modest and roughly symmetric. Here the
distribution is **heavy-tailed and asymmetric**: most journeys take roughly the expected time, and
a meaningful fraction take two to five times longer, or never complete. Causes include convoy
formation behind slow heavy vehicles on single-lane gradients, partial blockages requiring manual
clearance, one-way alternating traffic through damaged sections, and ferry or crossing waits.

**Design consequence:** a point ETA is misleading and, in an emergency, dangerous. The system
outputs an **ETA with an uncertainty band and a confidence value** (Section 11). An officer
deciding whether medicine arrives before a patient deteriorates needs "3 h 05 m, likely range
2 h 50 m – 4 h 30 m, confidence 0.74", not "3 h 05 m". Presenting the band is more honest *and*
more useful, and it is a visible sophistication in the demo.

### 3.3 Delivery prioritisation is a rationing problem

Under normal operation, prioritisation is scheduling. Under disruption it becomes **rationing**:
capacity has fallen, demand has risen, and some deliveries will not happen today. The system must
therefore be able to state, explicitly and defensibly, *which* deliveries are being deferred and
why — and a human must own that decision.

**Design consequence:** priority is a computed, explainable score (Section 17), deferral is an
explicit recorded outcome rather than a silent failure, and emergency-mode reprioritisation passes
through the approval gate.

### 3.4 The false-alert problem is a first-class requirement

If drivers and field staff can report closures, the system will receive wrong reports. If a single
report can close a road, then a single mistaken report can strand a fleet, and one malicious report
becomes a denial-of-service against regional logistics.

**Design consequence:** a **three-state road model** — `OPEN` / `SUSPECTED` / `CLOSED` — with
transitions governed by source trust and corroboration (Section 16.4). A single low-trust report
moves a segment to `SUSPECTED`, which raises its cost heavily but does not remove it, and raises an
operator verification task. `CLOSED` requires a trusted source or corroboration. This is the honest
answer to a question judges reliably ask.

### 3.5 Government and disaster-response requirements `[SOURCE — File 1]`

Operating in a government context imposes constraints a purely commercial tool escapes:

- **Auditability.** Decisions affecting public safety must be reconstructible after the fact:
  what was known, when, what was recommended, who approved it. This is why `DecisionRecord` is a
  core entity rather than a logging concern.
- **Accountability.** A named human must own consequential decisions. The system recommends;
  a person decides. Section 33 defines exactly where that boundary sits.
- **Explainability.** An officer must be able to justify the action to a superior, a minister, or
  an inquiry. "The model said so" is not a justification.
- **Equity.** Optimising purely for cost systematically disadvantages remote, low-volume villages —
  exactly the places the problem statement is concerned with. Section 12.6 addresses this with an
  explicit equity term, which is both ethically right and a strong pitch point.
- **Sovereignty and privacy `[SOURCE — File 1]`.** Government deployment favours self-hostable,
  open components and minimal personal data. Our stack is fully self-hostable and the only LLM
  dependency is optional and non-critical (Section 33).

### 3.6 What conventional systems get wrong, precisely

Not a competitive dismissal — a specification of the gap we fill.

| System class | What it does well | The specific gap |
|---|---|---|
| Consumer navigation (Google/Apple Maps) | Excellent base map; live traffic; superb UX | Optimises for a single car. No cargo, no fleet, no capacity, no priority, no vehicle-class constraints, no hazard forecasting, no explanation, no approval workflow, no re-plan across vehicles. Traffic-aware, not *closure-predictive*. |
| Enterprise fleet management | Tracking, telematics, compliance, cost reporting | **Descriptive, not prescriptive.** Tells you where vehicles are; does not decide where they should go when a road disappears. Assumes a stable network. |
| Route optimization / VRP tools | Strong multi-stop optimization | Solves a *static* VRP over a *fixed* cost matrix. Our matrix mutates mid-execution. No hazard model, no vehicle-class feasibility, no re-plan trigger. |
| Weather dashboards | Accurate meteorology | Stop at the forecast. Do not connect rainfall to *this road segment's* traversability for *this vehicle* carrying *this cargo*. No decision output. |
| Disaster management dashboards | Situational awareness, incident logging | Report what has happened. Do not produce an executable logistics plan, and do not close the loop from hazard to vehicle assignment. |

The gap is consistent across all five: **nobody joins hazard prediction to fleet-level executable
decisions with an audit trail.** That join is NE-Setu.

---

## 4. PROPOSED SOLUTION

### 4.1 One-sentence definition

> **NE-Setu is a decision-intelligence platform that maintains a live, per-vehicle-class model of
> which roads in a difficult-terrain region are actually usable right now and in the next 72 hours,
> and continuously converts that model into approved, explained, executable logistics plans.**

### 4.2 The central architectural idea: the Living Network State

Every capability in the system is a read from, or a write to, one shared object. Naming it and
centralising it is the single most important structural decision in this document.

**Living Network State (LNS)** is the authoritative, versioned, timestamped answer to:

> For every road segment, for every vehicle class, right now and at each forecast horizon:
> **is it passable, how costly is it, how risky is it, how confident are we, and why?**

The LNS is not a table of static road attributes. It is a *computed, continuously refreshed
overlay* on the static road graph, holding per segment and per vehicle class:

- `status` ∈ {`OPEN`, `SUSPECTED`, `CLOSED`} with provenance and timestamp
- `accessibility_score` 0–100
- `landslide_probability`, `flood_probability` at horizons 0/6/12/24/48/72 h
- `effective_speed_kph` (terrain- and weather-adjusted, model-derived)
- `traversable` boolean (hard-constraint outcome for this vehicle class)
- `confidence` 0–1
- `contributing_factors` — the itemised inputs that produced the above

Why centralising this matters, concretely:

- **It removes duplicated logic.** Routing, the heatmap, the optimizer, the simulator and the
  explanation layer all read the same numbers, so they cannot disagree. Without this, the map shows
  one risk value and the router uses another, and a judge will find it.
- **It makes the demo's causal chain visible.** Rainfall rises → LNS updates → the map recolours →
  routes re-cost → the plan changes → deliveries re-prioritise. One update propagates everywhere,
  which is exactly the story we want to tell.
- **It makes what-if cheap.** Simulation is "fork the LNS, mutate the fork, re-run the pipeline
  against the fork." Because everything reads from one object, forking one object forks the whole
  world. Our headline differentiator costs one endpoint instead of a parallel implementation.
- **It makes explanation free.** `contributing_factors` is captured during computation, so the
  explanation is a by-product rather than a reconstruction.

### 4.3 The nine-stage loop

File 2 proposes `Predict → Assess → Optimize → Act → Recalculate` `[SOURCE]`. We extend it to nine
stages, and the two additions are deliberate `[PROPOSED]`:

```
   ┌──────────────────────── REAL WORLD ─────────────────────────┐
   │                                                             │
   ↓                                                             │
1 SENSE          Weather snapshot, human event reports,          │
                 vehicle telemetry, delivery requests            │
   ↓                                                             │
2 UNDERSTAND     Validate, deduplicate, trust-weight,            │
                 corroborate, map to road segments               │
   ↓                                                             │
3 PREDICT        Landslide / flood probability per segment;      │
                 ETA distributions; demand forecast              │
   ↓                                                             │
4 ASSESS         Accessibility Score per segment × vehicle       │
                 class; regional hex aggregation → LNS           │
   ↓                                                             │
5 OPTIMIZE       Feasible-route generation, then joint           │
                 cargo→vehicle→route assignment (CP-SAT)         │
   ↓                                                             │
6 APPROVE   ★    Human gate for consequential actions;           │
                 auto-commit for routine ones                    │
   ↓                                                             │
7 ACT            Commit plan, notify drivers, update state       │
   ↓                                                             │
8 MONITOR   ★    Track progress vs plan; detect deviation;       │
                 evaluate prediction accuracy                    │
   ↓                                                             │
9 RECALCULATE    On any material change, re-enter at stage 1     │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
```

★ **Why APPROVE was added.** File 2's loop is fully autonomous. For disaster logistics that is
both unsafe and unsellable. An officer will not deploy a system that redirects ambulances without
asking. Making approval an explicit *stage* rather than a UI afterthought means the architecture
cannot bypass it — the plan is `PROPOSED` until a human transitions it, and `ACT` reads only
approved plans.

★ **Why MONITOR was added.** Without it the system predicts but never learns whether it was right.
Monitoring compares predicted ETA to actual and predicted closure to observed, producing a live
model-accuracy panel. This converts "we trained a model" into "here is how it is performing", which
is a materially stronger claim under questioning.

### 4.4 The eight pipeline stages `[SOURCE — File 3's agent decomposition, re-implemented]`

File 3's eight agents are retained as a decomposition and implemented as deterministic modules.
Each is a pure-ish function: same inputs, same outputs, individually unit-testable, no LLM.

| # | Module | Responsibility | Reads | Writes |
|---|---|---|---|---|
| 1 | **Event Ingestor** | Normalise, validate, dedupe, trust-weight, corroborate all incoming signals | Weather, reports, telemetry | `Event`, `RoadStatus` transitions |
| 2 | **Hazard Engine** | Landslide and flood probability per segment per horizon | Rainfall, slope, soil, history | `HazardForecast` |
| 3 | **Accessibility Engine** | Accessibility Score per segment × vehicle class; H3 aggregation | Hazard, surface, grade, restrictions | **LNS**, `RegionAccessibility` |
| 4 | **Route Engine** | Generate *k* feasible, diverse, scored candidate routes | LNS, graph, vehicle spec | `RouteCandidate[]` |
| 5 | **Vehicle Matcher** | Score vehicle suitability for cargo × destination × conditions | Fleet, cargo, terrain | suitability matrix |
| 6 | **Priority Engine** | Compute delivery priority; apply emergency escalation | Cargo class, deadline, hazard, population | `priority_score` |
| 7 | **Plan Optimizer** | Joint assignment under hard and soft constraints (CP-SAT) | All of the above | `Plan` (status `PROPOSED`) |
| 8 | **Explanation Layer** | Render stored decision records to prose; answer NL queries | `DecisionRecord` | text |

Module 8 is the only one that may call an LLM, and it has a template fallback that produces the
same information with no API dependency (Section 35).

**Why deterministic modules beat LLM agents here** — the version to give a judge who asks:
identical inputs give identical outputs, so the system is reproducible and defensible; each module
is unit-testable, so we can assert that a 10-tonne truck is *never* routed over a 5-tonne bridge;
latency is milliseconds rather than seconds, so re-planning during a live demo is instant; there is
no per-decision API cost; and there is no possibility of a model hallucinating a road that does not
exist. The LLM does what LLMs are genuinely best at — turning structured data into readable prose —
and nothing else.

### 4.5 Region and scale of the MVP

**Region:** bounding box covering the **Guwahati → Shillong → Jowai** corridor
(approximately 25.30°N–26.30°N, 91.30°E–92.60°E). `[PROPOSED]`

**Why this specific corridor** — three reasons, all load-bearing:

1. **It contains both hazard types.** The northern end sits in the Brahmaputra floodplain
   (flood-dominated, low elevation, areal failures). The southern end is Khasi–Jaintia hills
   (landslide-dominated, steep gradients, point failures). One dataset exercises both models. A
   flood-only or landslide-only region would leave half the hazard engine undemonstrated.
2. **It is a real, economically significant corridor.** NH-6 / NH-27 carrying genuine freight
   between Assam's largest city and Meghalaya's capital. The scenario is not invented.
3. **The elevation gradient is dramatic** — roughly 50 m to over 1,500 m within ~100 km. Slope,
   grade-adjusted speed and vehicle-class differentiation are all strongly visible in the data, so
   the intelligence *shows* on the map instead of needing to be explained.

**MVP scale** `[SOURCE — Files 2 and 3 both recommend a small convincing region]`:

| Entity | Count | Rationale |
|---|---:|---|
| Road segments | 3,000–8,000 | Whatever OSM yields in the bbox for drivable classes. Large enough to be credibly real, small enough to re-cost the whole graph in well under a second. |
| Locations (depots, villages, health facilities) | 30–40 | 3 depots, ~25 villages/towns, ~10 health facilities. Enough for visual density. |
| Vehicles | 12 | 3 heavy trucks, 4 mini-trucks, 3 4×4s, 1 ambulance, 1 accessible van. Enough for contention to be real. |
| Deliveries | 30–40 | Mixed cargo classes including 4–6 emergency. Enough that re-planning visibly matters. |
| Weather timeline | 96 h | Hourly, seeded from real historical monsoon data. Covers the demo arc with headroom. |
| Simulated hazard events | 6–8 | Scripted, plus unlimited operator-triggered ones. |

**Why not larger:** every additional entity costs build time and demo clarity, and adds no scoring
credit. A judge does not reward 500 vehicles; they reward 12 vehicles being re-planned correctly
and explainably in front of them.

**Why not smaller:** below roughly 10 vehicles and 25 deliveries there is no genuine contention,
so the optimizer's output looks like something a human could have done by hand — which undercuts
the entire premise.

---

## 5. CORE PRODUCT VISION

### 5.1 Identity

| Field | Value |
|---|---|
| **Product name** | **NE-Setu** `[SOURCE — File 1]` |
| **Etymology** | *Setu* (सेतु): bridge. The product is the bridge between a changing landscape and a fleet that must keep moving. |
| **Tagline** | *When the road disappears, the plan doesn't.* |
| **Category** | Adaptive logistics & accessibility decision-intelligence platform |
| **One-line description** | The system that knows which roads in the Northeast are actually usable — for which vehicle, right now, and for the next 72 hours — and turns that knowledge into approved, explainable logistics plans. |
| **Form factor** | Web application: role-based dashboard + live geospatial digital twin |
| **Deployment** | Single docker-compose stack; fully self-hostable |

### 5.2 Vision statement

> For the logistics operators, disaster-response officers and health administrators of North
> Eastern India, NE-Setu replaces telephone calls, guesswork and post-hoc improvisation with a
> continuously-computed, continuously-explained model of reachability — so that when the monsoon
> takes a road, the region's supply plan survives it.

### 5.3 Product principles

Six non-negotiables. Every screen, model and API in this document traces to at least one.

1. **Accessibility before optimality.** The system's first question is never "what is fastest?"
   but "what is *possible*?" Hard feasibility filters out infeasible options before any scoring
   begins, and nothing downstream can resurrect them.
2. **Every decision explains itself.** No recommendation appears without its alternatives, its
   inputs, and its rejection reasons. A user should never have to trust the system; they should
   be able to check it. (Section 35)
3. **Humans own consequential decisions.** The system computes; people commit. Emergency
   reassignment, priority override, and dispatch into elevated risk all stop at the gate. (Section 33)
4. **Honesty under uncertainty.** Confidence is displayed, ETA is a band not a point, low
   confidence escalates rather than bluffing, and unknown data is shown as unknown. A tool that
   fabricates certainty in a disaster is worse than no tool. (Sections 11, 34)
5. **The network is alive.** Nothing about road state is cached as eternal. Every score is
   timestamped, every change is event-sourced, and the whole plan can be re-derived at any moment.
6. **Simplest sufficient intelligence.** Deterministic rule where a rule suffices; ML where it
   genuinely improves on the rule; LLM only for language. Nothing is in the stack to sound
   impressive. (Section 12.7)

### 5.4 What NE-Setu is *not*

Defining the negative space guards against scope drift during the build:

- **Not a navigation app.** No turn-by-turn. Drivers receive an ordered waypoint plan and hazard
  warnings; the intelligence lives above the navigation layer.
- **Not a fleet telematics product.** It consumes vehicle position; it does not provide GPS
  hardware, fuel monitoring or compliance reporting.
- **Not a weather service.** It consumes weather; its contribution is connecting rainfall to the
  traversability of this specific road for this specific vehicle.
- **Not an autonomous dispatcher.** It recommends and prepares; a human commits.
- **Not a marketplace.** `[Source reconciliation 0.2]` No freight matching, bidding or payments.

---

## 6. KEY INNOVATION

### 6.1 The four differentiators `[SOURCE — synthesized from Files 2 and 3, sharpened]`

**1. Accessibility as a computed, first-class, per-vehicle-class entity.**
Existing systems treat "can I get there?" as a binary implicit in routing. NE-Setu computes an
explicit, continuously-refreshed **Accessibility Score (0–100) for every road segment and every
region, per vehicle class**, combining hazard probability, surface, gradient, restrictions,
weather and confidence. This single object powers routing, the heatmap, prioritisation,
pre-positioning and the what-if simulator. It is the product's intellectual core, and no
mainstream system offers it. *Demo evidence: the heatmap recolouring as the storm advances, with
different colours for a truck versus a 4×4 over the identical terrain.*

**2. Joint cargo → vehicle → route optimization over a mutating graph.**
Fleet tools assign vehicles then route them. Navigation tools route one vehicle. Neither handles
the co-dependence: on hill roads the vehicle choice *determines the route set* (a 10-tonne truck
and a 4×4 see literally different networks — bridges, grades, fords), and the route determines
which vehicle is efficient. NE-Setu optimizes the assignment jointly under hard constraints, and
re-solves atomically across the whole affected fleet when the graph changes. *Demo evidence:
rerouting one vehicle is shown alongside the cascade — three other vehicles re-shuffled because
releasing one road changed the optimal assignment for everyone.*

**3. Closed-loop autonomous replanning with a human gate.**
Weather- and event-driven changes propagate: hazard model → accessibility → candidate routes →
fleet re-assignment → priority re-ranking → **proposed** plan → one-click human approval → driver
notification. The loop runs in seconds and every hop is auditable. The human gate is what makes an
autonomous-looking system deployable by a government. *Demo evidence: the full cascade playing out
live after one scripted landslide, ending on an approval dialogue, not a surprise.*

**4. Counterfactual simulation over a forked live state.**
"What if the Shillong bypass also goes?" — asked against a *forked copy of the real current
system state*, answered by the *real engine*, returned as a structured before/after diff:
affected vehicles, affected deliveries, emergency deliveries at risk, added delay, and the new
plan. Not a canned scenario; any segment, any combination, any time offset. This turns the
platform from reactive tool into planning instrument, and it is the feature judges are invited to
drive themselves. *Demo evidence: the judge's own question, answered live.*

### 6.2 Why the combination is defensible

Individually, pieces exist: hazard models exist in research, VRP solvers are off-the-shelf, maps
with weather overlays are commodity. The defensible claim is the **join**: hazard probability →
per-class traversability → fleet-level executable plan → explanation → approval → audit, as one
closed loop on one shared state object. Section 3.6's gap analysis shows no system class makes
that join. During the demo, the join is the story: one rainfall event, four consequences, all
traceable.

### 6.3 Innovation discipline `[PROPOSED]`

Innovation claims are deliberately kept falsifiable. Every differentiator above has a *demo
evidence* line — something a judge can see happen, poke, or ask a hostile question about. Anything
that could not be demonstrated in the 27-hour build was moved to Future Scope rather than claimed.
An unfulfilled ambitious claim is a liability under questioning; a fulfilled modest one is an asset.

---

## 7. TARGET USERS

Three roles for the MVP `[SOURCE — File 2's three-user model]`. File 1's broader stakeholder
universe is retained as program context (Section 39.3) but does not add build scope.

### 7.1 Logistics Manager (primary operator persona)

- **Who:** district-level logistics coordinator running daily fleet operations.
- **Job to be done:** dispatch the day's deliveries efficiently, absorb disruptions without
  missing critical deliveries, and defend the day's decisions afterwards.
- **Needs:** operational dashboard; plan creation and one-click approval; live map; disruption
  alerts with impact already computed; the why behind every recommendation.
- **Success:** critical deliveries land on time through a bad-weather week; replanning after a
  closure takes 30 seconds instead of 15 phone calls.
- **Screens:** Dashboard, Plan & Dispatch, Live Map, Disruption Console, Decision Log.

### 7.2 Government / Disaster Management Officer (strategic persona)

- **Who:** district disaster-management or health officer responsible for regional continuity.
- **Job to be done:** see which areas are becoming unreachable, get ahead of it (pre-position),
  and direct scarce emergency capacity where it matters most.
- **Needs:** accessibility heatmap by vehicle class; at-risk population/demand view; emergency
  mode; what-if simulation; exportable situation reports.
- **Success:** acting 24 hours *before* a closure rather than 24 hours after; a defensible
  prioritisation record for every scarce resource.
- **Screens:** Heatmap, Dashboard, What-if Simulator, Disruption Console, Decision Log.

### 7.3 Driver (field persona — deliberately minimal)

- **Who:** vehicle operator with a basic smartphone.
- **Job to be done:** know today's assignment, follow a route that is actually open, get warned
  before hazards, report conditions from the road.
- **Needs:** single-scroll assignment card; ordered waypoints; hazard warnings in plain language;
  one-tap road reporting.
- **Explicitly not given:** analytics, planning tools, configuration. The driver view is a
  read-mostly surface — depth lives in the two officer roles.
- **Screens:** Driver view (one screen, mobile-format).

### 7.4 Field-reporting citizen (thin slice) `[PROPOSED — from reconciliation 0.2]`

An unauthenticated road-report form (report a blockage with type, location, photo) feeding the
same Event Ingestor as driver reports, at low trust weight. It demonstrates the multi-source
corroboration design (Section 16.4) with ~30 minutes of build cost. *Not* a citizen app; a form.

**Roles excluded from MVP** `[per master prompt "do not include unnecessary roles"]`:
Administrator (config is file-based), Transporter/marketplace participant, Analyst. Model
performance monitoring — the one genuinely useful admin surface — is a Dashboard panel visible to
all officer roles instead.

---

## 8. MAJOR USE CASES

Eight use cases. UC-1…UC-6 are MVP-demostrable; UC-7 and UC-8 are future-scope narratives used in
the pitch. UC-1, UC-4 and UC-5 map directly onto the demo script (Section 32).

### UC-1 — Routine dispatch under normal conditions `[MVP]`
*Actor:* Logistics Manager. *Trigger:* morning dispatch window.
System computes accessibility from the overnight weather state, scores candidate routes per
delivery, jointly assigns the 12-vehicle fleet to ~35 deliveries under capacity/priority/window
constraints, and presents the plan with per-assignment rationale. Manager reviews exceptions,
approves, drivers are notified. *Shows:* baseline competence — the optimizer and explanation
layer working at zero drama.

### UC-2 — Weather-driven pre-emptive rerouting `[MVP]`
*Actor:* System (autonomous) + Manager. *Trigger:* 48-hour heavy rainfall forecast for the hill
sector.
Hazard Engine raises landslide probability on susceptible segments; accessibility decays; routes
through high-risk corridors are re-costed; the optimizer proposes shifting three deliveries to the
longer southern corridor *today* rather than risking tomorrow's closure. Manager sees the tradeoff
(+40 min now vs 71% chance of a 6-hour closure tomorrow) and approves. *Shows:* prediction →
action, not prediction → dashboard.

### UC-3 — Sudden road closure with fleet-wide replanning `[MVP — demo centrepiece]`
*Actor:* System + Manager. *Trigger:* confirmed landslide on a trunk segment.
Full cascade: segment `CLOSED` → LNS update → heatmap recolour → affected vehicles and deliveries
identified → alternative routes generated → fleet re-assigned (releasing one road changes
everyone's optimum) → ETA bands updated → emergency deliveries protected → **proposed** plan →
approval → driver notifications. Every hop logged as one auditable decision. *Shows:* the whole
product in ninety seconds.

### UC-4 — Emergency medicine delivery `[MVP]`
*Actor:* Disaster Officer. *Trigger:`* urgent request — anti-snake-venom to a remote health
centre, patient critical.
Priority Engine scores it at the top of the queue; Vehicle Matcher restricts to vehicles that can
physically reach the destination under current conditions; Route Engine prefers reliability over
speed (minimising the ETA *upper bound*, not the mean); the plan flags which routine deliveries
are displaced and by how much. One approval executes. *Shows:* emergency mode is a genuinely
different objective, not a red colour-scheme.

### UC-5 — What-if impact analysis `[MVP — judge-driven]`
*Actor:* Officer. *Trigger:* "What if the bypass also closes?"
Simulator forks live state, applies the hypothetical closure, re-runs hazard→accessibility→
routing→assignment against the fork, and returns a structured diff plus the new plan — without
touching live operations. Any segment, any combination. *Shows:* the engine answering questions it
was never scripted for.

### UC-6 — Assisted mobility request `[MVP thin slice]`
*Actor:* field staff on behalf of a wheelchair-using patient. *Trigger:* hospital appointment in
Guwahati.
Modelled as a delivery whose cargo is a person: hard constraint requires an accessibility-equipped
vehicle; destination-side accessibility (mapped entrances) is surfaced in the plan. Flows through
the identical optimizer, risk engine and approval gate. *Shows:* constraint generality + the
social-inclusion narrative without a second product.

### UC-7 — Flood pre-positioning `[FUTURE — pitched, not built]`
72-hour flood signal for the Brahmaputra sector → demand forecast spikes for the affected hex
cluster → system recommends moving stock from Guwahati depot to Jorhat forward point *before*
water levels cut the corridor. Built on the same engines; needs only a longer weather archive and
inventory integration. *(Section 18)*

### UC-8 — Return-load freight sharing `[FUTURE — pitched, not built]`
`[Source reconciliation 0.2]` Empty return legs matched with aggregated village cargo. A marketplace
problem, not a decision-intelligence problem; explicitly out of MVP scope.

---

## 9. COMPLETE FEATURE SET

Every feature, one table, honest labels. **MVP** = in the 27-hour build (⭐ = demo-critical).
**SHOULD** = built if hours remain, in this order. **FUTURE** = pitched only. **REJECTED** = not
built, with the reason on record in 0.3.

| # | Feature | Layer | Class | Source |
|---|---|---|---|---|
| F01 | Role-based access (manager / officer / driver) + auth | Platform | MVP | F2 |
| F02 | Living Network State: per-segment × vehicle-class traversability, versioned | Core | MVP ⭐ | [PROPOSED] (from F1 twin + F2 score) |
| F03 | Accessibility Score 0–100 per segment, per vehicle class | Core | MVP ⭐ | F2, F3 formula |
| F04 | Accessibility Score aggregated to H3 hexes → regional heatmap | GIS | MVP ⭐ | F2, F3 |
| F05 | Multi-source event ingestion (weather, driver, control room, citizen) with trust weighting + corroboration | Core | MVP ⭐ | F3, F1 |
| F06 | Three-state road model OPEN/SUSPECTED/CLOSED with evidence | Core | MVP | [PROPOSED] |
| F07 | Landslide probability per segment × horizon (0–72 h) | AI | MVP ⭐ | F1, F2, F3 |
| F08 | Flood probability per segment × horizon | AI | MVP ⭐ | F1 |
| F09 | ETA prediction as band + confidence (LightGBM + baseline) | AI | MVP ⭐ | F2, F3 |
| F10 | Route candidate generation: k diverse feasible routes with multi-factor cost | Optimization | MVP ⭐ | F2, F3 |
| F11 | Hard-constraint engine (closure, weight, width, grade, access) | Optimization | MVP ⭐ | F3 rules |
| F12 | Joint cargo→vehicle→route assignment (OR-Tools CP-SAT) | Optimization | MVP ⭐ | F2 |
| F13 | Priority engine + emergency escalation rubric | Core | MVP ⭐ | F2 |
| F14 | Dynamic replanning cascade on disruption | Core | MVP ⭐ | F2 |
| F15 | Human approval gate (plan-level, emergency actions) | Platform | MVP ⭐ | F3 rules |
| F16 | What-if simulator over forked state + before/after diff | Decision | MVP ⭐ | F2, F3 |
| F17 | DecisionRecord: full provenance for every recommendation | XAI | MVP ⭐ | F3 rules |
| F18 | Explanation layer: LLM prose + deterministic template fallback | XAI | MVP ⭐ | F3 |
| F19 | Live map digital twin (segments coloured by state, vehicles animating on sim clock) | Frontend | MVP ⭐ | F1 twin |
| F20 | Command dashboard with KPIs, alerts, model-accuracy panel | Frontend | MVP ⭐ | F2 |
| F21 | Plan & Dispatch screen with candidate comparison + approval | Frontend | MVP ⭐ | F2 |
| F22 | Disruption console: event stream → impact → action | Frontend | MVP ⭐ | [PROPOSED] |
| F23 | Driver view: assignment card, waypoints, warnings, one-tap report | Frontend | MVP | F2 |
| F24 | Simulation clock (scrub/play/pause/×20 speed) | Platform | MVP ⭐ | [PROPOSED] |
| F25 | Scenario director: scripted demo timeline | Demo | MVP ⭐ | F2/F3 scenario |
| F26 | Demand forecast panel (seasonal hazard-elasticity model) | AI | MVP | F1, F3 |
| F27 | Pre-positioning recommendation from forecast + at-risk clusters | Decision | MVP | F1 UC-7 |
| F28 | Assisted mobility request (passenger-cargo hard constraint) | Domain | MVP | F1 |
| F29 | Citizen road-report form (unauthenticated, low-trust) | Platform | MVP | F1 |
| F30 | Model performance monitor (ETA error, closure-prediction precision/recall, live) | XAI | MVP | [PROPOSED] |
| F31 | Situation report export (markdown/PDF summary of a disruption + response) | Frontend | SHOULD | F1 |
| F32 | Natural-language query over logistics state ("why was V-27 rerouted?") | XAI | SHOULD | F3 |
| F33 | Deprioritisation advisor under fleet shortage (which deliveries to defer) | Decision | SHOULD | [PROPOSED] |
| F34 | Alternate-transport recommendation (ferry/air) when no road route exists | Optimization | SHOULD→FUTURE | F1 |
| F35 | Multi-day weather archive + monsoon season replay | Data | SHOULD | [PROPOSED] |
| F36 | Satellite imagery change-detection layer | AI | FUTURE | F1, F3 |
| F37 | Drone delivery feasibility module | Domain | FUTURE | F1 |
| F38 | Freight marketplace / return-load matching | Domain | FUTURE | F1 |
| F39 | SMS/IVR/WhatsApp interfaces | Platform | FUTURE | F1 |
| F40 | Citizen mobile app, offline maps, multilingual voice | Frontend | FUTURE | F1 |
| F41 | Live government API integrations (IMD, road authority feeds) | Data | FUTURE | F1, F3 |
| F42 | Multi-region / all-NE-states scaling | Platform | FUTURE | F1 |

**Count discipline:** 30 MVP features, of which 19 are demo-critical. For a 27-hour build that is
aggressive but honest — 11 of the 30 are thin (a form, a panel, a stub). The demo-critical 19 are
where the hours actually go (Section 47).

---

## 10. AI INTELLIGENCE LAYER

### 10.1 What makes this an AI system rather than a CRUD app

A CRUD app stores and displays facts. NE-Setu **infers, predicts, ranks and re-plans** — four
capabilities that no amount of data storage substitutes for:

| Capability | The question it answers | Why storage alone cannot |
|---|---|---|
| **Inference** | "Is this road passable right now?" | The truth is not reported anywhere. It must be *estimated* from proxies: rainfall, slope, history, reports. |
| **Prediction** | "Will it be passable in 24 hours?" | Requires generalising from historical rainfall→failure patterns to current conditions. |
| **Ranking** | "Which of these 6 candidate plans is best?" | Requires a commensurable value model over heterogeneous, conflicting factors. |
| **Re-planning** | "The world changed — now what?" | Requires re-deriving a fleet-wide plan under new constraints in seconds. |

### 10.2 The intelligence spectrum — what technique, where, and why

The master prompt's rule — *choose the simplest technology that solves each problem* `[SOURCE]` —
is applied literally. Every intelligent behaviour is classified into exactly one tier:

| Tier | Use when | Instances in NE-Setu |
|---|---|---|
| **T0 — Deterministic rule** | The logic is *knowable*: legislation of physics, regulation or data | Feasibility filtering; weight/width/grade limits; closure enforcement; priority rubric base scores; escalation triggers; approval gating |
| **T1 — Statistical / physical model** | The relationship is known but the parameters are uncertain | Hazard susceptibility curves; effective-speed-by-grade; trust weighting; corroboration thresholds; demand elasticity |
| **T2 — Trained ML** | The relationship must be *learned* from data | ETA band prediction; landslide probability calibration |
| **T3 — LLM** | The interface is *language* | Decision prose rendering; natural-language query |

The classification decisions that matter:

- **Routing is T0/T1, not ML and not LLM.** Path selection under a computed cost function is a
  solved algorithmic problem. Applying ML to it would add unreproducibility and remove
  explainability, and File 3's Rule 1 forbids LLM routing `[SOURCE]`. Our contribution is the
  *cost function* (T1) and the *co-optimization* (T0/T1), not a novel shortest-path algorithm.
- **Assignment is T0.** CP-SAT constraint solving is deterministic search, not learning — and that
  is a strength: it is provably constraint-respecting and reproducible.
- **Only two things are genuinely T2**: ETA prediction (learned from the simulation/historical
  corpus) and landslide-probability calibration. Both have deterministic fallbacks, so a missing
  or failed model degrades gracefully rather than fatally.
- **The LLM is confined to T3 and is optional.** It reads a completed `DecisionRecord` and writes
  prose; it never computes. Template fallback covers its absence (Section 35).

**Why this is a strength to argue, not a confession:** a judge asking "where is the AI?" gets the
honest taxonomy — inference over unobservable state, probabilistic hazard forecasting, learned ETA
distributions, and learned ranking calibration — rather than a shrug or a chatbot. "AI" in this
system means *deciding under uncertainty*, which is exactly what the problem statement describes.

### 10.3 Intelligence heat map of the nine-stage loop

```
SENSE         T0  validation, dedup, geo-matching          (deterministic)
UNDERSTAND    T1  trust weighting, corroboration           (statistical)
PREDICT       T1+T2  hazard curves + learned calibration   (the ML core)
ASSESS        T1  accessibility scoring                    (statistical)
OPTIMIZE      T0+T1  routing + CP-SAT assignment           (algorithmic)
APPROVE       T0  policy gate                             (deterministic)
ACT           T0  state transitions, notification          (deterministic)
MONITOR       T1+T2  prediction-accuracy tracking          (statistical)
RECALCULATE   T0  event-triggered re-entry                 (deterministic)
```

---

## 11. PREDICTION LAYER

Four predictions, each specified with input, output, purpose, method, training data, evaluation,
fallback and MVP status — per the master prompt's requirements `[SOURCE]`.

### 11.1 Landslide closure probability (per segment × horizon)

- **Purpose:** the system's signature prediction. Converts "it is raining" into "this specific
  road has a 34% chance of closing within 24 h," which is the quantity logistics actually needs.
- **Input (per segment):** slope angle (from DEM); slope-aspect class; lithology proxy
  (elevation+terrain-derived, see 23.4); land-cover proxy; antecedent rainfall (24/48/72 h
  cumulative); current rainfall intensity; historical closure incidence for the segment and its
  spatial neighbours; distance to nearest historical failure.
- **Output:** `P(closure)` at horizons 6/12/24/48/72 h, plus band (low/medium/high/critical).
- **Method:** two-layer. Layer 1 (T1): a physically-motivated susceptibility index
  `S = w1·slope + w2·soil_saturation_proxy + w3·history_density`, saturating in antecedent
  rainfall. Layer 2 (T2): logistic calibration mapping `S × horizon` → probability, learned from
  the training corpus (below). Calibration is where the learning lives; the structure is physical.
- **Training data:** a synthetic-but-principled corpus generated at build time: replay the real
  monsoon rainfall archive over the real terrain, generate closure events from the susceptibility
  model with stochastic noise and correct spatio-temporal clustering, then fit/calibrate on that.
  **Honesty clause (memorise this):** *for the SIH prototype the model is calibrated on simulated
  closure data built from real rainfall and real terrain, because no public segment-level closure
  history for the region exists; in production it would be recalibrated on recorded closures from
  the event pipeline, which the system itself accumulates.* This is the truthful answer when a
  judge asks about training data, and the accumulation loop is the strong follow-up: the platform
  *generates* the dataset it needs, from day one.
- **Evaluation:** reliability diagram (predicted probability vs observed frequency in held-out
  replay); Brier score; AUC on the binary closure outcome. Target: AUC ≥ 0.80 on held-out replay
  (achievable by construction; the honest number to quote is whatever the run produces).
- **Fallback:** if calibration fails to load, use the raw T1 susceptibility index banded into
  probability classes. Degraded precision, zero loss of function.
- **MVP status:** in. Demo-critical (F07).

### 11.2 Flood closure probability (per segment × horizon)

- **Purpose:** the areal counterpart — floods disconnect *clusters*, so this prediction drives
  cluster-level warnings and pre-positioning, not just single-segment re-costing.
- **Input:** segment elevation relative to local drainage; distance to major river channel;
  Brahmaputra seasonal stage proxy; 72 h cumulative rainfall upstream (area-weighted); historical
  inundation footprint class.
- **Output:** `P(submersion)` per segment per horizon; expected submersion duration class.
- **Method:** T1 rule-curve: low-elevation + near-channel + seasonal-peak + heavy-upstream-rain →
  high. No T2 layer in the MVP; the rule curve is honest and sufficient at demo fidelity.
- **Training data:** none needed; parameters from the physical inputs. `[ASSUMPTION]` Historical
  inundation footprint from open Sentinel-1 flood products — mark as build-time verification; if
  unavailable, use elevation-percentile-in-floodplain as the footprint proxy and say so.
- **Evaluation:** sanity checks against known flood behaviour of the 2022 monsoon season
  (qualitative, stated as such).
- **Fallback:** elevation-percentile rule alone.
- **MVP status:** in (F08), rule-based by design.

### 11.3 ETA prediction (band + confidence)

- **Purpose:** replace the misleading point ETA with a distribution (Section 3.2). The emergency
  objective optimises the band's *upper* bound — arriving reliably, not arriving optimistically.
- **Input:** route segment features (length, class, surface, gradient, curvature); vehicle class;
  weather state along the route at forecast traversal time; time of day; cumulative climb.
- **Output:** expected traversal time; p50/p90; confidence.
- **Method:** T0 baseline (free-flow class speed × grade penalty × weather penalty — transparent
  and always available) with T2 residual learning: LightGBM predicting the *residual multiplier*
  versus baseline from the above features. Predicting residuals keeps the model honest on
  extrapolation and makes the fallback seamless.
- **Training data:** synthetic corpus: replay historical weather over the real network, simulate
  traversal times by applying physically-plausible delay distributions (grade stalling, surface
  drag, rain speed caps, one-way wait penalties), then fit residuals.
- **Evaluation:** MAE of p50, calibration of p90 (was the true time under the p90 bound ~90% of
  the time?). The *calibration* metric is the one to show judges; point accuracy is table stakes
  and band calibration is what other systems don't even attempt.
- **Fallback:** T0 baseline + fixed widen-the-band heuristic. Always available; never blocks.
- **MVP status:** in (F09), demo-critical.

### 11.4 Demand forecast (per location × commodity)

- **Purpose:** drives pre-positioning recommendations (F27) and the dashboard forecast panel.
- **Input:** location population class; commodity; day-of-week; seasonal monsoon index; current
  hazard state of the location's access corridor.
- **Output:** 72 h expected demand uplift per commodity per hex cluster; confidence.
- **Method:** transparent elasticity model (T1): `demand = base × (1 + α·hazard_exposure)`, α
  fitted per commodity from the stated priors (medicine/food/water uplift sharply during flood
  exposure; general cargo does not). Prophet is *rejected* (0.3): no multi-year per-commodity
  history exists, and a fitted-but-unvalidatable forecaster is weaker than an honest elasticity.
- **Evaluation:** face validity against the priors + sensitivity analysis on α shown in the UI.
- **Fallback:** priors without fitting — which is the default anyway.
- **MVP status:** in (F26), thin by design.

### 11.5 What the prediction layer never does

- It never converts a probability into an action on its own authority. Probabilities feed the
  Assessment and Optimization stages; actions pass the gate.
- It never hides its confidence. Every predicted number displayed in the UI carries its band and
  confidence (Principle 4).
- It is never presented as fact. Hazard values are labelled *probability*, everywhere, including
  driver warnings ("landslide risk high on this section" — not "landslide ahead").

---

## 12. OPTIMIZATION LAYER

### 12.1 The two-stage design: feasibility, then desirability

All optimization in NE-Setu is two-stage, mirroring Section 2.3:

```
STAGE A — FEASIBILITY (hard, binary, non-negotiable)
  Remove edges that are CLOSED
  Remove edges violating vehicle-class constraints (weight/width/height/grade/access)
  Remove routes violating time-window or range constraints
  → The remaining set is what EXISTS. No scorer may add anything back.

STAGE B — DESIRABILITY (soft, weighted, transparent)
  Score every feasible candidate by the multi-factor route cost (12.3)
  Rank; keep k diverse candidates; select/assign jointly (12.4)
```

**Why the separation is architectural, not stylistic:** when objectives conflict (Section 12.5),
the resolution *always* happens inside stage B, by re-weighting desirability. Stage A is never
negotiated with. This one rule is what makes "the AI will never route a 10-tonne truck over a
5-tonne bridge" a *theorem rather than a hope* — and a unit test (Section 47).

### 12.2 Hard constraints (Stage A)

| Constraint | Type | Source of truth |
|---|---|---|
| Segment status = `CLOSED` | Traversal forbidden | LNS (three-state model, 16.4) |
| Bridge `maxweight` < vehicle gross weight | Traversal forbidden | OSM tags (bridge=yes, maxweight) |
| Lane `maxwidth` < vehicle width | Traversal forbidden | OSM maxwidth / lanes=1 heuristics |
| Segment grade > vehicle max grade | Traversal forbidden | DEM-derived slope × vehicle spec |
| `access` restrictions (private/emergency) | Traversal forbidden per role | OSM access tags |
| Vehicle capacity (weight/volume) | Assignment forbidden | Cargo spec × fleet spec |
| Vehicle range vs route energy estimate | Assignment forbidden | Route energy model (12.6) |
| Delivery time window vs ETA p90 | Assignment penalised → infeasible if hopeless | ETA model (11.3) |
| Emergency cargo on non-approved vehicle class | Assignment forbidden | Cargo spec (e.g. vaccine → cold chain) |

`SUSPECTED` segments are *not* removed. Their cost is multiplied heavily (12.3), which is the
correct semantics: suspicion deters, confirmation forbids.

### 12.3 The route cost function (Stage B) `[SOURCE — File 3's formula, adjusted]`

Per candidate route, per vehicle, per delivery:

```
RouteCost = w_time · norm(ETA_p50)
          + w_reliab · norm(ETA_p90 − ETA_p50)        # band width = unreliability
          + w_risk · norm(E[P_closure | traversal])    # probability-weighted, over segments
                                                        #   the route will actually use, at the
                                                        #   time it will actually use them
          + w_surface · norm(surface_penalty)
          + w_terrain · norm(grade_energy)
          + w_conf · (1 − mean_confidence)             # distrust cheap routes built on
                                                        #   low-confidence data
          − w_priority · norm(priority_score)          # urgency pulls cost DOWN
```

Default weights (emergency mode shifts in 12.6): `w_time .30, w_reliab .15, w_risk .25,
w_surface .10, w_terrain .10, w_conf .05, w_priority .05`. Weights are configuration, surfaced
(read-only) in the UI so judges can see the value model rather than guess at it.

Three deliberate departures from File 3's version, each with a reason:

1. **`E[P_closure | traversal]` instead of static risk.** A route that crosses a risky segment
   *before* the forecast rain begins and a route that crosses it *after* are different risks. The
   probability is evaluated at forecast traversal time per segment. This is the "when should it
   *leave*?" capability the master prompt asks about `[SOURCE]`, and it emerges from the cost
   function rather than needing a separate scheduler.
2. **`w_reliab` on the band width.** Because Section 3.2 established that variance is structural,
   the optimizer pays for unreliability explicitly. This is what makes UC-4's
   "optimise the upper bound" behaviour fall out naturally.
3. **`w_conf`.** Routes computed over low-confidence data cost more, all else equal. The system
   prefers decisions it can actually stand behind — a direct implementation of Principle 4.

**Conflict resolution, concretely** (the master prompt's Route-A-vs-Route-B question
`[SOURCE]`): Route A, 20 km shorter, landslide risk 78%. Route B, 35 km longer, risk 21%. The
system computes both costs. With defaults, A's risk term (0.25 × 0.78 ≈ 0.195) overwhelms its
distance saving (0.30 × ~0.10 ≈ 0.03): **B wins by ~0.13 cost units**, and the decision record
states: *"Route A rejected: closure probability 0.78 exceeds risk tolerance 0.50 for cargo class
MEDICAL; Route B selected despite +35 km (+52 min): risk 0.21, band width 28 min, confidence 0.81."*
The tie-break order for near-equal costs (Δ < 0.02): higher confidence, then lower risk, then
shorter distance, then fewer segments (fewer things to go wrong) — deterministic, so the same
question always gets the same answer.

### 12.4 Joint assignment: the cargo → vehicle → route decision

The assignment problem: *n* deliveries, *m* vehicles, and for each (delivery, vehicle) pair a
set of feasible candidate routes with costs. Solved with **OR-Tools CP-SAT** `[SOURCE — File 3]`:

- **Decision variables:** x[d, v] ∈ {0,1} — delivery d assigned to vehicle v; route index r[d,v].
- **Hard constraints:** capacity per vehicle (weight, volume, cold-chain flags); vehicle
  availability windows; driver duty limits; route feasibility per pair (Stage A pre-filtered);
  every delivery assigned or explicitly deferred.
- **Objective:** minimise Σ RouteCost(x) + large penalty × (unassigned priority-weighted
  deliveries) + small penalty × (vehicle switches from current route, to keep plans stable —
  replanning should change what *must* change, not everything).
- **Scale:** ~40 deliveries × 12 vehicles × ≤5 routes each. CP-SAT solves this in milliseconds.
  We are nowhere near the solver's limits, which is itself worth saying in the demo.

**Why joint beats sequential** — the demo-able proof: sequential (assign vehicle by capacity,
then route) sends the 10-tonne truck to the hill village because it has spare capacity, then
discovers no feasible route exists for it, and fails late. Joint sees that the only feasible
vehicles for that destination are the 4×4 and one mini-truck, and allocates accordingly. In the
demo dataset this failure is *arranged to occur* under a "naive baseline" comparison toggle —
one endpoint runs the sequential algorithm so the improvement is visible, not asserted.

### 12.5 When objectives conflict

| Conflict | Resolution rule | Where enforced |
|---|---|---|
| Shorter/faster vs safer | Risk tolerance by cargo class (medical 0.50, food 0.65, general 0.80): routes above tolerance for the cargo's class are infeasible *for that cargo*, not merely expensive | Stage A (per-delivery filter) |
| Fast vs reliable | `w_reliab` term; emergency mode raises it further | Stage B weights |
| Fleet efficiency vs single-delivery urgency | Priority penalty lets one urgent delivery override aggregate efficiency, bounded so it cannot dominate the plan | Objective balance |
| Cost vs equity (remote villages) | Equity term (12.6): villages with low baseline accessibility get a subsidy on their service cost, so optimisation cannot quietly abandon them | Objective |
| Stability vs optimality | Plan-stability penalty: replans change only what the new state justifies | Objective |

### 12.6 Emergency-mode objective shift

Emergency mode is not a red banner; it is a **different optimization posture**, applied when an
active emergency exists in a cluster:

- `w_risk` 0.25 → **0.40**; `w_reliab` 0.15 → **0.25**; `w_time` 0.30 → 0.20.
- Priority rubric escalates medical/food/water (Section 17); routine cargo may be *explicitly
  deferred* and deferral is recorded, not silent.
- The unassigned-delivery penalty becomes class-tiered: an unassigned emergency delivery is
  catastrophically expensive to the solver; an unassigned routine parcel is merely undesirable.
- **Equity guarantee:** deferral must be spread — the solver may not dump *all* deferrals onto the
  remotest villages. A cap per location (max 1 deferred routine delivery per village per cycle)
  encodes the ethical constraint directly into the objective `[PROPOSED]`. Cheap to implement,
  exactly the kind of judgement a government evaluator looks for.

### 12.7 What optimization deliberately is *not*

No reinforcement learning (no environment, no reward signal, no training time — a random policy
in an RL costume). No genetic algorithms (CP-SAT dominates at this scale and is provably
constraint-satisfying). No LLM in the loop (reproducibility, latency, cost — 4.4). Every one of
these rejections is from the master prompt's own discipline rule `[SOURCE]`, and each has a
one-sentence defence ready for Q&A.

---

## 13. ACCESSIBILITY INTELLIGENCE

### 13.1 Definition

**Accessibility Score A ∈ [0, 100]:** the system's estimate of how *servicably* a road segment (or
region, or destination) can be traversed **by a specific vehicle class, at a specific time, given
everything currently known**, with an attached confidence.

It is *not* a property of the road alone. The same segment scores differently for a 4×4 and a
heavy truck, in sunshine and in a 48-hour-rain aftermath. Accessibility is a **relation** between
road, vehicle, and time — which is precisely the insight File 2 leads with `[SOURCE]`.

### 13.2 Segment-level formula `[SOURCE — File 3's formula, made per-class and time-aware]`

```
A(segment, vclass, t) = 100 · Π penalties,  clipped to [0,100]

penalties:
  hazard      = 1 − λ_h · max(P_landslide(t), P_flood(t))          λ_h = 0.9
  status      = 1.0 (OPEN) | 0.4 (SUSPECTED) | 0.0 (CLOSED)
  surface     = f(surface, vclass)     paved 1.0 / gravel .85 / dirt .7 / track .45
                                        × vclass factor (4x4 near 1.0 on track; truck .3)
  terrain     = 1 − λ_g · max(0, grade − grade_comfort(vclass))
  restriction = 0 if any hard restriction binds vclass, else 1
  weather_now = 1 − λ_w · rain_intensity(t) − λ_v · visibility(t)
```

Every factor is stored in `contributing_factors` when computed — the score is explainable *by
construction*, not by post-hoc rationalisation.

**Worked example** (the one to walk a judge through):

| Factor | R-217, heavy truck | R-217, 4×4 |
|---|---|---|
| hazard (P_landslide 0.31) | ×0.72 | ×0.72 |
| status OPEN | ×1.00 | ×1.00 |
| surface: track | ×0.30 | ×0.90 |
| terrain: 9% grade | ×0.40 | ×0.92 |
| weather: moderate rain | ×0.85 | ×0.85 |
| **A** | **≈ 7 — impassable in practice** | **≈ 51 — difficult but servicable** |

Same road, same moment, same weather: **7 versus 51.** That single number pair is the
product's thesis in miniature, and it is why every downstream consumer is per-vehicle-class.

### 13.3 Regional aggregation: the H3 heatmap

Segment scores aggregate to **Uber H3 hexagons** (res 7–8) `[SOURCE — File 3]`:

```
HexA = w_pop · Σ(A_segment · length) / Σlength      (length-weighted network mean)
     blended with Reachability = fraction of hex population within 90-min isochrone
     of any depot under current LNS
```

Bands, consistent everywhere in the product `[SOURCE — File 2/F3 colour scheme]`:
🟢 80–100 highly accessible · 🟡 50–79 moderate · 🟠 30–49 difficult · 🔴 0–29 critical.
The heatmap is filterable by vehicle class — toggling truck↔4×4 recolours the region, which is
the single most persuasive visual in the demo.

### 13.4 Destination accessibility

Each location (village, health facility) carries: best-achievable A over remaining routes; number
of feasible routes remaining (route redundancy); time-to-isolation estimate (when does the last
feasible route close, per forecast?); and a trend arrow (improving/stable/degrading). "This
village's last dependable route closes in an estimated 14 hours" is the sentence that turns a
pretty map into an operational warning — and it is exactly the pre-positioning trigger (F27).

---

## 14. RISK INTELLIGENCE

Risk in NE-Setu is **specific, time-indexed, confidence-tagged, and actionable** — never a single
spooky index. Four granularities:

1. **Segment hazard risk** — P_landslide / P_flood per horizon (Section 11). The atom.
2. **Route risk** — `E[P_closure | traversal]`: probability the route is disrupted *while being
   driven*, evaluated per segment at forecast passage time. A route and its reverse can differ.
3. **Delivery failure risk** — P(delivery misses its window) = f(route risk, ETA band, buffer,
   vehicle reliability). This is the number the Plan screen shows per assignment.
4. **Regional risk** — cluster-level exposure: population-weighted hazard × access redundancy
   deficit. Drives the officer's at-risk view and pre-positioning.

**Vehicle suitability as risk moderation:** the same P_landslide degrades a heavy truck's
traversal more than a 4×4's (post-event extractability, grade handling, surface tolerance), so
vehicle choice modulates route risk — formally the other half of why Section 15's joint
optimization is necessary rather than elegant.

**Risk tolerances are policy, not aesthetics:** per-cargo-class thresholds (12.5) live in
configuration, visible in the UI, and every tolerance-triggered rejection appears in the decision
record. "Why not Route A?" must always have a numeric answer on screen.

---

## 15. VEHICLE INTELLIGENCE

### 15.1 Fleet model

| Vehicle class | Capacity | Terrain capability | Special |
|---|---|---|---|
| Heavy truck | 10 t | Poor — sealed roads only | trunk haul |
| Mini truck | 1 t | Medium | district roads |
| 4×4 | 0.5 t | Excellent | hill last-mile, post-disruption |
| Ambulance | 2 pax + kit | Good | medical only |
| Accessible van | 1 pax + wheelchair | Medium | mobility-constrained passengers (F28) |

Per-vehicle statics (class + capacity + dimensions + cold chain + equipment) and dynamics
(location, status, assignment, fuel/range, maintenance state). Twelve vehicles of five classes —
enough heterogeneity for every routing decision to be a *real* choice.

### 15.2 The matching logic

`Suitability(vehicle, delivery) = capacity_fit × terrain_fit × equipment_fit × availability ×
proximity_efficiency` — computed for every pair, feeding Stage A (zero → forbidden) and Stage B
(low → costly). The canonical story `[SOURCE — File 2]`: medicine + remote hill village + heavy
rain ⇒ 4×4 + the longer open corridor; *not* medicine + heavy truck + mountain shortcut. The
demo dataset contains this exact decision, with the truck's infeasibility visible on screen.

### 15.3 Decision intelligence outputs

The five questions the master prompt asks the system to answer `[SOURCE]`, and where each is
computed:

| Question | Answered by | Output |
|---|---|---|
| Which vehicle? | Vehicle Matcher + CP-SAT | assignment + suitability rationale |
| Which route? | Route Engine | k candidates, scored, top recommended |
| In what order? | CP-SAT sequencing | per-vehicle stop sequence |
| When should it leave? | Traversal-time-indexed risk (12.3-1) | departure window minimising E[P_closure] |
| What if the route fails? | Route redundancy + fallback candidate | pre-identified alternate + auto-replan |

---

## 16. DYNAMIC RE-ROUTING

### 16.1 The canonical incident, end to end

The master prompt's scenario `[SOURCE]`: a vehicle is en route on Route A; a landslide is
reported. Ten steps, each an auditable system behaviour:

```
 1 EVENT DETECTION      report arrives via Event Ingestor (driver / control room / scripted)
 2 VALIDATION           schema check → dedup (is this the same incident?) → geo-match to
                        segment R-114 → trust weighting → corroboration check
 3 ROAD STATUS UPDATE   R-114: OPEN → SUSPECTED (single low-trust report)
                        or → CLOSED (trusted source, or 2+ corroborating reports)
 4 ACCESSIBILITY RECALC for R-114 and correlated segments (slope-adjacent neighbours
                        inherit elevated hazard); LNS version bumps
 5 IMPACT ANALYSIS      query: which active assignments traverse R-114 now or within
                        forecast window? → 4 vehicles, 6 deliveries, 1 emergency
 6 ROUTE RECALCULATION  Stage A re-run (R-114 gone) → new candidate sets; joint CP-SAT
                        re-solve with plan-stability penalty (change only what must change)
 7 VEHICLE REASSIGNMENT if the release of capacity/roads changes the global optimum, other
                        vehicles may be reshuffled — visibly, with reasons
 8 ETA UPDATE           bands recomputed; affected windows re-checked
 9 PRIORITY REASSESSMENT emergency delivery re-ranked to top; 2 routine deliveries flagged
                        DEFER-PROPOSED (equity cap respected)
10 NOTIFICATION + AUDIT proposed plan → approval gate → driver notifications →
                        DecisionRecord + AuditLog written
```

Steps 1–8 are automatic. Steps 9–10 for *routine* cargo auto-commit; for *emergency* actions the
gate holds until a human approves (Section 33). The whole cascade from event to proposed plan:
**under 5 seconds** at MVP scale — fast enough to watch happen live.

### 16.2 Design details that make it credible

- **Change, don't rebuild.** The plan-stability penalty means the diff between old and new plans
  is minimal and *legible* — operators see "3 assignments changed," not an alien plan.
- **Correlated failures are handled, not ignored.** A landslide raises hazard on slope-adjacent
  neighbours (step 4), because Section 2.4 established that hill failures cluster. The heatmap
  shows a glow around the incident, not a lone red pixel.
- **In-flight position respected.** A vehicle 2 km past the last junction before the closure is
  routed from *where it is*, including the possibility of a controlled hold at a safe point.
- **Everything is one decision.** The cascade writes a single `DecisionRecord` linking trigger →
  impacts → candidates → new plan → approval. Replayable, exportable, defensible.

### 16.3 False and unreliable alerts

The judge-proof question. The answer has three layers:

1. **Three-state semantics.** One low-trust report ⇒ `SUSPECTED` ⇒ heavy cost multiplier (0.4 on
   accessibility) ⇒ traffic *avoids* the segment but *can* still use it if nothing better exists.
   The system never hard-fails a region on one unverified voice.
2. **Corroboration ladder.** `CLOSED` requires: trusted source (control room, verified field
   staff), or 2+ independent reports within a time window, or hazard-model agreement
   (P_closure > 0.85 — the model itself corroborates the humans). Source trust weights: control
   room 0.95, verified driver 0.8, unverified driver 0.5, citizen form 0.3.
3. **Expiry and decay.** Unconfirmed `SUSPECTED` states decay back toward `OPEN` on a
   half-life (6 h default); every `CLOSED` state carries a re-verification task — closures end,
   and a system that never re-opens roads strangles itself. Reopening is itself a corroborated
   event, never an assumption.

---

## 17. EMERGENCY LOGISTICS

### 17.1 What makes emergency different (stated as system changes, not adjectives)

| Dimension | Normal mode | Emergency mode |
|---|---|---|
| Objective | fleet efficiency + service level | critical-delivery success probability |
| Weights | defaults (12.3) | risk/reliability up, time down (12.6) |
| Priority rubric | static base scores | escalated + population-exposure boost |
| Routine cargo | always served | may be **explicitly deferred** (recorded, equity-capped) |
| Plan commit | auto for routine changes | **always** human-approved |
| Vehicle usage | class-appropriate | emergency classes may pre-empt routine assignments |
| Interface | dashboards as usual | emergency banner, affected-cluster focus, situation report |

### 17.2 Priority scoring `[SOURCE — File 2's table, made dynamic]`

```
priority = base(cargo_class)                    # medicine 98, food 92, kit 88, water 85,
                                               # routine 40, mobility-assist 70
          + urgency(deadline slack)             # tighter window ⇒ higher
          + exposure(population × hazard of destination cluster)
          + scarcity(criticality × (1 − stock_cover))
          − staleness(cargo age)                # prevents immortal emergencies
```

Escalation triggers (deterministic): flood/landslide confirmed in destination cluster ⇒ medical/
food/water +15; health-facility stock cover < 24 h ⇒ medical +20; declared emergency ⇒ all
critical classes floor at 85. Every score's decomposition is visible in the UI — "why is this
98?" has an itemised answer.

### 17.3 Emergency vs normal delivery — the operational differences the system encodes

Emergency deliveries: prefer route reliability over raw speed (p90-bound optimisation); may
trigger vehicle pre-emption (the 4×4 on a routine run is recalled); always pass the approval gate;
are tracked individually with deviation alerts (any ETA-band breach re-fires the loop); and are
never silently deferred — if the solver cannot serve one, it surfaces as a **critical unassigned**
requiring an officer decision (pre-empt more, accept delay, or escalate to alternate transport
in future scope).

---

## 18. DEMAND FORECASTING

Kept deliberately thin and honest (0.3, 11.4). What exists in the MVP:

- **Signal:** hazard-exposure-weighted demand uplift per commodity per H3 cluster, 72 h horizon,
  from the elasticity model with stated priors (flood exposure ⇒ medicine/food/water uplift).
- **Decision bridge — the actual point:** forecast → at-risk-cluster identification (13.4's
  time-to-isolation) → **pre-positioning recommendation**: "move 2 days of medical stock from
  Guwahati depot to Jowai forward point within 18 h; corridor reliability drops to 0.4 after
  that." The recommendation is a plan the officer can approve, not a chart to interpret.
- **Confidence:** sensitivity band from α priors, displayed; the UI never shows a point forecast
  without its band (Principle 4).
- **Feedback:** when the event resolves, forecast vs observed consumption is recorded — the
  accuracy panel (F30) includes demand calibration, starting the accumulation loop.

**Why this is enough for SIH:** the differentiating claim is *prediction feeding action*, and the
bridge above demonstrates it fully. A heavier forecaster would add unverifiable precision, not
capability. Production recalibration on real consumption data is Future Scope (F41-class).

---

## 19. WHAT-IF SIMULATION

### 19.1 Concept

The officer hypothesises; the system computes consequences on a **fork of live state**, using the
**real engines**, then presents a structured diff — live operations untouched.

### 19.2 Mechanics

```
POST /simulation { mutations[], time_offset? }
  1 FORK      copy-on-write snapshot: LNS + fleet + assignments + events (target: < 200 ms)
  2 APPLY     mutations: close segment(s) | set weather | disable vehicle | add emergency
              delivery | demand surge ×k
  3 PROPAGATE run the real pipeline on the fork: hazard → accessibility → routing → CP-SAT
  4 DIFF      structured old-vs-new: assignments changed, deliveries deferred, ETA deltas,
              risk deltas, cluster accessibility changes
  5 RENDER    side-by-side map + table + narrative summary; discard or promote fork
```

Same code path as live replanning — which is the architecturally important claim: simulation is
not a feature bolted on, it is *the engine's determinism made explorable*. Fork cost is low
precisely because of Section 4.2's centralisation.

### 19.3 Supported hypotheses `[SOURCE — master prompt list]`

Route unavailable · heavy rainfall begins · vehicle breaks down · demand +30% · additional
emergency delivery · bridge restriction added · combination of the above at a future time offset.

### 19.4 Why it is the killer feature

1. **It answers judges' questions.** "What if the other road closes too?" — asked live, answered
   live, by the real engine. Nothing in the demo survives scrutiny better than this.
2. **It converts the platform from reactive to strategic.** Officers plan *before* disruptions;
   pre-positioning (18) is a what-if conclusion promoted to a real plan.
3. **It is free.** Because everything reads one state object and the pipeline is deterministic,
   the marginal cost of the simulator was one fork endpoint and one diff view. Features this
   valuable and this cheap are rare; that is why LNS is the spine.

---

## 20. GIS / MAP SYSTEM

### 20.1 Layers

| Layer | Geometry | Source | Refresh |
|---|---|---|---|
| Road network | LineString per segment | OSM (OSMnx extract) | build-time snapshot |
| Segment attributes | tags: highway class, surface, bridge, maxweight, maxwidth, lanes, access | OSM | build-time |
| Slope / grade | per-segment mean+max grade | SRTM DEM sampled along geometry | build-time |
| Hazard susceptibility | per-segment static priors | derived (slope, lithology proxy, history) | build-time |
| H3 grid | res-7 hexes | computed | build-time |
| Locations | POI points: depots, villages, health facilities | OSM + curated | build-time |
| Dynamic overlay (LNS) | status, A-score, hazards, confidence per segment | computed | **continuous** |
| Vehicles | moving points | simulation | sim-clock |
| Events / reports | points + affected segments | ingestion | live |
| Weather field | per-segment rain intensity timeline | Open-Meteo archive | seeded timeline |

### 20.2 Map rendering

**MapLibre GL JS** base `[SOURCE — File 3]`, with **deck.gl** overlays for the heavy dynamic
layers (thousands of recolouring segments, vehicle markers) `[SOURCE — File 3]`. Segment colour =
LNS state × accessibility band; stroke width = road class; animated dashes for `SUSPECTED`.
Basemap: a self-hosted raster style (build-time tiles, offline-capable) — no runtime dependency
on a tile CDN that venue wifi can sabotage `[PROPOSED — demo-reliability rule]`.

### 20.3 Spatial operations and where they run

| Operation | Tool | Where |
|---|---|---|
| Network extract & graph build | OSMnx | build-time Python |
| Graph algorithms (Dijkstra, k-shortest, isochrones) | NetworkX | backend runtime |
| Geometry ops (buffer, intersect, snap) | GeoPandas/Shapely | backend |
| Hex aggregation | h3-py | backend |
| Spatial storage & queries | PostGIS | database |
| Tile/geojson serving | FastAPI endpoints | backend |

### 20.4 Coordinate and precision conventions

WGS-84 (EPSG:4326) storage; Web Mercator rendering; distances in metres via geodesic
computation (PyProj); all timestamps UTC ISO-8601 with the *simulation clock* clearly distinct
from wall time in every API payload (`sim_time` vs `wall_time` — conflating them is a classic
demo-wrecking bug).

---

## 21. COMPLETE SYSTEM ARCHITECTURE

### 21.1 The diagram

```
┌───────────────────────── DATA SOURCES (build-time snapshot + live seam) ─────────────────────┐
│  OpenStreetMap (OSMnx)   SRTM DEM   Open-Meteo archive   Operator/Driver/Citizen reports   │
└───────────────┬─────────────────────────────────────────────────────────────┬───────────────┘
                │ build-time                                                 │ live (adapters)
                ▼                                                             ▼
┌────────────────────────── DATA INGESTION & VALIDATION ──────────────────────────────────────┐
│  ETL scripts (build)                       Event Ingestor (runtime: trust, dedup, corrobore)│
└───────────────┬─────────────────────────────────────────────────────────────┬───────────────┘
                ▼                                                             ▼
┌────────────────────────── DATA PROCESSING / GIS LAYER ──────────────────────────────────────┐
│  GeoPandas · Shapely · h3-py · segment enrichment (slope, susceptibility priors)            │
└───────────────┬─────────────────────────────────────────────────────────────────────────────┘
                ▼
┌────────────────────────── DATABASE — PostgreSQL + PostGIS ──────────────────────────────────┐
│  static network │ LNS (versioned overlays) │ fleet │ deliveries │ events │ decisions │ audit │
└───────┬─────────────────┬───────────────────────┬───────────────────────┬───────────────────┘
        ▼                 ▼                       ▼                       ▼
┌──────────────┐ ┌─────────────────┐ ┌──────────────────────┐ ┌──────────────────────────┐
│ HAZARD ENGINE│ │ ACCESSIBILITY   │ │ PREDICTION (ETA,     │ │ SIMULATION CLOCK         │
│ landslide /  │ │ ENGINE → LNS    │ │ demand) LightGBM+T1  │ │ scrub/play/pause/×20     │
│ flood probs  │ │ per vclass      │ │ + deterministic base │ │ drives weather + telemetry│
└──────┬───────┘ └────────┬────────┘ └──────────┬───────────┘ └────────────┬─────────────┘
       └────────┬─────────┴──────────┬──────────┴─────────────┬────────────┘
                ▼                    ▼                        ▼
┌───────────────────────── OPTIMIZATION ENGINE ───────────────────────────────────────────────┐
│  Route Engine (NetworkX, Stage A filter → k candidates)  │  Plan Optimizer (OR-Tools CP-SAT, │
│  multi-factor RouteCost (12.3)                           │  joint cargo→vehicle→route)       │
└───────────────┬─────────────────────────────────────────────────────────────┬──────────────┘
                ▼                                                             ▼
┌───────────────────────── DECISION / RECOMMENDATION ENGINE ─────────────────────────────────┐
│  priority engine · plan assembly · policy gate (auto vs human-approve) · what-if forker     │
└───────────────┬─────────────────────────────────────────────────────────────┬──────────────┘
                ▼                                                             ▼
┌───────────────────────── EXPLANATION LAYER (XAI) ──────────────┐ ┌────────────────────────┐
│  DecisionRecord rendering: templates + optional LLM prose      │ │ NOTIFICATION           │
└───────────────┬────────────────────────────────────────────────┘ │ WebSocket + in-app     │
                ▼                                                 └───────────┬────────────┘
┌───────────────────────── BACKEND API — FastAPI (REST + WS) ──────────────────┬─────────────┘
└───────────────┬─────────────────────────────────────────────────────────────┬──────────────┘
                ▼                                                             ▼
┌───────────────────────── WEB APPLICATION (React/MapLibre) ──────────────────────────────────┐
│  Dashboard │ Live Map │ Heatmap │ Plan & Dispatch │ Disruption Console │ Simulator │ Log    │
│  Driver view │ citizen report form                                                            │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 21.2 Component responsibilities (each: what / why / consumes / produces / tech / phase)

**1. ETL pipeline (build-time).** *What:* extracts OSM bbox → graph; samples DEM per segment;
computes slope, susceptibility priors; builds H3 assignment; seeds weather timeline, fleet,
deliveries, locations; trains/calibrates models; emits seed SQL + pickled graph.
*Why:* everything downstream needs clean, enriched, consistent data — done once, offline.
*Consumes:* OSM/DEM/weather archive. *Produces:* database seed, `graph.pkl`, model artifacts.
*Tech:* Python, OSMnx, rasterio, LightGBM. *Phase:* build hours 0–6.

**2. Event Ingestor (runtime).** *What:* the single entry point for all change signals.
*Why:* Section 3.1 — road truth arrives as unreliable, duplicated human reports and weather
ticks; it must be validated, trust-weighted, corroborated and geo-matched before anything reacts.
*Consumes:* weather provider (snapshot), driver/citizen/control-room reports, telemetry,
scenario director. *Produces:* normalised `Event` rows, `RoadStatus` transitions.
*Tech:* FastAPI + Postgres. *Phase:* MVP core.

**3. Hazard Engine.** *What:* Sections 11.1–11.2. *Why:* prediction is a stated deliverable
(2.1) and the differentiator's fuel. *Consumes:* weather timeline, terrain priors, history.
*Produces:* `HazardForecast` rows per segment × horizon. *Tech:* NumPy/scipy curves + calibrated
logistic (joblib artifacts). *Phase:* MVP core.

**4. Accessibility Engine.** *What:* Section 13 formulas; writes the LNS. *Why:* the product's
intellectual core; every consumer reads from here. *Produces:* versioned LNS overlays, H3
aggregates. *Tech:* pure Python + PostGIS writes. *Phase:* MVP core.

**5. Prediction service (ETA/demand).** *What:* Sections 11.3–11.4. *Why:* bands and uplift feed
cost and pre-positioning. *Tech:* LightGBM artifacts + T0/T1 baselines in-process. *Phase:* MVP.

**6. Route Engine.** *What:* Stage A filtering + k diverse candidates via NetworkX (Dijkstra on
re-costed graph + penalty-based diversity). *Why:* candidates, not a single path, are what
explainability needs. *Produces:* `RouteCandidate[]` with full cost decomposition.
*Tech:* NetworkX over pickled graph. *Phase:* MVP core.

**7. Plan Optimizer.** *What:* Section 12.4 CP-SAT joint assignment + sequencing.
*Why:* resource allocation is a stated deliverable and the co-optimization differentiator.
*Tech:* OR-Tools CP-SAT. *Phase:* MVP core.

**8. Decision Engine.** *What:* assembles plans, applies priority/policy, gates auto-vs-human,
forks simulations. *Why:* recommendations must be policy-aware and stoppable. *Phase:* MVP core.

**9. Explanation Layer.** *What:* Section 35. *Phase:* MVP (templates) / SHOULD (LLM prose).

**10. Simulation clock + Scenario director.** *What:* authoritative `sim_time`; weather/telemetry
playback at ×1–×20; scripted demo timeline. *Why:* demo determinism (0.2 Conflict 4) and the
6-minute/72-hour compression. *Phase:* MVP, demo-critical.

**11. Notification service.** In-app + WebSocket push; driver view updates. (SMS is Future — 0.3.)

**12. Web application.** Section 29's seven screens + driver view + report form. *Phase:* MVP.

**13. Monitoring/eval panel.** Prediction-accuracy tracking (F30). *Phase:* MVP thin.

**Cross-cutting:** config-driven weights/tolerances; structured logging; audit log; seed/reset
endpoint (`POST /demo/reset`) so the demo can restart cleanly between runs.

### 21.3 Process and concurrency model

Deliberately minimal `[per master prompt "do not overengineer"]`: **one FastAPI process**;
pipeline stages run as in-process async tasks triggered by events or the sim clock; WebSocket fan-
out for UI updates. No Celery, no Redis, no message broker — at MVP scale the event rate is ~1/s
and sub-second cascade latency is achievable in-process. The stage functions are pure enough that
extracting them into workers later is mechanical, and Section 46 records that as the scaling path.

### 21.4 Key latency budgets (demo-critical)

| Operation | Budget | Basis |
|---|---|---|
| LNS full-graph re-cost | < 500 ms | 3–8k segments, NumPy vectorised |
| Full replan cascade | < 5 s | CP-SAT at 40×12×5 is milliseconds; remainder is I/O |
| What-if fork + propagate + diff | < 3 s | CoW fork ~200 ms + pipeline re-run |
| Map layer update | < 1 s | deck.gl GeoJSON swap over WebSocket |

These budgets are testable, and Section 47 makes the replan budget an acceptance test.

---

## 22. DATA ARCHITECTURE

### 22.1 Dataset register

Each dataset: why it matters, how obtained, status, and fallback. **Nothing here is invented;
every external source is a real, named service.** `[per master prompt source discipline]`

| # | Dataset | Why it matters | How obtained | Status | Fallback if unavailable |
|---|---|---|---|---|---|
| D1 | Road network + attributes | the graph itself; hard constraints live in tags | OSMnx extract of bbox (drivable highway classes) | **VERIFIED** — OSM/OSMnx is established for exactly this | none needed; coverage in bbox is good (major + district roads) |
| D2 | Bridge weight/width limits | feasibility constraints | OSM `bridge/maxweight/maxwidth` tags | **VERIFIED as tags**; *completeness* `[ASSUMPTION]` — many bridges untagged | synthesize plausible limits on untagged bridges over minor roads, **labelled as seeded data** in the UI data-provenance panel |
| D3 | Elevation / slope | terrain factor, hazard susceptibility, grade constraints | SRTM 30 m DEM via the `elevation` python package (public S3 tiles) | **VERIFIED package exists**; tile download at build `[ASSUMPTION re: availability]` | AWS Terrain Tiles (Terrarium) via `elevation`'s alternative source; last resort: OpenTopography API; final fallback: grade proxy from OSM `incline`/class — degraded, must be disclosed |
| D4 | Historical rainfall | hazard model driver + weather timeline | Open-Meteo historical archive API (free, no key) | **VERIFIED** — open archive with hourly history | bundled sample archive (bundled JSON of a monsoon week) |
| D5 | Weather forecast timeline | the demo's storm | same API, forecast endpoint, captured at build | **VERIFIED** | synthetic monsoon storm script (physically plausible intensities) |
| D6 | Landslide/flood history | susceptibility priors | GSI landslide inventory (public), Bhuvan flood layers | `[ASSUMPTION]` — public existence known; machine-readability varies | susceptibility from terrain alone (slope/lithology proxy); disclose |
| D7 | Villages / health facilities / depots | demand nodes | OSM POIs + curated seed (Census village names as reference) | **VERIFIED** OSM; curated selection is ours | smaller curated set, no dependency |
| D8 | Fleet + deliveries | the operation itself | authored seed data (12 vehicles, 35 deliveries) | ours — **SIMULATED by design** | n/a |
| D9 | Closure event corpus | model training/calibration | generated: real weather × real terrain → stochastic closures (11.1) | **SIMULATED, disclosed** | n/a — this *is* the fallback design |

**The simulation-honesty rule** `[PROPOSED]`: every simulated or seeded datum is tagged
`provenance: simulated|seeded|real` in the database and surfaced in a data-provenance panel in
Settings. When a judge asks "is this real data?", the answer is a navigable, itemised panel —
real roads, real elevation, real rainfall; simulated fleet and closures. Systems that blur this
get caught; systems that disclose it get credit.

### 22.2 If real-time data is unavailable (the standing question)

The answer is architectural: **every external source sits behind a provider interface with a
snapshot implementation as default.** `WeatherProvider`, `TelemetryProvider`, `ReportSource`.
The snapshot reads the seeded timeline; the live adapters exist and are correct but are not what
the demo runs on. Losing connectivity mid-demo therefore changes nothing observable. This is
stated here because the master prompt demands the answer be designed-in, not improvised `[SOURCE]`.

---

## 23. AI/ML ARCHITECTURE

### 23.1 Artifact pipeline (build-time)

```
D3 slope + D4 rainfall + D6 priors ──► feature table (per segment × hour)
        │
        ├──► hazard calibration (logistic on susceptibility × horizon) ──► hazard_model.joblib
        ├──► ETA residual corpus (replayed traversals) ──► LightGBM ──► eta_model.joblib
        ├──► demand elasticity priors ──► params.json
        └──► eval report (AUC, Brier, p90 calibration) ──► /models/EVAL.md  (quoted in demo)
```

### 23.2 Inference (runtime)

All inference is **in-process artifact loading** — no model server, no GPU, no network
dependency. Hazard curves are vectorised NumPy over the segment table; ETA LightGBM predicts
per-route in batch; call sites are pure functions (`predict_eta(features) -> band`). Loading
failure of any artifact automatically engages the deterministic fallback (11.x) and *raises a UI
notice* — degradation is visible, never silent (Principle 4).

### 23.3 Retraining path (accumulation loop)

Every realised traversal and every resolved closure event is recorded with the features the
prediction consumed. `POST /models/retrain` (SHOULD) refits calibration on accumulated events.
Even unused in the demo, its existence answers "how does this get better with real deployment?"
— the platform builds its own training set through operation.

### 23.4 The lithology-proxy disclosure

True geological lithology rasters were not verified as obtainable within the build window
`[ASSUMPTION]`. The susceptibility prior therefore uses a terrain-derived proxy
(elevation band × slope class × curvature). This is disclosed in the data-provenance panel and in
EVAL.md. If Bhuvan GSI layers prove machine-readable at build time, they slot in without code
change (feature table column), which is why the proxy is isolated to the feature layer.

### 23.5 Evaluation summary (what we can honestly claim)

| Model | Metric | Target | Fallback claim |
|---|---|---|---|
| Landslide closure | AUC / Brier on held-out replay | ≥ 0.80 / ≤ 0.15 | "calibrated on simulated closures from real rainfall+terrain" |
| ETA | MAE p50, p90 coverage | ≤ 12% of p50 / 88–92% coverage | "physically-baselined residual model" |
| Demand | face validity + sensitivity | monotone in exposure | "prior-driven elasticity, honestly labelled" |

The exact numbers produced by the build run get written into EVAL.md and quoted as-is. No metric
in the pitch is ever a number the run did not produce.

---

## 24. OPTIMIZATION ARCHITECTURE

### 24.1 Layering

```
L1  CONSTRAINT LAYER      Stage A filters (16 hard constraints) — guarantees feasibility
L2  COST LAYER            RouteCost (12.3) per candidate — the value model, config-visible
L3  CANDIDATE LAYER       k diverse routes per (delivery, vehicle) pair
L4  ASSIGNMENT LAYER      CP-SAT joint solve — fleet-level optimum under L1–L3
L5  STABILITY LAYER       plan-diff minimisation — replans change only what must change
```

### 24.2 Implementation notes

- **Graph representation:** NetworkX `MultiDiGraph`, pickled at build; per-request edge-cost
  vectors computed from the LNS overlay (never mutating the base graph — copy weights, then
  Dijkstra). Turn restrictions ignored at MVP (disclosed; negligible at demo fidelity).
- **Candidate diversity:** first candidate = optimal under current costs; then k−1 more via
  iterative edge-penalty (penalise segments of the previous candidate, re-solve) — yields
  genuinely different corridors, not cosmetic variants `[PROPOSED]`.
- **CP-SAT model:** boolean x[d,v] + route-index selection; capacity/window/feasibility as hard
  constraints; objective = Σ RouteCost + priority-weighted unassigned penalty + stability penalty;
  5-second solve cap with incumbent solution accepted (anytime behaviour; never blocks the demo).
- **Determinism:** fixed random seeds everywhere; identical inputs ⇒ identical plan (test-enforced).

### 24.3 The naive-baseline comparator

A `POST /optimize?mode=naive` endpoint runs shortest-distance assignment (assign by spare
capacity, route by Dijkstra distance). The Plan screen can toggle **Smart vs Naive** and show the
delta: deliveries failed, ETA overrun, risk exposure. This makes the value of the intelligence
*measured* rather than asserted `[PROPOSED — demo asset]` — and it is the honest form of
comparison, because the baseline is a real algorithm, not a straw man.

---

## 25. DATABASE ARCHITECTURE

### 25.1 Entity-relationship overview

```
USERS ─1:N─ SESSIONS
USERS ─1:N─ APPROVALS ─N:1─ PLANS
ROAD_SEGMENTS ─1:N─ SEGMENT_OVERLAYS (LNS, versioned)        ROAD_SEGMENTS ─1:N─ SEGMENT_STATIC_FACTORS
ROAD_SEGMENTS ─1:N─ HAZARD_FORECASTS                          ROAD_SEGMENTS ─1:N─ ROAD_STATUS_HISTORY
ROAD_SEGMENTS N:1─ H3_CELLS (via geometry)
LOCATIONS N:1─ H3_CELLS
VEHICLES ─1:N─ VEHICLE_STATES ─1:N─ POSITIONS
DRIVERS 1:1 VEHICLES (MVP simplification)
DELIVERIES N:1─ LOCATIONS(dest) ; DELIVERIES N:1─ CARGO_TYPES
PLANS ─1:N─ ASSIGNMENTS ─N:1─ VEHICLES ; ASSIGNMENTS ─1:N─ STOPS ─N:1─ DELIVERIES
ASSIGNMENTS ─1:N─ ROUTE_CANDIDATES (chosen one flagged)
EVENTS ─1:N─ EVENT_SOURCES ; EVENTS N:M─ ROAD_SEGMENTS (impact)
PLANS ─1:1─ DECISION_RECORDS ; DECISION_RECORDS 1:N CANDIDATES_JSON
SIMULATION_RUNS ─1:N─ SIMULATION_MUTATIONS ; ─1:1─ DIFF_RESULTS
FORECASTS (demand) N:1─ H3_CELLS N:1─ COMMODITIES
AUDIT_LOG (append-only, references everything by id+type)
```

### 25.2 Core tables (conceptual schema)

```
users(id, name, role[manager|officer|driver], pass_hash, created_at)
road_segments(id, osm_id, geom LINESTRING, highway_class, surface, oneway,
              bridge bool, maxweight, maxwidth, lanes, access, length_m,
              mean_grade, max_grade, h3_index, suscept_landslide, suscept_flood,
              provenance)                              -- static, build-time
segment_overlays(id, segment_id FK, lns_version, valid_at(sim),
              status[OPEN|SUSPECTED|CLOSED], status_source, status_confidence,
              a_score_heavy, a_score_mini, a_score_4x4, a_score_special,
              p_landslide_6..72, p_flood_6..72, eff_speed_kph, confidence,
              contributing_factors JSONB)               -- the LNS, append-versioned
road_status_history(segment_id, from_status, to_status, event_id, reason, at)
hazard_forecasts(id, segment_id, horizon_h, p_landslide, p_flood, computed_at, model_version)
h3_cells(h3_index PK, geom, population_class, mean_a_per_class JSONB, band_per_class JSONB)
locations(id, name, kind[depot|village|health], geom, population_class,
          cold_chain bool, accessible_entry bool|null)
vehicles(id, class, capacity_kg, volume_m3, width_m, weight_kg, cold_chain bool,
          accessible bool, home_depot FK, status, range_km)
vehicle_states(vehicle_id PK/FK, current_geom, heading, fuel_pct, assignment_id null, updated_sim)
drivers(id, name, vehicle_id FK, duty_status)
cargo_types(code PK, base_priority, risk_tolerance, needs_cold_chain, is_passenger)
deliveries(id, cargo FK, weight_kg, volume_m3, dest FK, requested_by, deadline_sim,
           priority_score, status[NEW|PLANNED|IN_TRANSIT|DELIVERED|DEFERRED|FAILED],
           created_sim)
plans(id, version, mode[NORMAL|EMERGENCY], status[DRAFT|PROPOSED|APPROVED|ACTIVE|SUPERSEDED],
      objective_value, created_sim, approved_by FK null)
assignments(id, plan FK, vehicle FK, route_candidate FK, depart_sim, eta_p50, eta_p90,
            risk_score, status)
stops(id, assignment FK, delivery FK, seq, planned_arrival_sim, actual_arrival_sim null)
route_candidates(id, assignment null FK, delivery FK, vehicle_class, geometry,
            distance_m, eta_p50, eta_p90, cost JSONB(decomposed), feasible bool,
            rejection_reason null, chosen bool)
events(id, type[landslide|flood|report|weather|breakdown|surge|scenario],
       payload JSONB, source_type, source_trust, received_sim, dedup_key)
event_segment_impacts(event_id, segment_id, applied_status, confidence)
decision_records(id, trigger_event_id null, plan_id null, decision_type, inputs_ref,
       candidates JSONB(full scored set incl. rejections), selection, rationale_template,
       confidence, created_sim)
approval_events(id, decision FK, user FK, action[approve|reject|modify], at, note)
simulation_runs(id, created_by, fork_snapshot JSONB ref, mutations JSONB,
       diff JSONB, status, created_wall)
demand_forecasts(id, h3_index, commodity, horizon_h, expected_uplift, confidence, model)
audit_log(id, wall_time, sim_time, actor, entity_type, entity_id, action, detail JSONB)
weather_timeline(sim_hour PK, segment_class_zone, rain_mm_h, visibility, source)
model_runs(id, artifact, metrics JSONB, trained_at, notes)          -- EVAL.md companion
```

### 25.3 Design decisions

- **LNS as append-versioned overlays**, not in-place mutation: full history of *why the network
  looked like that at that time* — replayable, auditable, and the forking primitive for what-if.
- **`sim_time` on every mutable row** alongside `wall_time` in audit: the demo manipulates time;
  conflating clocks corrupts both narrative and debugging (20.4).
- **`route_candidates` persists rejected candidates** — the explanation layer *reads* rather than
  reconstructs (4.2). Storage is trivial; insight is not.
- **Postgres-only.** PostGIS extension covers spatial; JSONB covers flexible payloads. No Redis,
  no separate graph DB — NetworkX holds the in-memory graph. One database, one backup, one
  docker volume `[master prompt: do not over-engineer]`.
- **Indexes:** GIST on all geometries; btree on (lns_version), (sim_time), (status); the two
  query patterns that must stay fast are impact analysis (which assignments traverse segment S
  after time T) and LNS fetch (latest overlay ≤ sim_time per segment).

---

## 26. API ARCHITECTURE

REST + WebSocket, JSON, all under `/api/v1`. Auth: JWT bearer; roles gate write operations.

### 26.1 Endpoint groups

```
/auth            POST /login (id, pass → JWT) · GET /me
/map             GET /network?bbox&class      static segments+attrs (cached)
                 GET /network/overlay?version  LNS dynamic layer (polled/WS-pushed)
                 GET /tiles/{z}/{x}/{y}        self-hosted basemap tiles
/accessibility   GET /segments/{id}/score?vclass   full decomposition (13.2)
                 GET /heatmap?vclass&band         H3 aggregation
                 GET /locations/{id}/accessibility  redundancy, time-to-isolation (13.4)
/weather         GET /now · GET /timeline?from&to      (sim clock)
/vehicles        GET / · GET /{id} (state+assignment) · POST /{id}/report (driver field report)
/deliveries      GET / · POST / (incl. emergency flag, passenger-cargo type) · GET /{id}
                 POST /{id}/defer (officer)
/events          GET / (stream w/ filters) · POST / (INGESTION — the multi-source entry, 16.4)
                 POST /{id}/corroborate · POST /{id}/resolve (re-open/close confirm)
/optimization    POST /plan (run pipeline → PROPOSED plan + decision record)
                 GET /plan/compare?mode=smart|naive               (24.3)
/plans           GET / · GET /{id} (full: assignments, candidates, rationale)
                 POST /{id}/approve · POST /{id}/reject           (THE GATE)
/alerts          GET / (derived: at-risk clusters, band breaches, critical unassigned)
/predictions     GET /hazard?segment&horizon · GET /eta?route · GET /demand?cluster
/emergency       POST /mode (on|off, cluster) · GET /impact?cluster
/simulation      POST /runs (mutations → fork+propagate+diff)   GET /runs/{id}
/ai              POST /explain  {decision_id}  → prose (LLM or template)
                 POST /ask      {question}     → NL query over state (SHOULD)
/analytics       GET /kpi · GET /model-performance (F30) · GET /deferred-report
/demo            POST /reset · POST /scenario/{id} · POST /clock {play|pause|speed|seek}
/admin           GET /data-provenance · GET /config (weights/tolerances, read-only)
```

### 26.2 Contract notes

- **WebSocket `/ws`** pushes: LNS version bumps, event stream, vehicle positions (sim-tick),
  plan status transitions, alerts. The UI is otherwise REST-polled at ≥5 s — WS is an
  accelerant, not a dependency.
- **Idempotency:** `POST /events` requires `dedup_key`; replays return the original — the demo
  can be re-fired safely.
- **Every mutating response carries** `sim_time`, `wall_time`, and a `decision_id` when a
  decision was materialised.
- **Pagination** on list endpoints (deliveries, events, log) — 30–40 rows today, but the
  contracts should not embarrass us later.

---

## 27. FRONTEND / WEB APP ARCHITECTURE

### 27.1 Structure

React (Vite) SPA; TypeScript; state via a light store (Zustand) with a single `useLNS`
subscription feeding every map layer and score display — the *frontend mirror of Section 4.2's
one-state-object rule*: one source of truth client-side too, so panels cannot disagree.
MapLibre + deck.gl in one reusable `GeoCanvas`; shadcn/ui + Tailwind for chrome; Recharts for
analytics; react-router for the seven screens + driver route.

### 27.2 The state-flow contract

```
WS push (LNS version bump) ─► refetch overlay ─► store update ─► all map layers + score
                                                            chips + heatmap re-render together
```

One bump, one coordinated re-render — the visible "everything reacts at once" moment that makes
the system feel alive. (And the reason the store is centralised: coordination by construction.)

### 27.3 Design language

Dark command-centre aesthetic (high contrast for projection); the accessibility band palette
(13.3) used *identically everywhere* — map, chips, tables, alerts — so colour always means one
thing. Traffic-light status for OPEN/SUSPECTED/CLOSED with distinct shapes as well as colours
(accessibility of the accessibility tool: colour-blind-safe). Numerals monospaced; every score
chip hover-reveals its decomposition (13.2). Sim-clock widget persistent in the header
(play/pause/×20/scrub) — the audience must always know what time it is.

### 27.4 Performance and resilience

Overlay updates as GeoJSON layer swaps (deck.gl handles thousands of features); routes and
vehicles as separate layers to avoid full re-renders; optimistic approval UI with rollback on
error; offline-tolerant: if WS drops, polling takes over silently; a global "connection degraded"
indicator rather than failure.

---

## 28. USER ROLES (ACCESS MODEL)

| Capability | Manager | Officer | Driver |
|---|---|---|---|
| View dashboards / map / heatmap | ✓ | ✓ | own route only |
| Create delivery requests | ✓ | ✓ (incl. emergency) | — |
| Run optimization / what-if | ✓ | ✓ | — |
| Approve plans (routine) | ✓ | ✓ | — |
| Approve emergency actions / priority override / closure override | ✓ | ✓ (senior) | — |
| Defer routine deliveries | ✓ | ✓ | — |
| Report road event | ✓ | ✓ | ✓ (high trust) |
| Citizen report form | — unauthenticated, low trust — | | ✓ |
| View decision log / audit | ✓ | ✓ | own |
| Data provenance / model performance | ✓ | ✓ | — |
| Config weights (read) | ✓ | ✓ | — |

Role is a *capability set*, not a persona (7.x defines personas). Login is real (JWT) but the
demo ships three seeded accounts — the auth exists to demonstrate the gate, not to consume build
hours on password flows.

---

## 29. SCREEN-BY-SCREEN UI SPECIFICATION

Seven primary screens + driver view + report form. For each: purpose, user, components, data,
actions, AI role, and the states that matter. Shared conventions: sim-clock widget in header;
alert drawer global; accessibility palette everywhere; every score chip hover-decomposes.

### 29.1 S1 — Command Dashboard
- **Purpose / user:** operational home; Manager + Officer.
- **Components:** KPI strip (active vehicles, deliveries by status, at-risk deliveries, road
  blockages by state, emergency requests, mean network accessibility per class — each with trend
  sparkline); live alert feed; storm timeline scrubber bound to the sim clock; model-performance
  mini-panel (ETA error, closure precision/recall — F30); demand-forecast mini-panel (18).
- **Data:** aggregated LNS + plans + events + forecasts.
- **Actions:** click any KPI → filtered deep-link into the relevant screen; acknowledge alerts.
- **AI role:** surfaced predictions and their live accuracy; alert severities are computed
  (cluster exposure), not hand-set.
- **States:** *empty* (no sim running → guided "load scenario" card); *degraded* (model
  fallback active → amber chip "ETA model in baseline mode"); *emergency* (banner + cluster
  focus). Links to: everything (it is the hub).

### 29.2 S2 — Live Map (Digital Twin)
- **Purpose / user:** the theatre; all roles (driver sees restricted view).
- **Components:** GeoCanvas (MapLibre+deck.gl): segments coloured by LNS state × accessibility
  band per selected vehicle class; animated vehicles; route ribbons for active assignments
  (chosen solid, backup dashed); event pins with severity halos; hover card per segment
  (status, scores, hazards, confidence, contributing factors); layer panel (class filter,
  heatmap toggle, hazard overlay, labels); vehicle-class toggle — **the demo's signature
  interaction** (13.3).
- **Actions:** click segment → detail drawer (full 13.2 decomposition + status history + reports);
  click vehicle → assignment card; click event → impact list.
- **AI role:** everything on screen is computed; hover-card decomposition is the XAI surface.
- **States:** *loading tiles* (skeleton grid); *WS-degraded* (polling indicator); *no overlay
  data* (basemap + "awaiting first assessment"). Links to: S5 (events), S4 (assignments), S3.

### 29.3 S3 — Accessibility Heatmap
- **Purpose / user:** regional reachability intelligence; Officer-primary.
- **Components:** H3 hex choropleth in the four bands; vehicle-class toggle; time slider
  ("now / +6 / +12 / +24 / +48 / +72 h" — forecast accessibility, not just current);
  at-risk-locations table (redundancy, time-to-isolation 13.4, population class) sorted by
  urgency; pre-positioning recommendation card (18) with approve action when actionable.
- **AI role:** the whole screen is the Accessibility Engine + hazard forecasts made visible;
  time-slider shows prediction, labelled as probability.
- **States:** *all-green* (normal morning — the before picture); *degrading* (hexes cascade
  orange→red as the storm advances — the demo's emotional beat); *no forecast* (band shows
  "current only, forecast unavailable").

### 29.4 S4 — Plan & Dispatch
- **Purpose / user:** create, inspect, compare, approve plans; Manager-primary.
- **Components:** delivery queue (sortable by priority/deadline/risk, emergency pinned);
  fleet panel (status, suitability chips per open delivery); **candidate comparison table** per
  selected assignment: k routes × (distance, ETA p50/p90 band, risk, cost decomposition,
  confidence) with chosen highlighted and *each rejected row carrying its reason*;
  Smart-vs-Naive toggle (24.3) with measured delta panel; plan summary (objective value,
  unassigned/deferred with equity note); approve/reject/modify actions with one-click rationale
  export.
- **AI role:** the optimizer's full reasoning is on screen — this is where "why" lives.
- **States:** *empty queue*; *no feasible vehicle for a delivery* (explicit red row + "options:
  defer / pre-empt / override with approval"); *solver timeout* (incumbent accepted, flagged);
  *plan superseded* (diff view old→new). Links to: S2 (route geometry), S7 (decision record).

### 29.5 S5 — Disruption & Re-route Console
- **Purpose / user:** the incident cockpit during events; Manager + Officer.
- **Components:** live event stream (type, source, trust, corroboration state); event detail →
  affected entities (vehicles en-route-impacted, deliveries by criticality, clusters); the
  **replan cascade stepper**: ten stages of 16.1 as a live checklist with timestamps — the
  architecture made visible in real time; proposed-plan diff (changed assignments highlighted);
  approval gate with per-action risk badges; verification queue for `SUSPECTED` segments
  (16.3-3) with confirm/expire actions.
- **AI role:** impact analysis, replan proposal, corroboration status — all computed.
- **States:** *quiet* (verification queue may still hold items); *cascade running* (stepper
  animating — sub-5 s, so a brief "computing" shimmer then results); *awaiting approval*
  (persistent, impossible-to-miss); *false alarm resolved* (green "R-114 re-opened, reports
  inconsistent" — shows the trust system working).

### 29.6 S6 — What-if Simulator
- **Purpose / user:** counterfactual planning; Officer-primary; **judge-facing**.
- **Components:** mutation builder (close segment(s) by map-pick or search; set weather
  intensity; disable vehicle; add emergency delivery; demand surge slider; time offset);
  preset scenario chips; **before/after split-map** (same palette, both states); diff table
  (assignments changed, deferred, ETA/risk deltas per delivery, cluster accessibility deltas);
  narrative summary card; "promote to plan" when the conclusion warrants real action (18).
- **AI role:** the real engines re-run on the fork — the screen is pure consequence display.
- **States:** *no run yet* (builder + presets); *running* (< 3 s spinner with stage ticker);
  *infeasible scenario* ("all routes to Village X fail: bridge limit + closure — options:
  alternate transport (future), accept isolation, pre-position by +48 h"); *diff empty*
  ("network absorbs this disruption with no plan change" — itself an informative answer).

### 29.7 S7 — Decision Log & Explanation
- **Purpose / user:** audit and trust; all officer roles.
- **Components:** filterable decision timeline (type, trigger, outcome, confidence); decision
  detail: trigger event → inputs used → **full candidate set with scores and rejection reasons**
  → selection → rationale → approver; **explain box** (F18): template prose always, "enhanced
  explanation" button → LLM prose when configured; NL query box (F32, SHOULD): "why was V-27
  rerouted at 14:20?" → resolved against records; export (markdown/PDF situation report, F31).
- **AI role:** the XAI layer's home; every "why" in the system terminates here.
- **States:** *empty* (pre-first-plan); *LLM unavailable* (template prose + notice — the demo
  must never depend on the API key).

### 29.8 S8 — Driver View (mobile format)
- **Purpose / user:** the field surface; Driver.
- **Components:** today's assignment card (stops in order, ETA band, cargo, special handling);
  route strip on map (low detail, cached tiles); hazard warnings in plain language with distance
  ("landslide risk HIGH on next 12 km — consider holding at Jowai safe point"); one-tap report
  (type icons: blockage/flood/damage/other + optional photo); status updates per stop
  (departed/arrived/delivered/failed-with-reason).
- **AI role:** warnings derived from hazard × their specific remaining route; everything else
  deliberately absent.
- **States:** *no assignment*; *rerouted mid-route* (prominent change card with reason + new ETA);
  *offline* (last-known plan cached, reports queue locally — thin implementation, disclosed).

### 29.9 S9 — Citizen Report Form (public, thin)
- **Purpose:** demonstrate multi-source ingestion at low trust. Fields: location (map pin),
  type, description, photo. Submits to `POST /events` as `source_type=citizen, trust=0.3`,
  lands in S5's verification queue. No account, rate-limited, honeypot field.

### 29.10 Navigation model

Dashboard is home; the map is one keystroke away (M); alerts deep-link into S5 with the event
pre-selected; every score everywhere deep-links to its decomposition (S2 drawer or S7 record).
Screens not built (settings beyond provenance/config views, user management) are absent by
design — Section 28's rationale.

---

## 30. IMPORTANT DATA FLOWS

Seven scenarios `[per master prompt list]`, each as input → processing → AI → optimization →
decision → user → outcome.

**A — Normal delivery.** Input: 35 delivery rows + fleet + overnight LNS. Processing: pipeline
run at dispatch window. AI: hazard quiescent; ETA bands per candidate. Optimization: Stage A →
candidates → CP-SAT. Decision: plan PROPOSED → auto-note. User: Manager reviews exceptions in
S4, approves. Outcome: drivers notified (S8); baseline normal — the *before* picture.

**B — Road blockage (the centrepiece).** Input: control-room landslide event on trunk segment.
Processing: ingest → trust 0.95 → CLOSED; correlated-neighbour hazard bump; LNS v+1. AI:
hazards re-evaluated; ETA bands widen on affected corridors. Optimization: Stage A drops segment;
candidates regenerate; CP-SAT re-solves with stability penalty; 1 emergency protected, 2 routine
deferred (equity-capped). Decision: PROPOSED cascade plan + DecisionRecord. User: Manager
approves in S5 (stepper visible end-to-end). Outcome: drivers rerouted; ETA bands updated;
heatmap recoloured; event resolved into history. < 5 s trigger-to-proposal.

**C — Heavy rainfall (the slow crisis).** Input: weather tick — 48 h heavy-rain band over hills.
Processing: hazard engine re-runs; susceptibility × antecedent saturation drives P_landslide up
on steep segments. AI: forecast horizons populated; **time-to-isolation** computed for exposed
villages (13.4). Optimization: routes re-costed at forecast traversal times; departures shifted
earlier where E[P_closure|traversal] falls (12.3-1). Decision: pre-emptive plan + pre-positioning
recommendation (18). User: Officer sees S3 degrade hex-by-hex, acts 24 h early. Outcome:
deliveries moved before the closure; when the closure *then* occurs, the plan barely changes —
the system's prediction demonstrably paid for itself.

**D — Emergency medicine delivery.** Input: emergency delivery (anti-venom, deadline 4 h,
critical patient) + current degrading LNS. Processing: priority engine scores ~99 (17.2).
AI: ETA band, not point — upper bound drives selection. Optimization: vehicle class restricted
(4×4/ambulance feasible only); route = min p90; displaced routine deliveries itemised. Decision:
**hard gate** — officer approves (33). Outcome: tracked individually; any band breach re-fires
the loop; success/failure recorded against prediction (F30).

**E — Vehicle breakdown.** Input: driver report / telemetry loss. Processing: vehicle →
unavailable; its stops → unassigned. AI: ETA/risk for remaining fleet unchanged; re-prediction
not needed (deterministic state change). Optimization: CP-SAT re-solve for the orphaned stops
across remaining vehicles; if capacity short → deferral advisor (F33 SHOULD): ranked deferral
list with impact per option. Decision: gate if any emergency affected. Outcome: revised plan;
breakdown logged; vehicle returns to service on repair event.

**F — Demand surge.** Input: event `surge ×1.3` on a cluster (or real forecast crossing
threshold). Processing: demand forecast uplift propagated to expected deliveries. AI: elasticity
model (18) with sensitivity band. Optimization: capacity check → if deficit, pre-positioning +
deferral advisor. Decision: officer chooses mix. Outcome: plan absorbing surge; deficit, if any,
explicit and quantified rather than discovered late.

**G — What-if simulation.** Input: officer mutations (e.g. "bypass also closes, +12 h"). Processing:
CoW fork; mutations applied to fork. AI: full pipeline re-run on fork. Optimization: full CP-SAT
re-solve on fork. Decision: none — advisory by construction (33.4). User: S6 diff + narrative;
optionally promote. Outcome: live state untouched; question answered in < 3 s; run stored.

---

## 31. IMPORTANT USER WORKFLOWS

**W1 — Morning dispatch (Manager):** login → S1 review overnight alerts + forecast → S4 review
queue exceptions → approve plan → monitor via S1/S2.

**W2 — Disruption response (Manager):** alert drawer pops (event + computed impact) → S5 →
review stepper + plan diff → approve → notify drivers → S7 spot-check the record.

**W3 — Regional preparedness (Officer):** S3 time-slider +12 h → at-risk table → open
pre-positioning card → approve stock move → S6 stress-test the move ("what if the corridor
closes anyway?") → confirm.

**W4 — Judge interrogation (Officer, live):** "what if X?" → S6 map-pick X → run → diff →
"why?" on any row → S7 record → hover decomposition. The loop that ends questions.

**W5 — Driver day:** S8 assignment → depart → warning appears → one-tap report of seen
blockage → system corroborates → reroute card → deliver.

---

## 32. DEMO SCENARIO

### 32.1 Design principles

Six minutes, one story arc, three emotional beats (calm → alarm → control), zero network
dependencies, and one moment where the *judge* drives. Every claim made anywhere in this document
appears on screen during these six minutes or is not claimed in the pitch.

### 32.2 The script — "SCN-01: Monsoon Cascade"

| # | Beat | On screen | What it proves |
|---|---|---|---|
| 0 | *Cold open* — login as Manager; sim paused at 06:00; S1 all-green, S3 all-green | S1 | baseline competence; honest "before" |
| 1 | Run `/demo/scenario/scn-01`; clock ×20; weather timeline rolls in | S2 storm field | time control; real rainfall data |
| 2 | *First alarm* — S3 hexes degrade as antecedent rain saturates slopes; **vehicle-class toggle flipped live: the same terrain reads 7-for-truck vs 51-for-4×4** | S3 | **the thesis** (13.2) |
| 3 | Pre-positioning card fires (time-to-isolation < 24 h on two villages) → Officer approves stock move | S3 | prediction → action (18) |
| 4 | *Second alarm* — control-room event: landslide on the trunk corridor; S5 opens; **ten-step cascade stepper animates to completion in < 5 s**; plan diff: 4 vehicles, 6 deliveries, 1 emergency protected, 2 deferred (equity note visible) | S5 | the centrepiece (16.1) |
| 5 | Approval gate → one click → drivers reroute; S8 shows a driver's change card mid-route | S5→S8 | human-in-the-loop, field impact |
| 6 | S4: the rejected Route 1 row with its reason; Smart-vs-Naive toggle flipped — failures appear under naive | S4 | measured intelligence (24.3) |
| 7 | **Hand the controls over** — "close any road you like." Judge map-picks a segment (or two) → S6 diff in < 3 s → "why?" on any row → S7 full provenance | S6/S7 | the killer loop (19, 35) |
| 8 | *Resolution* — re-verification confirms clearance; R-114 re-opens (corroborated); heatmap recovers; S7 export: situation report | S2/S3/S7 | closures end too (16.3); full audit |

Fallbacks baked in: scenario is idempotent (`dedup_key`) and re-runnable; `/demo/reset` restores
initial state in one call; if *anything* wedges, the reset + jump-to-beat-4 path replays the
centrepiece alone in 90 seconds.

### 32.3 Q&A ammunition (pre-computed answers)

- *Training data?* → 11.1 honesty clause + accumulation loop + EVAL.md on screen.
- *False alerts?* → 16.3 three-layer answer + beat 8's demonstrated re-open.
- *Why not Google Maps?* → 3.6 row one, then beat 6's measured delta.
- *Scale beyond this?* → 46.3 scaling path; the region is a config bbox.
- *Where's the AI?* → 10.2 taxonomy, then beats 2–4 as the evidence.

---

## 33. SECURITY

### 33.1 Authentication & authorization

JWT (short-lived) + refresh; seeded demo accounts; passwords hashed (bcrypt); role capability
matrix (28) enforced server-side on every mutating route — the frontend hides, the backend
decides.

### 33.2 API & transport

HTTPS at deployment (reverse proxy); request-size caps; rate limits on public endpoints
(citizen form especially: 5/min/IP + honeypot); input validation everywhere (Pydantic); CORS
locked to the app origin; secrets via environment, never in the repo.

### 33.3 Data protection

Minimal personal data by design (drivers have names + vehicle, no location history beyond
assignment needs); citizen reports store no identity, only content + coarse location; audit log
is append-only; DB volume encrypted-at-rest at deployment discretion. File 1's privacy
principles — collect-minimal, consent-based reporting, no vulnerable-individual locations
published `[SOURCE]` — are honoured structurally: the Assisted Mobility workflow stores the
*request*, never the person's details, beyond what dispatch requires.

### 33.4 The human-authority boundary (the security-relevant design decision)

**The AI never executes.** Plans are `PROPOSED` until a human transition; the state machine has
no path from optimization output to driver notification that bypasses `approve`. Mandatory-gate
actions (33-capabilities table): emergency actions, priority overrides, closure overrides,
dispatch into risk above tolerance, deferrals of routine cargo. Additionally — and this is the
line to hold under questioning — *the LLM has no write path to any entity*. It reads
DecisionRecords and emits prose. Prompt injection in a report field can, at worst, produce a
confusing sentence in an explanation, because the explanation layer cannot mutate state
`[PROPOSED — stated as an architectural guarantee]`.

### 33.5 Model-abuse considerations

Adversarial event spam → rate limits + trust weights + corroboration (16.3); adversarial
*reports* aimed at steering traffic → trust weighting caps single-source influence, and `CLOSED`
requires corroboration — a lone attacker cannot close a road; model gaming via crafted inputs →
inputs are bounded/validated feature ranges, and T0 hard constraints are not model-predicted at
all, so they cannot be learned around.

---

## 34. RELIABILITY

### 34.1 The failure-and-edge-case register

| # | Case | Behaviour |
|---|---|---|
| 1 | GPS/telemetry unavailable | vehicle position goes stale-flagged (amber, "last seen T"); routing proceeds from last-known + plan; arrival updates via driver manual status (S8). Demo: vehicles are sim-driven; live telemetry is the adapter's problem. |
| 2 | Weather API fails | snapshot provider is default (22.2) — nothing to fail at demo; live adapter failure → last timeline + banner "forecast stale". |
| 3 | Traffic data missing | never a dependency (no traffic feed claimed — 0.3 honesty); time-of-day speed priors only. |
| 4 | Road info outdated/stale | every overlay carries `valid_at`; stale-beyond-threshold → confidence decays → `w_conf` raises costs; verification queue surfaces oldest. |
| 5 | Two routes score within ε | deterministic tie-break (12.3): confidence → lower risk → shorter → fewer segments; identical inputs give identical answers. |
| 6 | **No feasible route** | explicit infeasibility result, never a blank: destination's redundancy table + reasons (which constraints bind) + escalation options (defer / pre-position / alternate transport-future). "Cannot" is an answer with structure. |
| 7 | All suitable vehicles occupied | deferral advisor (F33): ranked options with impact; or pre-emption proposal for emergency cargo (gate). |
| 8 | Emergency demand > supply | critical-unassigned surfaces as an officer decision (17.3), never silent; equity caps already bound routine deferrals. |
| 9 | ML prediction low-confidence | band widens (by construction); below threshold → UI flags + recommends human judgement; `w_conf` already biased routing away from low-confidence corridors. |
| 10 | Conflicting sources | trust-weighted resolution (16.3): higher trust wins; near-equal → corroboration state, both shown in segment drawer. |
| 11 | False landslide alert | the three-layer answer (16.3): SUSPECTED ≠ CLOSED; decay; re-verification; demo beat 8 shows the full arc. |
| 12 | Vehicle goes offline mid-route | case 1 + assignment keeps planning basis; prolonged loss → stop marked unconfirmed; officer may reassign (gate). |
| 13 | Destination becomes inaccessible | time-to-isolation had already warned (13.4); post-facto: delivery → DEFERRED with cause; cluster flagged; pre-positioning re-recommended. |

### 34.2 System-level reliability

Health endpoint; structured logs with `sim_time` correlation; the demo reset path (32.2);
docker-compose `restart: unless-stopped`; DB seeded from immutable artifacts so *any* failure
ends in `reset → known-good state in < 30 s*. Graceful degradation ladder overall: LLM →
templates; ML → baselines; WS → polling; live adapters → snapshots. **The only unrecoverable
failure is the process itself, and compose restarts it.**

---

## 35. EXPLAINABLE AI (XAI)

### 35.1 The standard: every recommendation answers WHY

The master prompt's example is the contract `[SOURCE]` — and NE-Setu exceeds it because the
explanation is *stored data*, not generated narrative:

> **Route B recommended** because: Route A — closure probability 0.78 (risk tolerance 0.50 for
> MEDICAL cargo) → rejected; Route C — ETA p90 5 h 20 m vs 4 h window → rejected; **Route B —
> open, risk 0.21, band 2 h 50 m–4 h 30 m, 4×4 suitability 0.91, confidence 0.81**; Δ vs next
> best: +18 min for −0.34 risk. Approved by: Officer-1 at 14:22 sim.

### 35.2 Mechanism

Explainability is a **by-product of the pipeline's data discipline** (4.2): Stage A records
rejection reasons at filter time; Stage B records full cost decompositions per candidate; the
priority engine records score decomposition; the gate records the approver. The explanation
layer only *renders*: deterministic templates (always available, structured, precise) with
optional LLM prose enhancement (configurable, fallback-proved). LLM output is labelled as
"summary" beside the structured record it summarises — the prose never replaces the evidence.

### 35.3 Confidence, everywhere

Every displayed prediction carries band + confidence (Principle 4); low confidence escalates to
humans (34.1-9); the model-performance panel (F30) shows live calibration so trust is earned
visibly over the run. For government decision-making (3.5), this is the difference between a
tool that can be defended in an inquiry and one that cannot — and it is the strongest single
answer to "how do we know when to trust it?"

---

## 36. TECHNOLOGY STACK

Chosen on: free/open-source, hackathon-feasible, agent-buildable (well-known → AI agents write it
correctly), reliable at demo, self-hostable. `[per master prompt selection criteria]`

| Layer | Choice | Alternatives considered | Why this |
|---|---|---|---|
| Frontend framework | **React 18 + Vite + TypeScript** | Next.js, Streamlit | SPA is all we need; Vite's fast HMR suits agent iteration; Next's SSR buys nothing here. Streamlit rejected: cannot deliver the map-centric command-centre UX. |
| UI | **Tailwind + shadcn/ui** | MUI, Ant | fast, consistent, agents know it well. |
| Maps | **MapLibre GL JS + deck.gl** | Leaflet, Kepler | MapLibre = modern OSS default `[SOURCE F3]`; deck.gl for thousands of dynamic features; Kepler rejected (embedded-app friction). |
| Charts | Recharts | ECharts | sufficient, light. |
| Backend | **FastAPI (Python)** | Node/Express, Django | async + Pydantic validation + native to the entire pydata/GIS/ML ecosystem `[SOURCE F3]` — the decisive property: *one language spans API, GIS, and ML*. |
| Database | **PostgreSQL 16 + PostGIS** | SQLite+SpatiaLite, Mongo | spatial + relational + JSONB in one `[SOURCE F1/F3]`; docker volume persistence; industry-credible. |
| In-memory graph | **NetworkX** (pickled) | igraph, graph DBs | custom edge costs are the product (0.2-C5); igraph's speed edge is irrelevant at 8k nodes `[SOURCE F3]`. |
| GIS processing | **GeoPandas, Shapely, OSMnx, h3-py, rasterio** | QGIS pipelines | scripted, reproducible ETL `[SOURCE F3]`. |
| Optimization | **Google OR-Tools (CP-SAT)** | custom heuristics | constraint-provable, deterministic, milliseconds at our scale `[SOURCE F3]`. |
| ML | **LightGBM + scikit-learn + NumPy** | PyTorch, Prophet | tabular residual learning; PyTorch unjustified; Prophet rejected (0.3) `[SOURCE F3]`. |
| LLM (optional) | Any OpenAI-compatible API via thin adapter | LangChain/LangGraph, CrewAI | single call-site, template fallback; frameworks rejected (0.2-C3) `[SOURCE F3 — rule adopted, stack rejected]`. |
| Real-time | **FastAPI WebSocket** + 5 s polling fallback | MQTT, Socket.io server | one process, no broker (21.3). |
| Notifications | in-app + WS (demo); FCM adapter stub | Twilio/MSG91 | paid/approval-bound → future `[SOURCE F1]`. |
| Infra | **Docker Compose** (api, db, web, tiles) | k8s, cloud deploys | one command up/down; k8s is anti-hackathon. |
| Monitoring | structlog JSON + /health + F30 panel | Prometheus stack | sufficient; metrics *about the models* matter more than infra metrics here. |
| Testing | pytest + Vitest + Playwright (one e2e demo-path spec) | — | the invariants (below) must be machine-checked. |

**The two test-enforced invariants** (47.6): (1) *no plan ever routes a vehicle over a segment
violating a hard constraint* — fuzzed across random LNS states; (2) *identical inputs produce
identical plans* — determinism harness. Both are demo-day answers as much as QA: "provably" then
means something.

---

## 37. EXTERNAL DATA REQUIREMENTS

Consolidated from Section 22.1's register — the build-time shopping list, each with its fallback:

| Need | Source | Cost | Key? | Fallback |
|---|---|---|---|---|
| Road network + attributes | OSM via OSMnx | free | no | none needed |
| Elevation (30 m) | `elevation` pkg (SRTM/AWS tiles) | free | no | OpenTopography → grade proxy (disclosed) |
| Historical + forecast weather | Open-Meteo archive/forecast | free | no | bundled monsoon sample |
| Landslide/flood history | GSI Bhuvan layers | free | no | terrain-derived susceptibility proxy (disclosed) |
| Basemap tiles | self-hosted raster (build-time bake) | free | no | darker fallback style, also local |
| LLM prose (optional) | any OpenAI-compatible endpoint | ~pennies | yes | template renderer (proved) |

Live-integration seams that exist but are not demo-critical: IMD/broadcast alerts, road-authority
feeds, health inventory APIs, ferry schedules — all Future (F41), all behind provider interfaces
already.

---

## 38. MVP SCOPE

**In (the 27-hour product):** everything marked MVP in Section 9 — the LNS core, three hazard/
prediction models (two with fallback baselines), Stage A/B optimization with CP-SAT, the full
event→replan cascade with gate, what-if forking, the seven screens + driver + report form, sim
clock + scenario director, decision records with template XAI, provenance panel, model-perf
panel, naive comparator, demo reset.

**Explicitly out:** F31–F42 (SHOULD list is in 40's order; FUTURE per 9).

**Definition of done (demo-acceptance):**
1. `docker compose up` → usable system < 2 min on a clean machine.
2. SCN-01 runs end-to-end twice consecutively with `/demo/reset` between — identical results.
3. Replan cascade < 5 s; what-if < 3 s (21.4 budgets, stopwatch-checked).
4. Both test invariants (36) green in CI.
5. No external network required at any point after build.

---

## 39. FUTURE SCOPE

### 39.1 Near (post-SIH, weeks)
F31 situation-report export polish · F32 NL query hardening · F33 deferral advisor · F35 weather
archive depth · retraining endpoint on accumulated events (23.3) · second region (config bbox)
· auth hardening (real user management).

### 39.2 Mid (months)
F34 alternate-transport recommendation (ferry/air — graph is already mode-aware, 0.3) · F36
satellite change-detection layer · F41 live government integrations (IMD, road feeds, health
inventory) · multi-region deployment · FCM driver push · offline-capable driver PWA.

### 39.3 Program context `[SOURCE — File 1, retained deliberately]`
The long arc NE-Setu plugs into: the NE-Setu *program* as File 1 frames it — multimodal grid
(road/rail/river/air/drone), shared freight marketplace (F38), citizen accessibility assistant
(F40) with multilingual voice/SMS/IVR, drone corridors for medical last-mile (F37), sovereign
cloud + district edge deployment, and the two-zone pilot (Brahmaputra flood district + hill
district). Stakeholder map (DoNER, MoRTH, state disaster/health/transport departments, district
administration; transporters, cold-chain, e-commerce; community bodies, CSCs, SHGs, volunteers).
**None of it is on the 27-hour critical path; all of it is one slide in the pitch** — the working
MVP is the credential that makes the slide believable.

### 39.4 KPI framework (pitch metrics, measured on the demo where possible)
`[SOURCE — File 1's KPI list, MVP-adapted]` Logistics: delivery-time reduction, on-time emergency
rate, replan latency (demo-measurable: < 5 s vs a human phone-tree's ~15 min). Resilience:
time-to-detect (instant — event-driven), time-to-alternate (demo-measurable), early warnings
issued vs disruptions materialised. Accessibility: population within reliable access per vehicle
class over time. Model health: closure-prediction precision/recall, ETA calibration — live on
F30. Cost per kg / vehicle utilisation: instrumented in schema, honest "production KPI" framing.

---

## 40. FEATURE PRIORITIZATION (BUILD ORDER UNDER PRESSURE)

**The drop list — cut in this order if hours run short** (each cut keeps the demo coherent):

1. F32 NL query → 2. F33 deferral advisor → 3. F29 citizen form → 4. F28 mobility slice →
5. F26/F27 demand+pre-positioning (fold into officer narrative) → 6. F30 model-perf panel →
7. F24 scrub (keep play/×20) → 8. naive comparator (keep if any time at all — highest
   persuasive-value-per-hour in the whole build) → 9. LLM prose (template already complete).

**Never cut (the demo's load-bearing five):** LNS + class toggle (F02–F04), the cascade (F14,
F05), CP-SAT joint optimization (F12), what-if (F16), decision records + templates (F17/F18).
**Rationale:** beats 2, 4, 7, 8 of the demo script (32.2) are exactly these five; everything else
enriches, these five *are* the story.

---

## 41. FEASIBILITY ANALYSIS

### 41.1 MUST HAVE (MVP) — all judged buildable in-window
LNS core (pure Python + Postgres — low risk) · hazard curves (NumPy, low) · CP-SAT (proven at
this scale, low) · NetworkX routing (low; k-diversity is the only novel code) · ETA LightGBM
on synthetic corpus (medium — corpus generation is the real task) · event pipeline + corroboration
(medium — logic volume, not difficulty) · sim clock (low) · seven screens (the genuine hour-sink;
mitigated by one GeoCanvas reused everywhere) · templates XAI (low) · scenario director (low).

### 41.2 SHOULD HAVE
F31–F33, F35 — each independent, each droppable (40).

### 41.3 FUTURE (pitch-only)
F34, F36–F42 — zero build cost, real narrative value (39.3).

### 41.4 AVOID (with reasons) — consolidating 0.3
Drone ops (unfalsifiable in-window) · marketplace (different product) · SMS/IVR (approval
latency) · live satellite detection (latency + pipeline weight) · RL routing (no signal) ·
multi-agent LLM orchestration (non-reproducible) · Superset (heavy, generic) · k8s (ceremony) ·
second native app (halves quality).

### 41.5 The honest top-3 build risks
**(1) ETL data quality** — OSM tag gaps in remote areas (mitigation: seeded-attribute disclosure
22.1-D2; bbox chosen partly for coverage). **(2) Frontend hour-sink** (mitigation: GeoCanvas
reuse, shadcn, drop-list). **(3) Agent-coordination overhead across 4 parallel tracks**
(mitigation: the contract-first joins in 47.3 — schema and API frozen at hour 6).

---

## 42. RISS AND MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| DEM tile download fails at build | M | M | three-deep fallback chain (37) + proxy disclosed |
| OSM coverage gaps in bbox | M | M | seeded attributes, provenance panel, bbox choice |
| Synthetic-model question from judges | **H (will be asked)** | M | 11.1 honesty clause verbatim + accumulation loop + EVAL.md on screen |
| Frontend hours overrun | H | H | drop-list order (40), GeoCanvas reuse, feature freeze at h20 |
| Live API outage mid-demo | eliminated by design | — | snapshot-default architecture (22.2) |
| Judge pokes a broken edge | M | M | invariants tested (36); infeasible-states designed (34.1-6); reset path |
| Determinism drift | L | H | fixed seeds + determinism harness in CI |
| DB corruption mid-demo | L | H | compose restart + `/demo/reset` from immutable seed |
| LLM key/quota failure | M | L | template fallback complete and default-tested |
| Scope creep mid-build | **H** | H | this document is the freeze reference; changes require cutting 40-listed items |

---

## 43. SIH JUDGE EVALUATION (self-scored, pre-revision)

| Criterion | Score | Reasoning |
|---|---:|---|
| Problem alignment | 9 | six stated deliverables all addressed (2.1 table); region and hazards per statement. |
| Innovation | 8 | accessibility-as-entity + joint co-optimization + forked what-if; each with existing partial prior art, none joined (6.2). |
| Technical depth | 8 | hazard models, CP-SAT, learned ETA bands, event-sourced LNS, invariants tested. |
| AI relevance | 8 | inference+prediction+ranking+replanning taxonomy (10.1); honest tiering resists "where's the AI". |
| Feasibility | 9 | 27-hour plan with four tracks, frozen contracts, drop-list, three-deep data fallbacks. |
| Social impact | 8 | emergency medicine, equity term, at-risk villages, mobility slice; production path credible. |
| Scalability | 7 | region is config; but single-process, single-DB by design (46.3 is the honest answer). |
| Demonstrability | 9 | scripted-but-real demo, judge-driven what-if, reset safety, measured comparator. |
| Government usefulness | 9 | audit, approval gates, XAI, provenance, situation reports — inquiry-defensible by construction. |
| Differentiation | 8 | the join (6.2); naive comparator *measures* it rather than asserting it. |
| **Weighted overall** | **8.3** | |

---

## 44. WEAKNESSES (identified in self-review)

1. **Simulated ground truth.** Closures and the fleet are simulated; model metrics are
   replay-based. The strongest possible attack on the project (and it *will* come).
2. **Scalability is architectural-debt-by-choice.** Single process, in-memory graph, one Postgres
   — right for 27 hours, wrong for a state (43's lowest score).
3. **No live-data proof.** Provider seams exist (22.2) but no live integration is demonstrated;
   a judge can claim the system has never touched reality.
4. **ETA model learns simulated delay physics.** However principled the generator, real driver
   behaviour differs in kind, not just parameter.
5. **Single region, single language, driver view is thin.** English-only UI; driver offline mode
   is caching, not true offline operation.
6. **Accessibility (social) is a slice, not a pillar.** Present and real (F28, accessible van,
   destination flags) but modest versus File 1's ambition.
7. **Turn restrictions and traffic ignored in routing** — disclosed (24.2), but a sharp judge
   will note routing fidelity gaps.

---

## 45. IMPROVEMENTS (revision pass — what changed as a result)

Per the master prompt's requirement to improve once before finalising `[SOURCE]`, the following
were *added to the architecture* in this revision:

1. **The naive-baseline comparator (24.3, F-set, demo beat 6).** Directly answers W1/W3: the
   intelligence gap is now *measured on screen*, not asserted in prose. Cheapest credibility per
   hour in the build.
2. **The accumulation loop (23.3) + model-perf panel (F30) + EVAL.md discipline (23.5).** Answers
   W1/W4 head-on: the prototype's synthetic calibration is reframed as the *cold start* of a
   system that manufactures its own ground truth from day one.
3. **Data-provenance panel (22.1 rule).** Turns W1/W3 from a hidden vulnerability into a
   navigable honesty exhibit.
4. **Equity term + deferral cap (12.6).** Strengthens social-impact scoring at trivial cost;
   pre-empts the "optimiser abandons remote villages" objection.
5. **Determinism harness + the two invariants (36).** Converts W2/W7-adjacent doubts into
   machine-checked guarantees.
6. **Demo Q&A ammunition section (32.3).** W1/W3 are *will-happen* events; the team now has
   rehearsed, on-screen answers.
7. **`w_conf` in the cost function + stale-confidence decay (12.3-3, 34.1-4).** Makes low data
   quality a first-class optimization citizen rather than a footnote.

Accepted-and-logged unresolved weaknesses: W2, W3, W5, W7 — each has an honest answer (46.3,
22.2-seams, 39.1, 24.2-disclosure) rather than a pretence.

---

## 46. FINAL RECOMMENDED ARCHITECTURE (post-revision summary)

### 46.1 The one-paragraph version

One FastAPI process over Postgres/PostGIS holds an event-sourced **Living Network State** —
per-segment, per-vehicle-class, versioned traversability with full provenance. Build-time ETL
freezes real OSM/DEM/weather into enriched seed data; runtime, an event pipeline (trust-weighted,
corroborating, three-state) feeds hazard curves and a learned ETA model, which feed the
Accessibility Engine, which *is* the LNS. Routing and joint vehicle-route assignment run as
Stage-A-hard-filter → Stage-B-weighted-cost over that state, solved by NetworkX + CP-SAT,
deterministically, in seconds. Every result materialises as a DecisionRecord with all candidates
and rejection reasons; consequential actions stop at a human gate; the same pipeline over a
copied state is the what-if simulator. The UI is one map-centric React SPA in seven screens,
driven by a simulation clock that makes 72 hours fit six minutes. The only optional component in
the entire system is the LLM, which reads records and writes prose, and whose absence changes
nothing observable.

### 46.2 Component-to-claim traceability

| Pitch claim | Proven by | Section |
|---|---|---|
| "Knows which roads are usable, per vehicle, now and next 72 h" | LNS + heatmap + class toggle | 13, 29.3 |
| "Picks vehicle and route together, provably feasibly" | CP-SAT + Stage A + invariants | 12, 36 |
| "Responds to a landslide in under 5 seconds, fully audited" | cascade + DecisionRecord | 16, 25 |
| "Predicts trouble before it closes roads" | hazard horizons + time-to-isolation + pre-position | 11, 13.4, 18 |
| "Answers your what-if live" | forked simulation | 19 |
| "Explains every decision" | candidate persistence + templates (+optional LLM) | 35 |
| "Never acts alone on consequential decisions" | the gate as state machine | 33.4 |

### 46.3 Scaling path (the W2 answer, verbatim for judges)

*Region* is a bbox in config; *vehicles/deliveries* are rows; the graph is per-region pickled.
Next: extract pipeline stages into workers behind the existing event bus (functions are already
pure); shard LNS by region; add per-region graph services; Postgres read replicas + materialised
heatmap tiles. None of it touches the domain logic — the 27-hour architecture is the *shape* of
the scaled one, minus the distribution.

---

## 47. 27-HOUR BUILD PLAN (AI-AGENT EXECUTION)

Four parallel agent tracks with frozen contracts at the joins. Wall-clock plan for a small team
(or one operator herding agents); hours are cumulative from T0.

### 47.1 Track layout

```
TRACK A — DATA/GIS (agent)          TRACK B — BACKEND/ENGINE (agent)
 A1 bbox+OSM extract, graph.pkl      B1 FastAPI skeleton, Postgres schema+seed loader
 A2 DEM slope enrichment             B2 LNS engine + accessibility formulas
 A3 H3 grid, locations, seed fleet/  B3 event pipeline: ingest/trust/corroborate
   deliveries/cargo                  B4 route engine: Stage A + k-candidates + cost
 A4 weather archive pull+timeline    B5 CP-SAT optimizer + naive comparator
 A5 susceptibility priors, feature   B6 cascade orchestration + gate + decision records
   table, model training + EVAL.md   B7 sim clock + scenario director + WS
                                     B8 what-if fork + diff
TRACK C — FRONTEND (agent)           TRACK D — ML/DEMO CONTENT (agent)
 C1 Vite+MapLibre+GeoCanvas          D1 hazard curves + calibration artifacts
 C2 store + WS/poll wiring           D2 ETA corpus + LightGBM + fallback
 C3 S2 live map + S3 heatmap         D3 scenario script SCN-01 + demo data polish
 C4 S4 plan/dispatch + comparator    D4 pitch deck + Q&A sheet (from 32.3, 46)
 C5 S5 console + stepper             D5 EVAL.md + provenance data assembly
 C6 S6 simulator + S7 log + XAI
 C7 S1 dashboard + S8 driver + S9 form
```

### 47.2 Hour-by-hour

| Hours | A | B | C | D |
|---|---|---|---|---|
| 0–3 | A1–A2 | B1 (+schema freeze with A) | C1 | read this doc; D1 spec |
| 3–6 | A3–A4 | B2–B3 | C2–C3 (S2 first) | D1 |
| **6–8** | **CONTRACT FREEZE: schema (25) + API (26) + graph.pkl + seed SQL + model artifact interfaces — no downstream drift after this point** | | | |
| 8–12 | A5 | B4–B5 | C3–C4 | D2 |
| 12–16 | support/fixes | B6–B7 | C5–C6 | D3 |
| 16–20 | provenance data | B8 | C6–C7 | D4 skeleton, D5 |
| 20–24 | buffer | perf pass (21.4 budgets) | polish pass | **D3 dry-run #1 (recorded)** |
| 24–27 | buffer | invariant tests green | bugfixes only — **feature freeze h20** | dry-run #2, reset drill, EVAL.md final |

Human checkpoints (non-negotiable): h8 contract review · h16 cascade demo on real data · h20
freeze · h26 full SCN-01 + reset + judge-poke drill.

### 47.3 The joins (where tracks meet)

`graph.pkl + seed.sql` (A→B) at h6–8 · REST/WS contracts (B↔C) frozen at h8 · model artifacts
`*.joblib + feature schemas` (D→B) frozen at h8 · SCN-01 event script (D→B7) at h16. Everything
after a freeze is additive-only.

### 47.4 If only half the time materialises

Cut to the **load-bearing five** (40): LNS+heatmap+toggle, event→cascade, CP-SAT plan screen,
what-if, decision log with templates. Dashboard becomes a static header over the map; driver view
becomes a JSON panel; SCN-01 collapses to beats 2→4→7. Still a complete, honest story.

### 47.5 Demo-day runbook

Boot order: db → api (seed verify via /health) → web → `POST /demo/reset` → SCN-01 armed.
Break-glass: `/demo/reset` + jump-to-beat (32.2). Two laptops, one hot spare with the stack
pre-pulled. No wifi needed for anything (22.2).

### 47.6 Acceptance gates (from 38, restated as the final checklist)

reset→SCN-01 twice identical · cascade < 5 s · what-if < 3 s · invariants 1–2 green ·
zero network post-build. All five green = ship it.

---

## FINAL PRODUCT DEFINITION (Section 48 — closing summary)

**NE-Setu** — *when the road disappears, the plan doesn't.*

An AI-powered adaptive logistics and accessibility intelligence platform for difficult terrain.
It maintains a live, versioned, per-vehicle-class model of which roads are actually usable — now
and through 72-hour hazard horizons — and continuously converts that model into joint
cargo→vehicle→route plans that are provably feasible, fully explained with their rejected
alternatives, and committed only through human approval. A landslide in the demo costs the
operator one approval click and five seconds, not fifteen phone calls and a stranded fleet; a
judge's hypothetical costs three seconds and one screen. The prototype runs one real corridor —
Guwahati to the Khasi hills — on real roads, real elevation and real monsoon rainfall, with its
simulated elements disclosed rather than disguised, and with the accumulation loop that turns
operation into training data. The vision it opens (39.3) is File 1's program: a multimodal,
inclusive, regional logistics brain. The MVP that earns the right to promise it is this document.

*— end of MASTER_PROJECT_OVERVIEW.md —*

