from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from app.database import get_db
from scripts.reset_demo import reset_demo_state
from app.pipeline import event_ingestor, cascade
from app.services.sim_clock import sim_clock
from app.services.websocket import ws_manager

router = APIRouter(prefix="/demo", tags=["Demo"])

@router.post("/scenario/scn-01")
async def trigger_demo_scenario(db: AsyncSession = Depends(get_db)):
    """
    Triggers automated 6-minute demo scenario arc SCN-01 (Monsoon Cascade):
    1. Advances clock to sim_hour = 36 (storm peak)
    2. Posts landslide event on trunk corridor segment
    3. Triggers 9-stage replan cascade loop
    """
    sim_clock.seek(36)
    sim_clock.set_speed(20)

    # Ingest trunk blockage event
    event = await event_ingestor.ingest_event(
        db=db,
        event_type='landslide',
        payload={
            'segment_ids': [100001, 100002],
            'description': 'Major landslide on NH-6 trunk corridor near Nongpoh hairpin bends',
            'severity': 'HIGH'
        },
        source_type='control_room',
        sim_hour=36,
        dedup_key='scn-01-landslide-nh6'
    )

    cascade_res = await cascade.run_cascade(db, trigger_event_id=event.id, sim_hour=36)

    await ws_manager.broadcast({
        'type': 'alert',
        'severity': 'HIGH',
        'message': 'CRITICAL ALARM: Landslide confirmed on NH-6 corridor! Autonomous replan proposed.',
        'event_id': str(event.id)
    })

    return {
        'scenario': 'SCN-01: Monsoon Cascade',
        'sim_hour': 36,
        'event_id': str(event.id),
        'cascade': cascade_res
    }

@router.post("/reset")
async def reset_demo(db: AsyncSession = Depends(get_db)):
    """Resets system state to 06:00 calm morning in < 5 seconds."""
    await reset_demo_state()
    sim_clock.seek(0)
    sim_clock.is_running = False

    await ws_manager.broadcast({
        'type': 'demo_reset',
        'sim_time': 0
    })

    return {'status': 'success', 'message': 'Demo state successfully reset to initial calm state (06:00 sim time).'}
