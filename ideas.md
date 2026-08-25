# NEURA AI — Design Direction

## Three initial approaches

### Theme Name: Signal Room
Very Brief Intro: A dark, instrument-panel command center that treats operational truth as a visual material: precise, quiet, and always legible under pressure.
Probability: 0.07

### Theme Name: Monsoon Ledger
Very Brief Intro: A paper-and-ink intelligence system inspired by field notebooks, survey maps, and government logistics archives; tactile and documentary.
Probability: 0.03

### Theme Name: Meridian Glass
Very Brief Intro: A high-contrast observatory interface using cool glass, thin lines, and deep spatial layering to make network state feel navigable and alive.
Probability: 0.09

## Chosen Approach: Signal Room

### Design Movement
Contemporary Swiss Internationalism translated into a modern mission-control interface: strict typographic rhythm, modular information density, and a small set of high-salience signals.

### Core Principles
1. **Operational clarity over decoration.** Every visual element earns its place by helping an operator decide, verify, or act.
2. **Tension through hierarchy.** Quiet graphite surfaces and thin rules create a stable field; blue, amber, and red are reserved for signal states.
3. **Evidence is visible.** Confidence, provenance, approval status, and rejected alternatives are treated as first-class UI content.
4. **Dense but breathable.** Information is compact, but section boundaries, baseline rhythm, and generous key metrics prevent visual fatigue.

### Color Philosophy
Graphite is the neutral ground because it lowers glare and makes state colors legible. Signal blue means active, verified system motion; amber marks operator attention and pending review; red is reserved for confirmed danger or a hard constraint failure. A pale mineral canvas appears in data-heavy tables so the product feels like a field instrument, not a consumer app.

### Layout Paradigm
An asymmetric fixed navigation rail anchors the product. The workspace uses a 12-column operational canvas with uneven zones: a large state surface on the left, a narrow evidence rail on the right, and horizontal bands for actions and timelines. Maps, route diagrams, and charts deliberately break out of card grids to feel like instruments embedded in the page.

### Signature Elements
- A blue vertical signal bar on the active navigation item and critical section headers.
- Monospace “readouts” for IDs, timestamps, confidence, distance, and model versions.
- Hairline map geometry and route strokes that echo the navigation signal blue.

### Interaction Philosophy
Interactions should feel deliberate, reversible, and auditable. Hover states reveal context; primary actions are explicit; approvals and emergency changes require a second confirmation surface. Navigation is immediate, while occasional drawers and confirmations use short, physical-feeling motion.

### Animation
Use 160–220ms ease-out transitions for hover, tabs, and navigation. Let the active signal bar and map routes ease into place rather than pulse. Reserve motion for state changes: a plan moving from proposed to approved, a drawer entering from the right, or a simulation timeline advancing. Respect reduced-motion preferences.

### Typography System
Display and section titles use **Space Grotesk** with tight tracking and strong weight contrast. Body and labels use **IBM Plex Sans** for compact legibility. IDs, timestamps, coordinates, and metrics use **IBM Plex Mono**. H1 is 28–32px, section titles 15–17px, labels 10–11px uppercase with 0.12em tracking, body 12–14px.

### Brand Essence
NEURA AI is the explainable operations intelligence layer for teams moving people, assets, and aid through uncertain terrain—different because every proposed action shows its evidence and its limits.
Personality adjectives: **decisive, accountable, composed**.

### Brand Voice
Headlines are direct and situational. CTAs name the consequence or next step. Microcopy is factual, never theatrical, and always distinguishes live, seeded, assumed, and simulated data.

Example lines:
- “The shortest route is not feasible. Review the safe plan.”
- “Approval gate open — no dispatch has been committed.”

### Wordmark & Logo
The mark is a compact “N” formed from two offset route strokes crossing at a single node, rendered as a solid blue signal glyph with no text. The NEURA AI wordmark uses Space Grotesk SemiBold with a custom cut in the A counter to echo the node motif.

### Signature Brand Color
**Signal Blue #2F80ED** — the ownable color of verified motion, active routes, and system confidence.

## Style Decisions
- Product name is always **NEURA AI** in UI copy. The provided NE-Setu reference is treated as source material only, never as the visible brand.
- The product opens on the working Operations Dashboard.
- No decorative hero imagery; maps and operational diagrams are the visual centerpiece.
- All seven screens use the same shell, density, typography, status vocabulary, and interaction grammar.

## Style Decisions

- Signal Blue #2F80ED is reserved for verified motion, active route/state, primary operational commitment, and active navigation; secondary controls use graphite and hairline treatment.
- Data-heavy audit, provenance, and ledger surfaces use a pale mineral instrument canvas to distinguish evidence records from dark live-state map surfaces.
- Every screen must resolve into one dominant operational surface plus one evidence/action rail; avoid equal-weight card stacks unless the page is explicitly a ledger.
