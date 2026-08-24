import time
from uuid import UUID
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.schema import Event, Delivery, Vehicle, SegmentOverlay, Plan, DecisionRecord
from app.pipeline import hazard_engine, accessibility_engine, plan_optimizer, explanation_layer

class CascadeTimer:
    def __init__(self):
        self.start = time.perf_counter()
        self.checkpoints = {}

    def checkpoint(self, name: str):
        self.checkpoints[name] = round((time.perf_counter() - self.start) * 1000.0, 1)

    @property
    def total_sec(self) -> float:
        return time.perf_counter() - self.start

def needs_human_approval(plan: Plan, trigger_event: Optional[Event] = None) -> bool:
    """Human authority gate rules (Section 33.4)."""
    if plan.mode == 'EMERGENCY':
        return True
    if trigger_event and trigger_event.type in ['landslide', 'flood', 'breakdown']:
        return True
    return False

async def run_cascade(db: AsyncSession, trigger_event_id: Optional[UUID] = None, sim_hour: int = 0) -> Dict[str, Any]:
    """
    Continuous 9-stage loop orchestrator.
    Guaranteed < 5.0 seconds total execution budget.
    """
    timer = CascadeTimer()

    # Fetch trigger event
    trigger_event = None
    if trigger_event_id:
        res_e = await db.execute(select(Event).where(Event.id == trigger_event_id))
        trigger_event = res_e.scalar_one_or_none()

    # 3. PREDICT
    await hazard_engine.compute_hazard_forecasts(db, sim_hour)
    timer.checkpoint("predict_hazard")

    # 4. ASSESS -> updates LNS
    new_lns_version = await accessibility_engine.update_lns(db, sim_hour)
    timer.checkpoint("assess_lns")

    # Fetch active overlays map
    res_ov = await db.execute(select(SegmentOverlay).where(SegmentOverlay.lns_version == new_lns_version))
    overlays_map = {ov.segment_id: ov for ov in res_ov.scalars().all()}

    # Fetch active deliveries & available vehicles
    res_d = await db.execute(select(Delivery).where(Delivery.status.in_(['NEW', 'PLANNED'])))
    deliveries = res_d.scalars().all()

    res_v = await db.execute(select(Vehicle))
    vehicles = res_v.scalars().all()

    # 5. OPTIMIZE
    plan, assignments, stops, cands_record, decision_rec = plan_optimizer.optimize_plan(
        deliveries, vehicles, overlays_map, sim_hour=sim_hour
    )
    timer.checkpoint("optimize_cpsat")

    # 6. APPROVE (Human authority boundary gate)
    requires_gate = needs_human_approval(plan, trigger_event)
    plan.status = 'PROPOSED' if requires_gate else 'APPROVED'

    # Save Plan, Assignments, Stops & Decision Record
    db.add(plan)
    for a in assignments: db.add(a)
    for s in stops: db.add(s)

    # 8. EXPLANATION LAYER
    template_prose = explanation_layer.render_template_explanation(cands_record, decision_rec.selection)
    decision_rec.rationale_template = template_prose
    db.add(decision_rec)

    await db.flush()
    timer.checkpoint("act_commit")

    total_time = timer.total_sec
    assert total_time < 5.0, f"Cascade latency {total_time:.2f}s exceeded 5s SLA"

    return {
        'status': 'success',
        'lns_version': new_lns_version,
        'plan_id': str(plan.id),
        'plan_status': plan.status,
        'requires_approval': requires_gate,
        'timing_ms': timer.checkpoints,
        'total_sec': round(total_time, 3),
        'explanation': template_prose
    }
