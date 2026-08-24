from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from app.database import get_db
from app.models.schema import RoadSegment, SegmentOverlay, Location, Vehicle

router = APIRouter(prefix="/map", tags=["Map"])

@router.get("/segments")
async def get_map_segments(vclass: str = Query('heavy'), db: AsyncSession = Depends(get_db)):
    """Returns road segment GeoJSON feature list with latest LNS overlay attributes."""
    # Get latest version
    res_v = await db.execute(select(func.max(SegmentOverlay.lns_version)))
    max_v = res_v.scalar() or 0

    res_seg = await db.execute(select(RoadSegment))
    segments = res_seg.scalars().all()

    res_ov = await db.execute(select(SegmentOverlay).where(SegmentOverlay.lns_version == max_v))
    overlay_map = {ov.segment_id: ov for ov in res_ov.scalars().all()}

    features = []
    for seg in segments:
        ov = overlay_map.get(seg.id)
        
        # Determine score for requested vclass
        score = 100.0
        if ov:
            score = getattr(ov, f'a_score_{vclass}', 100.0) or 100.0

        # Extract real geometry from PostGIS, fall back to synthetic corridor
        try:
            geom_shape = to_shape(seg.geom)
            geometry = mapping(geom_shape)
        except Exception:
            # Synthetic fallback: spread segments along Guwahati-Shillong corridor
            idx = segments.index(seg) if seg in segments else 0
            base_lat = 26.14 - idx * 0.08
            base_lon = 91.73 + idx * 0.04
            geometry = {
                'type': 'LineString',
                'coordinates': [[base_lon, base_lat], [base_lon + 0.06, base_lat - 0.07]]
            }

        features.append({
            'type': 'Feature',
            'id': seg.id,
            'properties': {
                'id': seg.id,
                'highway_class': seg.highway_class,
                'surface': seg.surface,
                'length_m': seg.length_m,
                'mean_grade': seg.mean_grade,
                'maxweight': seg.maxweight,
                'status': ov.status if ov else 'OPEN',
                'accessibility_score': round(score, 1),
                'p_landslide_24h': ov.p_landslide_24h if ov else 0.0,
                'confidence': ov.confidence if ov else 1.0,
                'contributing_factors': ov.contributing_factors.get(vclass) if (ov and ov.contributing_factors) else {}
            },
            'geometry': geometry
        })

    return {'type': 'FeatureCollection', 'lns_version': max_v, 'features': features}

@router.get("/locations")
async def get_locations(db: AsyncSession = Depends(get_db)):
    """Returns all depots, health facilities, and villages."""
    res = await db.execute(select(Location))
    locs = res.scalars().all()
    
    out = []
    for l in locs:
        try:
            pt = to_shape(l.geom)
            coords = [pt.x, pt.y]  # [lon, lat]
        except Exception:
            coords = [91.88, 25.57]
        out.append({
            'id': str(l.id),
            'name': l.name,
            'kind': l.kind,
            'population_class': l.population_class,
            'cold_chain': l.cold_chain,
            'accessible_entry': l.accessible_entry,
            'coordinates': coords
        })
    return out

@router.get("/vehicles")
async def get_vehicles(db: AsyncSession = Depends(get_db)):
    """Returns vehicle fleet specs and active status."""
    res = await db.execute(select(Vehicle))
    vehicles = res.scalars().all()
    out = []
    for v in vehicles:
        out.append({
            'id': str(v.id),
            'label': v.label,
            'vclass': v.vclass,
            'capacity_kg': v.capacity_kg,
            'weight_kg': v.weight_kg,
            'cold_chain': v.cold_chain,
            'accessible': v.accessible,
            'home_depot': str(v.home_depot) if v.home_depot else None
        })
    return out
