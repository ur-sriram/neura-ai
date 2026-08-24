from typing import Dict, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.schema import RoadSegment, SegmentStaticFactor, WeatherTimeline, HazardForecast
from app.ml import hazard_model

HORIZONS = [6, 12, 24, 48, 72]

async def compute_hazard_forecasts(db: AsyncSession, sim_hour: int) -> List[Dict[str, Any]]:
    """
    Computes P(landslide) and P(flood) for all road segments across horizons.
    Inserts rows into hazard_forecasts table.
    """
    # Fetch weather at sim_hour
    res_w = await db.execute(
        select(WeatherTimeline)
        .where(WeatherTimeline.sim_hour == sim_hour)
        .where(WeatherTimeline.zone == 'khasi_hills')
    )
    weather = res_w.scalar_one_or_none()
    rain_now = weather.rain_mm_h if weather else 0.0

    # Fetch antecedent rainfall (past 24h sum)
    res_ant = await db.execute(
        select(WeatherTimeline.rain_mm_h)
        .where(WeatherTimeline.sim_hour >= max(0, sim_hour - 24))
        .where(WeatherTimeline.sim_hour < sim_hour)
        .where(WeatherTimeline.zone == 'khasi_hills')
    )
    antecedent_24h = sum(res_ant.scalars().all())

    # Fetch segments with static factors
    res_seg = await db.execute(
        select(RoadSegment, SegmentStaticFactor)
        .outerjoin(SegmentStaticFactor, RoadSegment.id == SegmentStaticFactor.segment_id)
    )
    rows = res_seg.all()

    forecasts_summary = []
    
    for seg, static in rows:
        slope = abs(seg.mean_grade or 0.0)
        elev = static.elevation_m if static else 500.0
        suscept_ls = seg.suscept_landslide or 0.1
        suscept_fl = seg.suscept_flood or 0.1

        # Physical rainfall saturation factor
        rain_factor = min(1.0, antecedent_24h / 80.0) + 0.5 * min(1.0, rain_now / 15.0)
        S_landslide = suscept_ls * rain_factor
        S_flood = suscept_fl * min(1.0, antecedent_24h / 60.0)

        seg_forecast = {'segment_id': seg.id, 'p_landslide': {}, 'p_flood': {}}

        for h in HORIZONS:
            p_ls = hazard_model.predict(
                S=S_landslide,
                horizon_h=h,
                slope=slope,
                elevation=elev,
                antecedent_24h=antecedent_24h,
                rain_now=rain_now
            )
            p_fl = min(1.0, S_flood * (h / 72.0))

            hf = HazardForecast(
                segment_id=seg.id,
                horizon_h=h,
                p_landslide=round(p_ls, 3),
                p_flood=round(p_fl, 3),
                computed_at_sim=sim_hour,
                model_version='v1'
            )
            db.add(hf)
            
            seg_forecast['p_landslide'][h] = round(p_ls, 3)
            seg_forecast['p_flood'][h] = round(p_fl, 3)

        forecasts_summary.append(seg_forecast)

    await db.flush()
    return forecasts_summary
