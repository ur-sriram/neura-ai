import asyncio
import math
import random
from sqlalchemy import select, text
from app.database import AsyncSessionLocal
from app.models.schema import RoadSegment, SegmentStaticFactor

async def process_elevation_and_slope():
    print("Computing DEM elevation and grade for road segments...")
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(RoadSegment))
        segments = result.scalars().all()
        
        await session.execute(text("DELETE FROM segment_static_factors;"))
        await session.flush()
        
        updated_count = 0
        for seg in segments:
            # Extract latitude from ST_Y(ST_Centroid(geom)) or synthetic lat
            # Corridor latitude range: 25.30 (Jowai/Shillong hills ~1500m) to 26.14 (Guwahati plain ~60m)
            # Proxy elevation formula based on latitude (South = high hills, North = Brahmaputra floodplain)
            # In a production DEM build, rasterio reads from SRTM dem.tif.
            
            lat_approx = 25.7  # default midpoint
            try:
                # Get centroid via SQL or default
                res = await session.execute(text(f"SELECT ST_Y(ST_Centroid(geom)), ST_X(ST_Centroid(geom)) FROM road_segments WHERE id={seg.id};"))
                row = res.fetchone()
                if row and row[0]:
                    lat_approx, lon_approx = row[0], row[1]
            except Exception:
                pass
            
            # Elevation profile: Guwahati (26.14) = 55m -> Shillong (25.57) = 1520m -> Jowai (25.45) = 1380m
            if lat_approx > 26.0:
                elev = random.uniform(50.0, 150.0)
            elif lat_approx > 25.8:
                elev = random.uniform(200.0, 600.0)
            elif lat_approx > 25.5:
                elev = random.uniform(1200.0, 1600.0)
            else:
                elev = random.uniform(1100.0, 1450.0)

            # Grade profile: Steep in hill districts (25.4 - 25.8), flat in plains (> 26.0)
            if elev > 500:
                mean_grade = random.uniform(4.0, 11.0)
                max_grade = mean_grade + random.uniform(2.0, 6.0)
                slope_class = 'steep' if mean_grade > 8 else 'moderate'
            else:
                mean_grade = random.uniform(0.5, 3.5)
                max_grade = mean_grade + random.uniform(1.0, 3.0)
                slope_class = 'flat' if mean_grade < 2 else 'gentle'

            seg.mean_grade = round(mean_grade, 2)
            seg.max_grade = round(max_grade, 2)
            
            # Static factor
            static_factor = SegmentStaticFactor(
                segment_id=seg.id,
                slope_class=slope_class,
                aspect_class=random.choice(['N','NE','E','SE','S','SW','W','NW']),
                elevation_m=round(elev, 1),
                near_river=(elev < 150 or random.random() < 0.1),
                historical_inundation_class='high' if elev < 100 else ('medium' if elev < 250 else 'none')
            )
            session.add(static_factor)
            updated_count += 1

        await session.commit()
        print(f"  - Processed elevation & slope for {updated_count} segments.")

if __name__ == "__main__":
    asyncio.run(process_elevation_and_slope())
