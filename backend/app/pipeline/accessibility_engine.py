import h3
from typing import Dict, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func, update
from app.models.schema import (
    RoadSegment, SegmentOverlay, EventSegmentImpact, WeatherTimeline,
    HazardForecast, H3Cell
)

VEHICLE_CLASSES = ['heavy', 'mini', '4x4', 'special']
VEHICLE_WEIGHTS_KG = {'heavy': 10000, 'mini': 3500, '4x4': 2500, 'special': 3000}
GRADE_COMFORT = {'heavy': 5.0, 'mini': 7.0, '4x4': 12.0, 'special': 8.0}
SURFACE_FACTORS = {
    'paved':   {'heavy': 1.00, 'mini': 1.00, '4x4': 1.00, 'special': 1.00},
    'gravel':  {'heavy': 0.75, 'mini': 0.85, '4x4': 0.92, 'special': 0.88},
    'dirt':    {'heavy': 0.45, 'mini': 0.65, '4x4': 0.85, 'special': 0.75},
    'track':   {'heavy': 0.30, 'mini': 0.50, '4x4': 0.90, 'special': 0.80},
}
STATUS_FACTOR = {'OPEN': 1.0, 'SUSPECTED': 0.4, 'CLOSED': 0.0}

def compute_accessibility(segment: RoadSegment, vclass: str, rain_mm_h: float, hazard_p: float, status: str):
    if segment.maxweight and VEHICLE_WEIGHTS_KG[vclass] > segment.maxweight * 1000:
        return 0.0, {'rejection': f'maxweight {segment.maxweight}t < vehicle {VEHICLE_WEIGHTS_KG[vclass]/1000}t'}

    f_hazard = 1.0 - 0.9 * hazard_p
    f_status = STATUS_FACTOR.get(status, 1.0)
    f_surface = SURFACE_FACTORS.get(segment.surface, SURFACE_FACTORS['gravel'])[vclass]
    f_terrain = max(0.0, 1.0 - 0.08 * max(0.0, abs(segment.mean_grade or 0.0) - GRADE_COMFORT[vclass]))
    f_weather = 1.0 - 0.05 * min(rain_mm_h, 10.0)

    score = 100.0 * f_hazard * f_status * f_surface * f_terrain * f_weather
    score = max(0.0, min(100.0, score))

    factors = {
        'hazard': round(f_hazard, 3),
        'status': f_status,
        'surface': round(f_surface, 3),
        'terrain': round(f_terrain, 3),
        'weather': round(f_weather, 3),
        'final_score': round(score, 1)
    }
    return score, factors

async def update_lns(db: AsyncSession, sim_hour: int) -> int:
    """
    Recomputes segment overlays for sim_hour, increments lns_version,
    aggregates H3 hex cells, and returns the new lns_version number.
    """
    # Get highest current version
    res_v = await db.execute(select(func.max(SegmentOverlay.lns_version)))
    max_v = res_v.scalar()
    new_version = (max_v or 0) + 1

    # Get weather
    res_w = await db.execute(select(WeatherTimeline).where(WeatherTimeline.sim_hour == sim_hour).where(WeatherTimeline.zone == 'khasi_hills'))
    weather = res_w.scalar_one_or_none()
    rain_now = weather.rain_mm_h if weather else 0.0

    # Get latest active impacts per segment
    res_imp = await db.execute(
        select(EventSegmentImpact.segment_id, EventSegmentImpact.applied_status, EventSegmentImpact.confidence)
        .order_by(EventSegmentImpact.segment_id)
    )
    impact_map = {row[0]: (row[1], row[2]) for row in res_imp.all()}

    # Get all road segments
    res_seg = await db.execute(select(RoadSegment))
    segments = res_seg.scalars().all()

    # Get recent hazard forecasts for 24h
    res_haz = await db.execute(select(HazardForecast).where(HazardForecast.computed_at_sim == sim_hour).where(HazardForecast.horizon_h == 24))
    hazard_map = {h.segment_id: h.p_landslide for h in res_haz.scalars().all()}

    hex_score_accumulator = {}

    for seg in segments:
        status, status_conf = impact_map.get(seg.id, ('OPEN', 1.0))
        haz_p = hazard_map.get(seg.id, 0.0)

        scores = {}
        factors_summary = {}
        for vclass in VEHICLE_CLASSES:
            sc, fdict = compute_accessibility(seg, vclass, rain_now, haz_p, status)
            scores[vclass] = sc
            factors_summary[vclass] = fdict

        overlay = SegmentOverlay(
            segment_id=seg.id,
            lns_version=new_version,
            valid_at_sim=sim_hour,
            status=status,
            status_source='cascade_engine',
            status_confidence=status_conf,
            a_score_heavy=scores['heavy'],
            a_score_mini=scores['mini'],
            a_score_4x4=scores['4x4'],
            a_score_special=scores['special'],
            p_landslide_6h=haz_p * 0.4,
            p_landslide_12h=haz_p * 0.6,
            p_landslide_24h=haz_p,
            p_landslide_48h=haz_p * 1.1,
            p_landslide_72h=haz_p * 1.2,
            p_flood_6h=0.0, p_flood_12h=0.0, p_flood_24h=0.0, p_flood_48h=0.0, p_flood_72h=0.0,
            eff_speed_kph=45.0 if status == 'OPEN' else (20.0 if status == 'SUSPECTED' else 0.0),
            confidence=status_conf,
            contributing_factors=factors_summary
        )
        db.add(overlay)

        # Accumulate scores for H3 hex aggregation
        h_idx = seg.h3_index or '876000000ffffff'
        if h_idx not in hex_score_accumulator:
            hex_score_accumulator[h_idx] = {vc: [] for vc in VEHICLE_CLASSES}
        for vc in VEHICLE_CLASSES:
            hex_score_accumulator[h_idx][vc].append(scores[vc])

    await db.flush()

    # Update H3 cells with mean scores and color bands
    def score_to_band(sc: float) -> str:
        if sc >= 80.0: return 'green'
        if sc >= 50.0: return 'yellow'
        if sc >= 30.0: return 'orange'
        return 'red'

    for h_idx, vc_map in hex_score_accumulator.items():
        means = {vc: (sum(lst)/len(lst) if lst else 100.0) for vc, lst in vc_map.items()}
        bands = {vc: score_to_band(means[vc]) for vc in VEHICLE_CLASSES}

        await db.execute(
            update(H3Cell)
            .where(H3Cell.h3_index == h_idx)
            .values(
                mean_a_heavy=means['heavy'],
                mean_a_mini=means['mini'],
                mean_a_4x4=means['4x4'],
                mean_a_special=means['special'],
                band_heavy=bands['heavy'],
                band_mini=bands['mini'],
                band_4x4=bands['4x4'],
                band_special=bands['special']
            )
        )

    await db.flush()
    return new_version
