from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.schema import Event
from app.pipeline import event_ingestor, cascade
from app.services.websocket import ws_manager
from app.services.sim_clock import sim_clock

router = APIRouter(prefix="/events", tags=["Events"])

class EventCreate(BaseModel):
    type: str  # landslide, flood, report, weather, breakdown, surge, scenario
    payload: Dict[str, Any]
    source_type: str = 'control_room'
    dedup_key: Optional[str] = None

@router.post("")
async def create_event(
    req: EventCreate,
    db: AsyncSession = Depends(get_db)
):
    """Ingests incoming event, applies 3-state transitions, and runs 9-stage cascade loop."""
    event = await event_ingestor.ingest_event(
        db=db,
        event_type=req.type,
        payload=req.payload,
        source_type=req.source_type,
        sim_hour=sim_clock.sim_hour,
        dedup_key=req.dedup_key
    )

    # Run 9-stage cascade loop
    cascade_result = await cascade.run_cascade(db, trigger_event_id=event.id, sim_hour=sim_clock.sim_hour)

    # Broadcast WebSocket update
    await ws_manager.broadcast({
        'type': 'event_ingested',
        'event_id': str(event.id),
        'event_type': req.type,
        'sim_time': sim_clock.sim_hour,
        'lns_version': cascade_result['lns_version'],
        'requires_approval': cascade_result['requires_approval']
    })

    return {
        'status': 'success',
        'event_id': str(event.id),
        'corroboration_count': event.corroboration_count,
        'cascade': cascade_result
    }

@router.get("")
async def list_events(db: AsyncSession = Depends(get_db)):
    """Lists all ingested events."""
    res = await db.execute(select(Event).order_by(Event.received_sim.desc()))
    events = res.scalars().all()
    out = []
    for e in events:
        out.append({
            'id': str(e.id),
            'type': e.type,
            'source_type': e.source_type,
            'source_trust': e.source_trust,
            'corroboration_count': e.corroboration_count,
            'received_sim': e.received_sim,
            'payload': e.payload,
            'resolved': e.resolved
        })
    return out
