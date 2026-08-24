from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.schema import RoadSegment, SegmentOverlay, H3Cell

router = APIRouter(prefix="/accessibility", tags=["Accessibility"])

@router.get("/segments/{segment_id}/score")
async def get_segment_score(segment_id: int, vclass: str = Query('heavy'), db: AsyncSession = Depends(get_db)):
    """Returns decomposed accessibility score factors for hover cards and detail drawers."""
    res_seg = await db.execute(select(RoadSegment).where(RoadSegment.id == segment_id))
    seg = res_seg.scalar_one_or_none()
    if not seg:
        raise HTTPException(status_code=404, detail="Road segment not found")

    res_v = await db.execute(select(func.max(SegmentOverlay.lns_version)))
    max_v = res_v.scalar() or 0

    res_ov = await db.execute(
        select(SegmentOverlay)
        .where(SegmentOverlay.segment_id == segment_id)
        .where(SegmentOverlay.lns_version == max_v)
    )
    ov = res_ov.scalar_one_or_none()

    score = getattr(ov, f'a_score_{vclass}', 100.0) if ov else 100.0
    factors = ov.contributing_factors.get(vclass, {}) if (ov and ov.contributing_factors) else {}

    return {
        'segment_id': segment_id,
        'lns_version': max_v,
        'vclass': vclass,
        'status': ov.status if ov else 'OPEN',
        'accessibility_score': score,
        'p_landslide_24h': ov.p_landslide_24h if ov else 0.0,
        'confidence': ov.confidence if ov else 1.0,
        'contributing_factors': factors
    }

@router.get("/h3")
async def get_h3_heatmap(vclass: str = Query('heavy'), horizon: int = Query(0), db: AsyncSession = Depends(get_db)):
    """Returns H3 hex grid choropleth FeatureCollection for S3 Accessibility Heatmap."""
    res = await db.execute(select(H3Cell))
    cells = res.scalars().all()

    features = []
    for c in cells:
        mean_score = getattr(c, f'mean_a_{vclass}', 100.0) or 100.0
        # Horizon forecast penalty adjustment
        if horizon > 0:
            mean_score = max(0.0, mean_score - (horizon / 72.0) * 35.0)

        band = 'green'
        if mean_score < 30.0: band = 'red'
        elif mean_score < 50.0: band = 'orange'
        elif mean_score < 80.0: band = 'yellow'

        features.append({
            'type': 'Feature',
            'id': c.h3_index,
            'properties': {
                'h3_index': c.h3_index,
                'population_class': c.population_class,
                'mean_score': round(mean_score, 1),
                'color_band': band
            },
            'geometry': {
                'type': 'Polygon',
                'coordinates': [[[91.7, 25.7], [91.9, 25.7], [91.9, 25.9], [91.7, 25.9], [91.7, 25.7]]]
            }
        })

    return {'type': 'FeatureCollection', 'vclass': vclass, 'horizon_h': horizon, 'features': features}
