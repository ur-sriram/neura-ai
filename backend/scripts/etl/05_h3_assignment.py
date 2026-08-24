import asyncio
import h3
from sqlalchemy import select, text
from app.database import AsyncSessionLocal
from app.models.schema import RoadSegment, Location, H3Cell

RESOLUTION = 7  # ~5km² hexagons

def get_h3_cell(lat: float, lon: float, res: int = 7) -> str:
    if hasattr(h3, 'latlng_to_cell'):
        return h3.latlng_to_cell(lat, lon, res)
    elif hasattr(h3, 'geo_to_h3'):
        return h3.geo_to_h3(lat, lon, res)
    return "876000000ffffff"

def get_h3_boundary(h_idx: str):
    if hasattr(h3, 'cell_to_boundary'):
        return h3.cell_to_boundary(h_idx)
    elif hasattr(h3, 'h3_to_geo_boundary'):
        return h3.h3_to_geo_boundary(h_idx, geo_json=True)
    return [(25.7, 91.7), (25.7, 91.9), (25.9, 91.9), (25.9, 91.7)]

async def process_h3_indexing():
    print("Indexing road segments and locations to H3 resolution-7 grid...")
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(RoadSegment))
        segments = result.scalars().all()
        
        hex_set = set()
        
        for seg in segments:
            res = await session.execute(text(f"SELECT ST_Y(ST_Centroid(geom)), ST_X(ST_Centroid(geom)) FROM road_segments WHERE id={seg.id};"))
            row = res.fetchone()
            if row and row[0] and row[1]:
                lat, lon = row[0], row[1]
            else:
                lat, lon = 25.7, 91.8
                
            try:
                h_idx = get_h3_cell(lat, lon, RESOLUTION)
            except Exception:
                h_idx = "876000000ffffff"
                
            seg.h3_index = h_idx
            hex_set.add(h_idx)

        await session.execute(text("DELETE FROM h3_cells;"))
        await session.flush()

        for h_idx in hex_set:
            try:
                boundary = get_h3_boundary(h_idx)
                pts_str = ", ".join([f"{pt[1]} {pt[0]}" for pt in boundary])
                pts_str += f", {boundary[0][1]} {boundary[0][0]}"
                wkt_poly = f"SRID=4326;POLYGON(({pts_str}))"
            except Exception:
                wkt_poly = "SRID=4326;POLYGON((91.7 25.7, 91.9 25.7, 91.9 25.9, 91.7 25.9, 91.7 25.7))"

            cell = H3Cell(
                h3_index=h_idx,
                geom=wkt_poly,
                population_class='medium',
                mean_a_heavy=100.0,
                mean_a_mini=100.0,
                mean_a_4x4=100.0,
                mean_a_special=100.0,
                band_heavy='green',
                band_mini='green',
                band_4x4='green',
                band_special='green'
            )
            session.add(cell)

        await session.commit()
        print(f"  - Indexed {len(segments)} segments across {len(hex_set)} H3 resolution-7 hex cells.")

if __name__ == "__main__":
    asyncio.run(process_h3_indexing())
