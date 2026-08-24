from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.schema import Plan, Assignment, Stop, DecisionRecord, ApprovalEvent
from app.services.websocket import ws_manager

router = APIRouter(prefix="/plans", tags=["Plans"])

@router.get("/active")
async def get_active_plan(db: AsyncSession = Depends(get_db)):
    """Returns latest proposed or active logistics plan."""
    res_p = await db.execute(select(Plan).order_by(Plan.created_sim.desc()))
    plan = res_p.scalars().first()

    if not plan:
        return {'plan': None, 'assignments': [], 'decision_record': None}

    res_a = await db.execute(select(Assignment).where(Assignment.plan_id == plan.id))
    assignments = res_a.scalars().all()

    res_d = await db.execute(select(DecisionRecord).where(DecisionRecord.plan_id == plan.id))
    dec_record = res_d.scalars().first()

    assign_list = []
    for a in assignments:
        res_s = await db.execute(select(Stop).where(Stop.assignment_id == a.id).order_by(Stop.seq))
        stops = res_s.scalars().all()
        assign_list.append({
            'id': str(a.id),
            'vehicle_id': str(a.vehicle_id),
            'depart_sim': a.depart_sim,
            'eta_p50': a.eta_p50,
            'eta_p90': a.eta_p90,
            'risk_score': a.risk_score,
            'status': a.status,
            'stops': [{'id': str(s.id), 'delivery_id': str(s.delivery_id), 'seq': s.seq} for s in stops]
        })

    return {
        'plan': {
            'id': str(plan.id),
            'version': plan.version,
            'mode': plan.mode,
            'status': plan.status,
            'objective_value': plan.objective_value,
            'created_sim': plan.created_sim
        },
        'assignments': assign_list,
        'decision_record': {
            'id': str(dec_record.id) if dec_record else None,
            'rationale_template': dec_record.rationale_template if dec_record else None,
            'candidates': dec_record.candidates if dec_record else [],
            'selection': dec_record.selection if dec_record else {},
            'confidence': dec_record.confidence if dec_record else 0.9
        } if dec_record else None
    }

@router.post("/{plan_id}/approve")
async def approve_plan(plan_id: UUID, note: str = "Approved by officer", db: AsyncSession = Depends(get_db)):
    """Human authority gate transition: PROPOSED -> APPROVED."""
    res = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan.status = 'APPROVED'
    
    app_evt = ApprovalEvent(
        decision_id=None,
        action='approve',
        note=note
    )
    db.add(app_evt)
    await db.commit()

    await ws_manager.broadcast({
        'type': 'plan_approved',
        'plan_id': str(plan_id),
        'status': 'APPROVED'
    })

    return {'status': 'success', 'plan_id': str(plan_id), 'new_status': 'APPROVED'}
