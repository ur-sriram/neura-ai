import os
import pickle
import math
import random
import networkx as nx
from sqlalchemy import text
from app.database import AsyncSessionLocal, engine
from app.models.schema import RoadSegment

BBOX = (25.30, 91.30, 26.30, 92.60)  # (south, west, north, east)

async def extract_osm_graph():
    print("Extracting OSM Road Network for Guwahati-Shillong-Jowai corridor...")
    
    # Try fetching OSM graph via osmnx or generate structured graph fallback
    G = nx.MultiDiGraph()
    segments_to_insert = []
    
    try:
        import osmnx as ox
        print("  Downloading road graph via OSMnx...")
        G_raw = ox.graph_from_bbox(
            bbox=BBOX,
            network_type='drive',
            custom_filter='["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|track"]',
            retain_all=False,
            simplify=True
        )
        print(f"  - Downloaded raw OSM graph: {len(G_raw.nodes)} nodes, {len(G_raw.edges)} edges.")
        G = G_raw
    except Exception as e:
        print(f"  - OSMnx download fallback ({e}). Building high-fidelity synthetic corridor graph for Guwahati-Shillong-Jowai...")
        G = build_synthetic_corridor_graph()

    # Process edges and prepare database rows
    print("  Processing graph edges into road segments...")
    segment_id_counter = 100000
    
    async with AsyncSessionLocal() as session:
        # Clear dependent runtime tables before clearing road_segments
        await session.execute(text("DELETE FROM event_segment_impacts;"))
        await session.execute(text("DELETE FROM road_status_history;"))
        await session.execute(text("DELETE FROM hazard_forecasts;"))
        await session.execute(text("DELETE FROM segment_overlays;"))
        await session.execute(text("DELETE FROM segment_static_factors;"))
        await session.execute(text("DELETE FROM road_segments;"))
        await session.commit()

        for u, v, key, data in G.edges(keys=True, data=True):
            osm_id = data.get('osmid', segment_id_counter)
            if isinstance(osm_id, list):
                osm_id = osm_id[0]
            
            seg_id = segment_id_counter
            segment_id_counter += 1
            
            highway = data.get('highway', 'secondary')
            if isinstance(highway, list):
                highway = highway[0]
                
            length_m = float(data.get('length', 1500.0))
            surface = classify_surface(data, highway)
            bridge = bool(data.get('bridge', False))
            maxweight = get_maxweight(data, highway, bridge)
            
            # Extract coordinates for linestring
            u_node = G.nodes[u]
            v_node = G.nodes[v]
            u_lat, u_lon = u_node.get('y', 25.8), u_node.get('x', 91.8)
            v_lat, v_lon = v_node.get('y', 25.8), v_node.get('x', 91.8)
            
            linestring_wkt = f"SRID=4326;LINESTRING({u_lon} {u_lat}, {v_lon} {v_lat})"
            
            # Store in graph data
            data['segment_id'] = seg_id
            data['weight'] = length_m
            data['length_m'] = length_m
            data['highway'] = highway
            data['surface'] = surface
            data['maxweight'] = maxweight
            
            # Add to database list
            seg = RoadSegment(
                id=seg_id,
                osm_id=int(osm_id) if str(osm_id).isdigit() else seg_id,
                geom=linestring_wkt,
                highway_class=highway,
                surface=surface,
                oneway=bool(data.get('oneway', False)),
                bridge=bridge,
                maxweight=maxweight,
                maxwidth=3.5 if highway in ['primary','trunk'] else 2.5,
                lanes=2 if highway in ['primary','trunk'] else 1,
                access='yes',
                length_m=length_m,
                mean_grade=float(data.get('grade', random.uniform(1.0, 9.0))),
                max_grade=float(data.get('max_grade', random.uniform(3.0, 14.0))),
                h3_index='876000000ffffff',  # updated in Step 5
                suscept_landslide=0.0,
                suscept_flood=0.0,
                provenance='real' if 'osmid' in data else 'seeded'
            )
            session.add(seg)

        await session.commit()
        print(f"  - Inserted {segment_id_counter - 100000} road segments into database.")

    # Save NetworkX graph pickle
    os.makedirs("data", exist_ok=True)
    with open("data/graph.pkl", "wb") as f:
        pickle.dump(G, f)
    print("  - Saved data/graph.pkl artifact.")

def classify_surface(data, highway):
    s = data.get('surface', '')
    if s in ['asphalt', 'concrete', 'paved']: return 'paved'
    if s in ['gravel', 'compacted']: return 'gravel'
    if s in ['dirt', 'earth', 'mud']: return 'dirt'
    if s in ['grass', 'track']: return 'track'
    if highway in ['motorway', 'trunk', 'primary', 'secondary']: return 'paved'
    if highway in ['tertiary', 'unclassified']: return 'gravel'
    return 'track'

def get_maxweight(data, highway, bridge):
    mw = data.get('maxweight')
    if mw:
        try: return float(str(mw).replace('t','').strip())
        except: pass
    if bridge or random.random() < 0.15:
        if highway in ['primary','trunk']: return 20.0
        if highway in ['secondary']: return 10.0
        return 5.0
    return None

def build_synthetic_corridor_graph():
    """Generates structured grid network connecting Guwahati, Shillong, Jowai and key towns."""
    G = nx.MultiDiGraph()
    random.seed(42)
    
    # Define key corridor nodes
    nodes = {
        1: (26.14, 91.73, "Guwahati Central"),
        2: (26.11, 91.86, "Jorabat Junction"),
        3: (26.04, 91.87, "Burnihat"),
        4: (25.90, 91.88, "Nongpoh"),
        5: (25.74, 91.89, "Umsning"),
        6: (25.66, 91.90, "Barapani/Umiam"),
        7: (25.57, 91.88, "Shillong Center"),
        8: (25.54, 91.95, "Smit"),
        9: (25.56, 92.05, "Mawryngkneng"),
        10: (25.49, 92.15, "Wahiajer"),
        11: (25.45, 92.20, "Jowai Center"),
        12: (25.48, 92.31, "Shangpung"),
        13: (25.57, 92.22, "Nartiang"),
        14: (25.50, 92.17, "Thadlaskein"),
    }

    # Add minor grid nodes to reach 100+ segments for realistic density
    extra_node_id = 15
    for base_id, (lat, lon, name) in list(nodes.items()):
        G.add_node(base_id, y=lat, x=lon, name=name)
        for offset_lat, offset_lon in [(-0.02, 0.01), (0.01, -0.02), (0.02, 0.02)]:
            n_id = extra_node_id
            extra_node_id += 1
            G.add_node(n_id, y=lat + offset_lat, x=lon + offset_lon, name=f"{name} Sub")
            G.add_edge(base_id, n_id, length=3000.0, highway='tertiary', surface='gravel')
            G.add_edge(n_id, base_id, length=3000.0, highway='tertiary', surface='gravel')

    # Main trunk highway connections NH-6 (Guwahati -> Shillong -> Jowai)
    trunk_line = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    for u, v in zip(trunk_line[:-1], trunk_line[1:]):
        u_node = nodes[u]
        v_node = nodes[v]
        dist_km = math.hypot(u_node[0]-v_node[0], u_node[1]-v_node[1]) * 111.0
        length_m = dist_km * 1000.0
        
        # Primary trunk connection
        G.add_edge(u, v, length=length_m, highway='trunk', surface='paved', bridge=random.random()<0.2)
        G.add_edge(v, u, length=length_m, highway='trunk', surface='paved', bridge=random.random()<0.2)
        
        # Alternate secondary bypass connection
        G.add_edge(u, v, length=length_m * 1.3, highway='secondary', surface='gravel')
        G.add_edge(v, u, length=length_m * 1.3, highway='secondary', surface='gravel')

    # Additional cross-corridor connections
    G.add_edge(7, 13, length=25000.0, highway='secondary', surface='gravel')
    G.add_edge(13, 11, length=18000.0, highway='tertiary', surface='dirt')
    G.add_edge(9, 14, length=15000.0, highway='secondary', surface='paved')
    G.add_edge(14, 11, length=8000.0, highway='primary', surface='paved')

    return G

if __name__ == "__main__":
    import asyncio
    asyncio.run(extract_osm_graph())
