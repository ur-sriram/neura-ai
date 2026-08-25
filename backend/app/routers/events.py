from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    EventIngestRequest, EventRecord, EventListResponse,
)
from app.services.events_service import (
    ingest_event, list_events, get_event, resolve_event,
)

router = APIRouter()


@router.post("/ingest", response_model=EventRecord, summary="Ingest a road/disruption event into the platform")
def ingest(req: EventIngestRequest):
    try:
        return ingest_event(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Event ingestion failed: {e}")


@router.get("", response_model=EventListResponse, summary="List active disruption events")
def get_events(
    city: Optional[str] = Query(None, description="Filter events affecting a city"),
    severity: Optional[str] = Query(None, description="low | medium | high | critical"),
    type: Optional[str] = Query(None, description="landslide | flood | road_block | earthquake | cyclone | avalanche | accident | construction"),
    active_only: bool = Query(True, description="Only active/unresolved events"),
):
    sev_val = severity if severity in ("low", "medium", "high", "critical") else None
    type_val = type if type in (
        "landslide", "flood", "road_block", "earthquake",
        "cyclone", "avalanche", "accident", "construction",
    ) else None
    try:
        return list_events(active_only=active_only, city=city, severity=sev_val, event_type=type_val)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Event query failed: {e}")


@router.get("/{event_id}", response_model=EventRecord, summary="Get single event by ID")
def get_single_event(event_id: str):
    e = get_event(event_id)
    if not e:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    return e


@router.post("/{event_id}/resolve", response_model=EventRecord, summary="Mark an event as resolved/cleared")
def resolve(event_id: str):
    e = resolve_event(event_id)
    if not e:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    return e
