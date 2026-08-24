from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.pipeline import cascade
from app.services.sim_clock import sim_clock

router = APIRouter(prefix="/optimization", tags=["Optimization"])

@router.post("/run")
async def run_manual_optimization(db: AsyncSession = Depends(get_db)):
    """Triggers manual re-run of 9-stage optimization cascade loop."""
    result = await cascade.run_cascade(db, sim_hour=sim_clock.sim_hour)
    return result
