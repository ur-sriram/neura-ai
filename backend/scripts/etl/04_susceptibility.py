import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.schema import RoadSegment, SegmentStaticFactor

async def process_susceptibility_priors():
    print("Computing landslide and flood susceptibility static priors...")
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(RoadSegment, SegmentStaticFactor).join(
            SegmentStaticFactor, RoadSegment.id == SegmentStaticFactor.segment_id
        ))
        rows = result.all()
        
        updated_count = 0
        for seg, static in rows:
            slope = abs(seg.mean_grade)
            elev = static.elevation_m if static else 500.0
            
            # Landslide physical susceptibility prior
            slope_factor = min(1.0, slope / 15.0)
            elev_factor = min(1.0, max(0.0, (elev - 200.0) / 1300.0))
            hist_factor = 0.8 if (elev > 800 and slope > 6.0) else 0.2
            
            suscept_ls = 0.5 * slope_factor + 0.3 * elev_factor + 0.2 * hist_factor
            suscept_ls = min(1.0, max(0.0, suscept_ls))
            
            # Flood physical susceptibility prior
            elev_flood_factor = max(0.0, 1.0 - (elev / 200.0))
            zone_flood_factor = 0.8 if static.near_river else 0.1
            
            suscept_fl = 0.6 * elev_flood_factor + 0.4 * zone_flood_factor
            suscept_fl = min(1.0, max(0.0, suscept_fl))
            
            seg.suscept_landslide = round(suscept_ls, 3)
            seg.suscept_flood = round(suscept_fl, 3)
            updated_count += 1
            
        await session.commit()
        print(f"  - Updated susceptibility priors for {updated_count} segments.")

if __name__ == "__main__":
    asyncio.run(process_susceptibility_priors())
