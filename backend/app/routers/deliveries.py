import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models.schema import Delivery, Location, Vehicle, Assignment, Stop, Plan

router = APIRouter(prefix="/deliveries", tags=["Deliveries"])

@router.get("")
async def list_deliveries(
    status: str = Query(None, description="Filter by status: NEW,PLANNED,IN_TRANSIT,DELIVERED,DEFERRED,FAILED"),
    db: AsyncSession = Depends(get_db)
):
    """List all deliveries with location name and vehicle assignment."""
    q = select(Delivery)
    if status:
        q = q.where(Delivery.status == status)
    q = q.order_by(Delivery.priority_score.desc(), Delivery.created_sim)
    res = await db.execute(q)
    deliveries = res.scalars().all()

    # Fetch locations map for names
    res_locs = await db.execute(select(Location))
    loc_map = {str(l.id): l.name for l in res_locs.scalars().all()}

    # Fetch active stops → vehicle mapping
    res_stops = await db.execute(
        select(Stop, Assignment, Vehicle)
        .join(Assignment, Stop.assignment_id == Assignment.id)
        .join(Vehicle, Assignment.vehicle_id == Vehicle.id)
    )
    delivery_vehicle: dict = {}
    for stop, asgn, veh in res_stops:
        delivery_vehicle[str(stop.delivery_id)] = {
            'vehicle_label': veh.label,
            'vehicle_class': veh.vclass,
            'eta_p50': asgn.eta_p50,
            'eta_p90': asgn.eta_p90,
        }

    out = []
    for d in deliveries:
        vehicle_info = delivery_vehicle.get(str(d.id), {})
        out.append({
            'id': str(d.id),
            'cargo_code': d.cargo_code,
            'weight_kg': d.weight_kg,
            'volume_m3': d.volume_m3,
            'dest_name': loc_map.get(str(d.dest_id), 'Unknown'),
            'dest_id': str(d.dest_id),
            'requested_by': d.requested_by,
            'deadline_sim': d.deadline_sim,
            'priority_score': d.priority_score,
            'status': d.status,
            'is_emergency': d.is_emergency,
            'created_sim': d.created_sim,
            'vehicle_label': vehicle_info.get('vehicle_label'),
            'vehicle_class': vehicle_info.get('vehicle_class'),
            'eta_p50': vehicle_info.get('eta_p50'),
            'eta_p90': vehicle_info.get('eta_p90'),
        })
    return out


@router.patch("/{delivery_id}/status")
async def update_delivery_status(
    delivery_id: str,
    new_status: str = Query(..., description="New status"),
    db: AsyncSession = Depends(get_db)
):
    """Update delivery status (e.g. mark as IN_TRANSIT, DELIVERED)."""
    valid = {'NEW', 'PLANNED', 'IN_TRANSIT', 'DELIVERED', 'DEFERRED', 'FAILED'}
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")

    try:
        did = uuid.UUID(delivery_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid delivery_id UUID")

    res = await db.execute(select(Delivery).where(Delivery.id == did))
    d = res.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Delivery not found")

    old_status = d.status
    d.status = new_status
    await db.commit()
    return {'id': delivery_id, 'old_status': old_status, 'new_status': new_status}
