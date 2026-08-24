import asyncio
import json
from sqlalchemy import select, text
from app.database import AsyncSessionLocal
from app.models.schema import RoadSegment, SegmentOverlay

VEHICLE_WEIGHTS_KG = {'heavy': 10000, 'mini': 3500, '4x4': 2500, 'special': 3000}
GRADE_COMFORT = {'heavy': 5.0, 'mini': 7.0, '4x4': 12.0, 'special': 8.0}
SURFACE_FACTORS = {
    'paved':   {'heavy': 1.00, 'mini': 1.00, '4x4': 1.00, 'special': 1.00},
    'gravel':  {'heavy': 0.75, 'mini': 0.85, '4x4': 0.92, 'special': 0.88},
    'dirt':    {'heavy': 0.45, 'mini': 0.65, '4x4': 0.85, 'special': 0.75},
    'track':   {'heavy': 0.30, 'mini': 0.50, '4x4': 0.90, 'special': 0.80},
}

def compute_accessibility(segment: RoadSegment, vclass: str, rain_mm_h: float = 0.0, hazard_p: float = 0.0, status: str = 'OPEN'):
    if segment.maxweight and VEHICLE_WEIGHTS_KG[vclass] > segment.maxweight * 1000:
        return 0.0, {'rejection': f'maxweight {segment.maxweight}t < vehicle {VEHICLE_WEIGHTS_KG[vclass]/1000}t'}

    f_hazard = 1.0 - 0.9 * hazard_p
    f_status = 1.0 if status == 'OPEN' else (0.4 if status == 'SUSPECTED' else 0.0)
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

async def seed_initial_lns():
    print("Initializing Living Network State (LNS) Version 0...")
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(RoadSegment))
        segments = result.scalars().all()

        await session.execute(text("DELETE FROM segment_overlays WHERE lns_version = 0;"))
        await session.flush()

        inserted_count = 0
        for seg in segments:
            scores = {}
            factors_summary = {}
            for vclass in ['heavy', 'mini', '4x4', 'special']:
                sc, fdict = compute_accessibility(seg, vclass, rain_mm_h=0.0, hazard_p=0.0, status='OPEN')
                scores[vclass] = sc
                factors_summary[vclass] = fdict

            overlay = SegmentOverlay(
                segment_id=seg.id,
                lns_version=0,
                valid_at_sim=0,
                status='OPEN',
                status_source='system_init',
                status_confidence=1.0,
                a_score_heavy=scores['heavy'],
                a_score_mini=scores['mini'],
                a_score_4x4=scores['4x4'],
                a_score_special=scores['special'],
                p_landslide_6h=0.0, p_landslide_12h=0.0, p_landslide_24h=0.0,
                p_landslide_48h=0.0, p_landslide_72h=0.0,
                p_flood_6h=0.0, p_flood_12h=0.0, p_flood_24h=0.0,
                p_flood_48h=0.0, p_flood_72h=0.0,
                eff_speed_kph=45.0 if seg.highway_class in ['primary','trunk'] else 25.0,
                confidence=1.0,
                contributing_factors=factors_summary
            )
            session.add(overlay)
            inserted_count += 1

        await session.commit()
        print(f"  - Initialized {inserted_count} segment overlays at LNS version 0.")

if __name__ == "__main__":
    asyncio.run(seed_initial_lns())
