from uuid import UUID, uuid4
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.schema import Event, EventSegmentImpact, RoadSegment, RoadStatusHistory

SOURCE_TRUST = {
    'control_room': 0.95,
    'government_api': 0.90,
    'driver': 0.75,
    'citizen': 0.30,
    'weather_system': 0.85,
    'system': 1.00,
}

CORROBORATION_THRESHOLD_FOR_CLOSE = 2

async def ingest_event(
    db: AsyncSession,
    event_type: str,
    payload: Dict[str, Any],
    source_type: str = 'system',
    sim_hour: int = 0,
    dedup_key: Optional[str] = None
) -> Event:
    """
    1. Check dedup_key - if exists, increment corroboration_count
    2. Assign source_trust from map
    3. Determine affected segment IDs
    4. Apply three-state transitions (OPEN -> SUSPECTED -> CLOSED)
    5. Save Event + EventSegmentImpacts + RoadStatusHistory
    """
    trust = SOURCE_TRUST.get(source_type, 0.50)

    # Check dedup_key
    if dedup_key:
        res = await db.execute(select(Event).where(Event.dedup_key == dedup_key))
        existing_event = res.scalar_one_or_none()
        if existing_event:
            existing_event.corroboration_count += 1
            if existing_event.corroboration_count >= CORROBORATION_THRESHOLD_FOR_CLOSE:
                # Upgrade impacted segments to CLOSED
                await db.execute(
                    update(EventSegmentImpact)
                    .where(EventSegmentImpact.event_id == existing_event.id)
                    .values(applied_status='CLOSED')
                )
            await db.flush()
            return existing_event

    event_id = uuid4()
    event = Event(
        id=event_id,
        type=event_type,
        payload=payload,
        source_type=source_type,
        source_trust=trust,
        received_sim=sim_hour,
        dedup_key=dedup_key,
        corroboration_count=1,
        resolved=False
    )
    db.add(event)
    await db.flush()

    segment_ids = payload.get('segment_ids', [])
    if 'segment_id' in payload:
        segment_ids.append(payload['segment_id'])
        
    applied_status = 'CLOSED' if (trust >= 0.85 or event_type in ['landslide', 'flood']) else 'SUSPECTED'

    for seg_id in set(segment_ids):
        impact = EventSegmentImpact(
            event_id=event_id,
            segment_id=seg_id,
            applied_status=applied_status,
            confidence=trust
        )
        db.add(impact)

        history = RoadStatusHistory(
            segment_id=seg_id,
            from_status='OPEN',
            to_status=applied_status,
            event_id=event_id,
            reason=f"Ingested {event_type} from {source_type} (trust={trust})",
            at_sim=sim_hour
        )
        db.add(history)

    await db.flush()
    return event
