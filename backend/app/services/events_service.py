import uuid
from typing import List, Dict, Optional, Set
from datetime import datetime, timedelta

from app.data.ner_data import CITIES, ROAD_NETWORK
from app.models.schemas import EventIngestRequest, EventRecord, EventListResponse


EVENT_STORE: Dict[str, Dict] = {}
EVENT_INDEX_BY_CITY: Dict[str, Set[str]] = {}
EVENT_INDEX_BY_SEGMENT: Dict[str, Set[str]] = {}


def _event_to_record(e: Dict) -> EventRecord:
    return EventRecord(
        event_id=e["event_id"],
        type=e["type"],
        road_segment_id=e.get("road_segment_id"),
        from_city=e.get("from_city"),
        to_city=e.get("to_city"),
        severity=e["severity"],
        confidence=e["confidence"],
        source=e["source"],
        headline=e.get("headline"),
        description=e.get("description"),
        blocked=e["blocked"],
        duration_hours=e.get("duration_hours"),
        reported_by=e.get("reported_by"),
        affected_cities=e.get("affected_cities", []),
        created_at=e["created_at"],
        expires_at=e.get("expires_at"),
        active=e["active"],
    )


def _reindex() -> None:
    EVENT_INDEX_BY_CITY.clear()
    EVENT_INDEX_BY_SEGMENT.clear()
    for eid, e in EVENT_STORE.items():
        for c in e.get("affected_cities", []) or []:
            EVENT_INDEX_BY_CITY.setdefault(c, set()).add(eid)
        if e.get("from_city") and e.get("to_city"):
            key = f"{e['from_city']}|{e['to_city']}"
            rev = f"{e['to_city']}|{e['from_city']}"
            EVENT_INDEX_BY_SEGMENT.setdefault(key, set()).add(eid)
            EVENT_INDEX_BY_SEGMENT.setdefault(rev, set()).add(eid)


def _auto_headline(req: EventIngestRequest) -> str:
    parts = [req.type.upper()]
    if req.from_city and req.to_city:
        parts.append(f"{req.from_city} → {req.to_city}")
    elif req.affected_cities:
        parts.append(", ".join(req.affected_cities[:3]))
    parts.append(f"[{req.severity.upper()}]")
    return " ".join(parts)


def ingest_event(req: EventIngestRequest) -> EventRecord:
    now = datetime.utcnow()
    eid = f"EVT-{uuid.uuid4().hex[:8].upper()}"
    affected = list(req.affected_cities) if req.affected_cities else []
    if req.from_city and req.from_city not in affected:
        affected.append(req.from_city)
    if req.to_city and req.to_city not in affected:
        affected.append(req.to_city)
    expires = None
    if req.duration_hours:
        expires = now + timedelta(hours=req.duration_hours)
    record = {
        "event_id": eid,
        "type": req.type,
        "road_segment_id": req.road_segment_id,
        "from_city": req.from_city,
        "to_city": req.to_city,
        "severity": req.severity,
        "confidence": req.confidence,
        "source": req.source,
        "headline": req.headline or _auto_headline(req),
        "description": req.description,
        "blocked": req.blocked,
        "duration_hours": req.duration_hours,
        "reported_by": req.reported_by,
        "affected_cities": affected,
        "created_at": now,
        "expires_at": expires,
        "active": True,
    }
    EVENT_STORE[eid] = record
    _reindex()
    return _event_to_record(record)


def list_events(
    active_only: bool = True,
    city: Optional[str] = None,
    severity: Optional[str] = None,
    event_type: Optional[str] = None,
) -> EventListResponse:
    items: List[EventRecord] = []
    active_count = 0
    candidate_ids = set(EVENT_STORE.keys())
    if city:
        candidate_ids = EVENT_INDEX_BY_CITY.get(city, set()).copy()
    for eid in candidate_ids:
        e = EVENT_STORE.get(eid)
        if not e:
            continue
        if active_only and not e["active"]:
            continue
        if severity and e["severity"] != severity:
            continue
        if event_type and e["type"] != event_type:
            continue
        if e["active"]:
            active_count += 1
        items.append(_event_to_record(e))
    items.sort(key=lambda r: {
        "critical": 0, "high": 1, "medium": 2, "low": 3,
    }.get(r.severity, 9))
    return EventListResponse(total=len(items), active=active_count, items=items)


def get_event(event_id: str) -> Optional[EventRecord]:
    e = EVENT_STORE.get(event_id)
    if not e:
        return None
    return _event_to_record(e)


def resolve_event(event_id: str) -> Optional[EventRecord]:
    e = EVENT_STORE.get(event_id)
    if not e:
        return None
    e["active"] = False
    return _event_to_record(e)


def get_blocked_city_set() -> Set[str]:
    blocked: Set[str] = set()
    for e in EVENT_STORE.values():
        if not e["active"] or not e["blocked"]:
            continue
        sev_weight = {"critical": 1.0, "high": 0.9, "medium": 0.6, "low": 0.3}.get(e["severity"], 0.5)
        if sev_weight >= 0.6:
            for c in e.get("affected_cities", []):
                blocked.add(c)
    return blocked


def get_segment_block_penalty(from_city: str, to_city: str) -> float:
    key = f"{from_city}|{to_city}"
    ids = EVENT_INDEX_BY_SEGMENT.get(key, set())
    penalty = 1.0
    for eid in ids:
        e = EVENT_STORE.get(eid)
        if not e or not e["active"]:
            continue
        if not e["blocked"]:
            continue
        sev_mult = {
            "critical": 100.0, "high": 15.0, "medium": 5.0, "low": 1.8,
        }.get(e["severity"], 2.0)
        penalty *= sev_mult
    return penalty
