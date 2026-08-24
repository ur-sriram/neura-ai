import os
import sys
import numpy as np
import pandas as pd
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.schema import RoadSegment, WeatherTimeline, SegmentStaticFactor

np.random.seed(42)

async def generate_corpora():
    print("Generating synthetic-but-principled training corpus from real terrain & weather...")
    
    async with AsyncSessionLocal() as session:
        # Load segments with static factors
        res_seg = await session.execute(select(RoadSegment, SegmentStaticFactor).join(
            SegmentStaticFactor, RoadSegment.id == SegmentStaticFactor.segment_id
        ))
        rows = res_seg.all()
        
        segments_list = []
        for seg, static in rows:
            segments_list.append({
                'id': seg.id,
                'highway_class': seg.highway_class or 'secondary',
                'surface': seg.surface or 'gravel',
                'length_m': seg.length_m or 1500.0,
                'mean_grade': seg.mean_grade or 3.0,
                'suscept_landslide': seg.suscept_landslide or 0.1,
                'suscept_flood': seg.suscept_flood or 0.1,
                'elevation_m': static.elevation_m if static else 500.0
            })
        segments_df = pd.DataFrame(segments_list)
        
        # Load weather timeline
        res_wt = await session.execute(select(WeatherTimeline).where(WeatherTimeline.zone == 'khasi_hills'))
        wt_rows = res_wt.scalars().all()
        weather_list = [{'sim_hour': w.sim_hour, 'rain_mm_h': w.rain_mm_h} for w in wt_rows]
        weather_df = pd.DataFrame(weather_list).sort_values('sim_hour')

    if segments_df.empty or weather_df.empty:
        print("  ⚠️ DB empty, using synthetic baseline segments & weather for corpus generation...")
        segments_df = pd.DataFrame([{
            'id': i, 'highway_class': 'primary' if i%2==0 else 'secondary', 'surface': 'paved' if i%2==0 else 'gravel',
            'length_m': 2000.0, 'mean_grade': 2.0 + (i%10), 'suscept_landslide': 0.1 + 0.08*(i%10),
            'suscept_flood': 0.1, 'elevation_m': 300.0 + 100*(i%10)
        } for i in range(100)])
        weather_df = pd.DataFrame([{'sim_hour': h, 'rain_mm_h': min(80.0, h*1.5 if h < 48 else (96-h)*1.5)} for h in range(96)])

    # 1. Landslide Corpus Generation
    records_ls = []
    for episode in range(5):
        rng = np.random.default_rng(42 + episode)
        for _, seg in segments_df.iterrows():
            for sim_hour in range(96):
                w_row = weather_df[weather_df.sim_hour == sim_hour].iloc[0]
                rain_now = w_row['rain_mm_h']
                
                antecedent = weather_df[(weather_df.sim_hour >= max(0, sim_hour-24)) & (weather_df.sim_hour < sim_hour)]['rain_mm_h'].sum()
                S = seg['suscept_landslide'] * (min(1.0, antecedent / 80.0) + 0.5 * min(1.0, rain_now / 15.0))
                
                base_prob = (S ** 1.5) * 0.20
                closure = rng.random() < base_prob
                
                for horizon in [6, 12, 24, 48, 72]:
                    records_ls.append({
                        'segment_id': seg['id'],
                        'episode': episode,
                        'sim_hour': sim_hour,
                        'horizon_h': horizon,
                        'suscept': seg['suscept_landslide'],
                        'slope': abs(seg['mean_grade']),
                        'elevation': seg['elevation_m'],
                        'antecedent_24h': antecedent,
                        'rain_now': rain_now,
                        'S': S,
                        'closed': closure
                    })
    df_ls = pd.DataFrame(records_ls)

    # 2. ETA Residual Corpus Generation
    records_eta = []
    rng = np.random.default_rng(42)
    BASE_SPEEDS = {'motorway':80, 'trunk':60, 'primary':50, 'secondary':40, 'tertiary':30, 'unclassified':20, 'residential':15, 'track':10}
    
    for _, seg in segments_df.iterrows():
        for sim_hour in range(0, 96, 3):
            w_row = weather_df[weather_df.sim_hour == sim_hour].iloc[0]
            rain = w_row['rain_mm_h']
            base_speed = BASE_SPEEDS.get(seg['highway_class'], 25)
            
            grade_factor = max(0.3, 1.0 - 0.04 * max(0, abs(seg['mean_grade']) - 3))
            rain_factor = max(0.5, 1.0 - 0.03 * min(rain, 10))
            delay_noise = rng.lognormal(mean=0, sigma=0.15)
            
            eff_speed = max(5.0, base_speed * grade_factor * rain_factor)
            t0_hours = (seg['length_m'] / 1000.0) / eff_speed
            actual_hours = t0_hours * delay_noise
            
            records_eta.append({
                'segment_id': seg['id'],
                'length_m': seg['length_m'],
                'mean_grade': abs(seg['mean_grade']),
                'rain_mm_h': rain,
                'sim_hour_of_day': sim_hour % 24,
                't0_hours': t0_hours,
                'actual_hours': actual_hours,
                'residual_multiplier': actual_hours / max(t0_hours, 0.001)
            })
    df_eta = pd.DataFrame(records_eta)

    os.makedirs("data/corpus", exist_ok=True)
    df_ls.to_csv("data/corpus/landslide_corpus.csv", index=False)
    df_eta.to_csv("data/corpus/eta_corpus.csv", index=False)
    print(f"  ✓ Saved data/corpus/landslide_corpus.csv ({len(df_ls)} rows)")
    print(f"  ✓ Saved data/corpus/eta_corpus.csv ({len(df_eta)} rows)")

if __name__ == "__main__":
    asyncio.run(generate_corpora())
