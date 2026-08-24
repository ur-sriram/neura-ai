# PHASE 07 — TESTING & INVARIANTS
**Track:** A | **Hours:** 20–24 | **Agent:** QA Agent  
**Output:** Automated test suite covering the two machine-checked invariants + integration tests  
**Master spec refs:** Section 36 (Technology Stack — testing), Section 38.3 (Definition of Done), Section 41.5 (Build risks)

---

## Context

You are writing the **test suite** for NE-Setu. Two invariants MUST be machine-checked — they are cited in the demo as "provably" guarantees. Additionally, write integration tests for the demo's critical paths.

**Tech:** pytest (backend), Vitest (frontend unit), Playwright (E2E demo path).

---

## Critical Invariants (Machine-Checked — NON-NEGOTIABLE)

These two tests must be in CI and must be green on demo day:

### Invariant 1: Safety Invariant — No Plan Routes Over a Closed or Infeasible Segment

```python
# tests/test_invariants.py
import pytest, random, copy
from app.pipeline.cascade import run_cascade
from app.pipeline.accessibility_engine import compute_accessibility

@pytest.mark.parametrize("seed", range(50))
async def test_no_route_over_closed_segment(db_session, seed):
    """
    Fuzz test: generate random LNS states, run optimiser, verify no assignment
    uses a CLOSED segment or a segment that violates the vehicle's maxweight constraint.
    """
    rng = random.Random(seed)
    
    # Randomly close 1–3 segments
    segments = await get_all_segments(db_session)
    closed_ids = set(seg.id for seg in rng.sample(segments, rng.randint(1, 3)))
    
    for seg_id in closed_ids:
        await set_segment_status(db_session, seg_id, 'CLOSED', trust=1.0)
    
    # Run optimiser
    plan = await run_cascade(db_session, trigger_event_id=None, sim_hour=0)
    
    # Verify: no assignment's route passes through any closed segment
    for assignment in plan.assignments:
        for segment_id in assignment.route_segment_ids:
            assert segment_id not in closed_ids, (
                f"Assignment {assignment.id} routes through CLOSED segment {segment_id} "
                f"(seed={seed}). SAFETY INVARIANT VIOLATED."
            )
            seg = next(s for s in segments if s.id == segment_id)
            vehicle = await get_vehicle(db_session, assignment.vehicle_id)
            if seg.maxweight:
                assert vehicle.weight_kg <= seg.maxweight * 1000, (
                    f"Vehicle {vehicle.label} ({vehicle.weight_kg}kg) routed over "
                    f"segment with maxweight {seg.maxweight}t (seed={seed})."
                )
```

### Invariant 2: Determinism Invariant — Identical Inputs → Identical Plan

```python
@pytest.mark.parametrize("scenario", ["scn01_rain", "scn01_landslide", "normal_dispatch"])
async def test_plan_determinism(db_session, scenario):
    """
    Run the full cascade twice with the same inputs.
    The resulting plan must be byte-identical in structure.
    """
    # Reset to known state
    await reset_demo(db_session)
    await load_scenario_state(db_session, scenario)
    
    # Run 1
    plan_a = await run_cascade(db_session, trigger_event_id=None, sim_hour=36)
    plan_a_routes = extract_plan_routes(plan_a)
    
    # Reset and run again (same state)
    await reset_demo(db_session)
    await load_scenario_state(db_session, scenario)
    
    plan_b = await run_cascade(db_session, trigger_event_id=None, sim_hour=36)
    plan_b_routes = extract_plan_routes(plan_b)
    
    assert plan_a_routes == plan_b_routes, (
        f"DETERMINISM INVARIANT VIOLATED for scenario '{scenario}'. "
        f"Plans differ:\n{diff(plan_a_routes, plan_b_routes)}"
    )

def extract_plan_routes(plan) -> dict:
    """Extract a hashable representation of plan structure."""
    return {
        str(a.vehicle_id): {
            'segments': tuple(sorted(a.route_segment_ids)),
            'deliveries': tuple(sorted(str(s.delivery_id) for s in a.stops))
        }
        for a in plan.assignments
    }
```

---

## Backend Unit Tests

```python
# tests/unit/test_accessibility_engine.py

def test_closed_segment_scores_zero():
    segment = MockSegment(surface='paved', mean_grade=2.0, maxweight=20.0)
    score, _ = compute_accessibility(segment, 'heavy', weather_rain_mm=0.0, hazard_p=0.0, status='CLOSED')
    assert score == 0.0

def test_overweight_scores_zero():
    segment = MockSegment(surface='paved', mean_grade=2.0, maxweight=3.0)  # 3 tonne bridge
    score, _ = compute_accessibility(segment, 'heavy', weather_rain_mm=0.0, hazard_p=0.0, status='OPEN')
    assert score == 0.0  # heavy truck (10t) > 3t limit

def test_4x4_passes_where_heavy_fails():
    segment = MockSegment(surface='track', mean_grade=11.0, maxweight=5.0)  # steep track
    heavy_score, _ = compute_accessibility(segment, 'heavy', 0.0, 0.0, 'OPEN')
    fourx_score, _ = compute_accessibility(segment, '4x4', 0.0, 0.0, 'OPEN')
    assert fourx_score > heavy_score

def test_accessibility_score_range():
    """Score must always be in [0, 100]."""
    import random; rng = random.Random(42)
    for _ in range(200):
        seg = MockSegment(
            surface=rng.choice(['paved','gravel','dirt','track']),
            mean_grade=rng.uniform(0, 20),
            maxweight=rng.choice([None, 5.0, 10.0, 20.0])
        )
        for vclass in ['heavy','mini','4x4','special']:
            score, _ = compute_accessibility(seg, vclass, rng.uniform(0,20), rng.uniform(0,1), 'OPEN')
            assert 0.0 <= score <= 100.0

def test_suspected_road_costs_more_than_open():
    segment = MockSegment(surface='paved', mean_grade=2.0, maxweight=20.0)
    open_score, _ = compute_accessibility(segment, 'heavy', 0.0, 0.0, 'OPEN')
    suspected_score, _ = compute_accessibility(segment, 'heavy', 0.0, 0.0, 'SUSPECTED')
    assert suspected_score < open_score
    assert suspected_score > 0.0  # SUSPECTED is routable, just penalised

# tests/unit/test_event_ingestor.py

async def test_dedup_key_prevents_duplicate_events(db_session):
    event_data = {"type": "landslide", "payload": {}, "dedup_key": "test_001", "source_type": "control_room"}
    result1 = await ingest_event(db_session, event_data)
    result2 = await ingest_event(db_session, event_data)  # same dedup_key
    assert result1.id == result2.id  # same event returned
    events = await get_events_by_dedup(db_session, "test_001")
    assert len(events) == 1  # not duplicated

async def test_high_trust_event_closes_segment_immediately(db_session):
    segment_id = KNOWN_SEGMENT_ID
    await ingest_event(db_session, {
        "type": "landslide", "source_type": "control_room",
        "segment_ids": [segment_id], "dedup_key": "ht_001"
    })
    overlay = await get_latest_overlay(db_session, segment_id)
    assert overlay.status == 'CLOSED'

async def test_low_trust_event_sets_suspected_not_closed(db_session):
    segment_id = KNOWN_SEGMENT_ID
    await ingest_event(db_session, {
        "type": "report", "source_type": "citizen",
        "segment_ids": [segment_id], "dedup_key": "lt_001"
    })
    overlay = await get_latest_overlay(db_session, segment_id)
    assert overlay.status == 'SUSPECTED'

# tests/unit/test_cascade_timing.py

async def test_cascade_completes_under_5_seconds(db_session):
    import time
    await ingest_event(db_session, {"type": "landslide", "source_type": "control_room",
                                     "segment_ids": [TRUNK_SEGMENT_ID], "dedup_key": "timing_001"})
    start = time.monotonic()
    await run_cascade(db_session, sim_hour=36)
    elapsed = time.monotonic() - start
    assert elapsed < 5.0, f"Cascade took {elapsed:.1f}s — exceeds 5s SLA"

async def test_whatif_completes_under_3_seconds(db_session):
    import time
    start = time.monotonic()
    result = await run_simulation(db_session, mutations=[
        {"type": "close_segment", "segment_id": TRUNK_SEGMENT_ID}
    ], time_offset=0)
    elapsed = time.monotonic() - start
    assert elapsed < 3.0, f"What-if took {elapsed:.1f}s — exceeds 3s SLA"
```

---

## API Integration Tests

```python
# tests/integration/test_api.py
import pytest
from httpx import AsyncClient

@pytest.fixture
async def auth_headers(client):
    resp = await client.post("/auth/login", json={"username": "manager1", "password": "demo123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

async def test_event_post_triggers_ws_notification(client, ws_client, auth_headers):
    """Post event → WS should receive lns_update within 2s."""
    messages = []
    ws_client.on_message = lambda m: messages.append(m)
    
    await client.post("/events", json={
        "type": "landslide", "source_type": "control_room",
        "payload": {}, "dedup_key": "ws_test_001"
    }, headers=auth_headers)
    
    await asyncio.sleep(2.0)  # wait for cascade
    lns_messages = [m for m in messages if m.get('type') == 'lns_update']
    assert len(lns_messages) >= 1

async def test_demo_reset_is_idempotent(client, auth_headers):
    """Reset twice → same clean state both times."""
    await client.post("/demo/reset", headers=auth_headers)
    kpi1 = (await client.get("/analytics/kpi", headers=auth_headers)).json()
    await client.post("/demo/reset", headers=auth_headers)
    kpi2 = (await client.get("/analytics/kpi", headers=auth_headers)).json()
    assert kpi1 == kpi2

async def test_unauthenticated_request_returns_401(client):
    resp = await client.get("/analytics/kpi")
    assert resp.status_code == 401

async def test_driver_cannot_access_plan_endpoint(client):
    resp = await client.post("/auth/login", json={"username": "driver1", "password": "demo123"})
    token = resp.json()["access_token"]
    resp = await client.post("/optimization/plan", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
```

---

## E2E Demo Path Test (Playwright)

```typescript
// tests/e2e/demo_scn01.spec.ts
import { test, expect } from '@playwright/test';

test.describe('SCN-01 Monsoon Cascade Demo Path', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:8000/demo/reset', {
      headers: { Authorization: `Bearer ${MANAGER_TOKEN}` }
    });
  });

  test('Beat 2: vehicle-class toggle recolours map', async ({ page }) => {
    await page.goto('/map');
    await page.click('[data-testid="vclass-4x4"]');
    await expect(page.locator('[data-testid="map-canvas"]')).toBeVisible();
    // Score chip should update (check for orange/red on steep segments)
    // This is a visual test — screenshot comparison
    await expect(page).toHaveScreenshot('vclass-4x4.png', { maxDiffPixelRatio: 0.02 });
  });

  test('Beat 4: cascade stepper completes within 5 seconds', async ({ page }) => {
    await page.goto('/disruption');
    
    // Inject the landslide event
    await fetch('http://localhost:8000/events', {
      method: 'POST',
      body: JSON.stringify({ type: 'landslide', source_type: 'control_room',
                             dedup_key: 'e2e_landslide_01' })
    });
    
    // Stepper should animate
    const stepperContainer = page.locator('[data-testid="cascade-stepper"]');
    await expect(stepperContainer).toBeVisible();
    
    const start = Date.now();
    await expect(page.locator('[data-testid="stepper-step-9"]')).toHaveClass(/bg-green-500/, { timeout: 5000 });
    expect(Date.now() - start).toBeLessThan(5000);
  });

  test('Beat 5: approval gate visible and clickable', async ({ page }) => {
    await page.goto('/disruption');
    // After cascade, approval gate must appear
    await expect(page.locator('[data-testid="approval-gate"]')).toBeVisible({ timeout: 6000 });
    await page.click('[data-testid="approve-plan-btn"]');
    await expect(page.locator('[data-testid="approval-gate"]')).not.toBeVisible();
  });

  test('Beat 7: what-if returns diff in under 3 seconds', async ({ page }) => {
    await page.goto('/whatif');
    await page.click('[data-testid="preset-bypass-closes"]');
    
    const start = Date.now();
    await page.click('[data-testid="run-simulation-btn"]');
    await expect(page.locator('[data-testid="diff-table"]')).toBeVisible({ timeout: 3000 });
    expect(Date.now() - start).toBeLessThan(3000);
  });

  test('Demo reset: running SCN-01 twice gives identical results', async ({ page, request }) => {
    // Run 1
    await request.post('http://localhost:8000/demo/scenario/scn-01', 
                       { headers: { Authorization: `Bearer ${MANAGER_TOKEN}` }});
    await page.waitForTimeout(2000);
    const kpi1 = await request.get('http://localhost:8000/analytics/kpi',
                                   { headers: { Authorization: `Bearer ${MANAGER_TOKEN}` }});
    
    // Reset + Run 2
    await request.post('http://localhost:8000/demo/reset',
                       { headers: { Authorization: `Bearer ${MANAGER_TOKEN}` }});
    await request.post('http://localhost:8000/demo/scenario/scn-01',
                       { headers: { Authorization: `Bearer ${MANAGER_TOKEN}` }});
    await page.waitForTimeout(2000);
    const kpi2 = await request.get('http://localhost:8000/analytics/kpi',
                                   { headers: { Authorization: `Bearer ${MANAGER_TOKEN}` }});
    
    expect(await kpi1.json()).toEqual(await kpi2.json());
  });
});
```

---

## Test Configuration

```python
# pytest.ini
[pytest]
asyncio_mode = auto
testpaths = tests
filterwarnings = ignore::DeprecationWarning

# conftest.py
@pytest.fixture(scope="function")
async def db_session():
    """Fresh DB session, rolled back after each test."""
    async with AsyncSession(test_engine) as session:
        async with session.begin():
            yield session
            await session.rollback()
```

```typescript
// playwright.config.ts
export default {
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
  },
  webServer: [
    { command: 'docker compose up', url: 'http://localhost:8000/health', reuseExistingServer: true },
    { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
  ]
};
```

---

## Acceptance Criteria

- [ ] `pytest tests/test_invariants.py -v` → all 50 safety-invariant seeds pass
- [ ] `pytest tests/test_invariants.py::test_plan_determinism -v` → all 3 scenarios pass
- [ ] `pytest tests/unit/ -v` → all unit tests pass
- [ ] `pytest tests/integration/ -v` → all integration tests pass
- [ ] `npx playwright test` → SCN-01 E2E path passes end-to-end
- [ ] CI pipeline (`github-actions.yml` or equivalent) runs both test suites
- [ ] Test output shows "SAFETY INVARIANT" and "DETERMINISM INVARIANT" labels for easy demo reference
