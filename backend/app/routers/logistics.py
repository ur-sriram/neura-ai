from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    RouteOptimizeRequest, RouteOptimizeResponse,
    ShipmentCreate, Shipment, ShipmentListResponse, TrackResponse,
    CargoMatchRequest, VehicleRecommendation,
    DeliveryPrioritizeRequest, DeliveryPriority,
    WhatIfScenarioRequest, WhatIfScenarioResponse,
    DecisionLogEntry, FleetOptimizeRequest, FleetOptimizeResponse,
)
from app.services.logistics_service import (
    optimize_route, create_shipment, list_shipments, get_shipment, track_shipment, advance_shipment,
    match_cargo_to_vehicle, prioritize_delivery, what_if_simulation, list_decisions, fleet_optimize_vrp,
)

router = APIRouter()


@router.post("/optimize", response_model=RouteOptimizeResponse, summary="Optimize route between 2 NER cities")
def optimize(req: RouteOptimizeRequest):
    try:
        return optimize_route(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route optimization failed: {e}")


@router.post("/shipments", response_model=Shipment, summary="Create a new shipment")
def create_new_shipment(data: ShipmentCreate):
    try:
        record = create_shipment(data.model_dump())
        return Shipment(**record)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Shipment creation failed: {e}")


@router.get("/shipments", response_model=ShipmentListResponse, summary="List shipments with filters")
def get_shipments(
    status: Optional[str] = Query(None, description="created | picked_up | in_transit | delivered | delayed | cancelled"),
    city: Optional[str] = Query(None, description="Filter by current_location city"),
):
    try:
        items = list_shipments(status=status, city=city)
        parsed = [Shipment(**s) for s in items]
        return ShipmentListResponse(total=len(parsed), items=parsed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Shipment listing failed: {e}")


@router.get("/shipments/{shipment_id}", response_model=Shipment, summary="Get shipment by ID")
def get_shipment_by_id(shipment_id: str):
    s = get_shipment(shipment_id)
    if not s:
        raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
    try:
        return Shipment(**s)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/shipments/{shipment_id}/advance", response_model=Shipment, summary="Advance shipment status (demo)")
def advance(shipment_id: str):
    s = advance_shipment(shipment_id)
    if not s:
        raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
    return Shipment(**s)


@router.get("/track/{shipment_id}", response_model=TrackResponse, summary="Track shipment with ETA & alerts")
def track(shipment_id: str):
    t = track_shipment(shipment_id)
    if not t:
        raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
    try:
        return TrackResponse(**t)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vehicle-match", response_model=VehicleRecommendation, summary="AI cargo-to-vehicle matching based on terrain & priority")
def vehicle_match(req: CargoMatchRequest):
    try:
        return match_cargo_to_vehicle(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vehicle matching failed: {e}")


@router.post("/prioritize", response_model=DeliveryPriority, summary="Emergency delivery priority scoring (0-100)")
def prioritize(req: DeliveryPrioritizeRequest):
    try:
        return prioritize_delivery(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prioritization failed: {e}")


@router.post("/what-if", response_model=WhatIfScenarioResponse, summary="What-if simulation: road block / landslide / flood scenario")
def what_if(req: WhatIfScenarioRequest):
    try:
        return what_if_simulation(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")


@router.get("/decisions", response_model=List[DecisionLogEntry], summary="Recent AI decision log with explainability data")
def decisions(limit: int = Query(50, ge=1, le=500)):
    try:
        return list_decisions(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decision log failed: {e}")


@router.post("/fleet-optimize", response_model=FleetOptimizeResponse, summary="Multi-stop vehicle routing problem (PyVRP / PyVRP engine)")
def fleet_optimize(req: FleetOptimizeRequest):
    try:
        res = fleet_optimize_vrp(
            depot=(req.depot_lat, req.depot_lon),
            deliveries=[d.model_dump() for d in req.deliveries],
            vehicles=[v.model_dump() for v in req.vehicles],
        )
        return FleetOptimizeResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fleet optimization failed: {e}")
