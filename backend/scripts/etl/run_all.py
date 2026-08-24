import asyncio
import sys
import os
import importlib.util

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

def load_module(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

async def run_full_etl():
    print("Starting NE-Setu Full ETL & Database Pipeline...")
    
    base_dir = os.path.dirname(__file__)
    seed_mod = load_module("seed_demo", os.path.join(base_dir, "../seed_demo.py"))
    osm_mod = load_module("extract_osm", os.path.join(base_dir, "01_extract_osm.py"))
    elev_mod = load_module("elevation_slope", os.path.join(base_dir, "02_elevation_slope.py"))
    w_mod = load_module("weather_archive", os.path.join(base_dir, "03_weather_archive.py"))
    s_mod = load_module("susceptibility", os.path.join(base_dir, "04_susceptibility.py"))
    h3_mod = load_module("h3_assignment", os.path.join(base_dir, "05_h3_assignment.py"))
    lns_mod = load_module("seed_lns", os.path.join(base_dir, "06_seed_lns.py"))

    print("\n--- Step 1: Database Seed Data ---")
    await seed_mod.seed_data()

    print("\n--- Step 2: Extract OSM Road Graph ---")
    await osm_mod.extract_osm_graph()

    print("\n--- Step 3: Compute DEM Elevation & Grade ---")
    await elev_mod.process_elevation_and_slope()

    print("\n--- Step 4: Seed Weather Timeline ---")
    await w_mod.seed_weather_timeline()

    print("\n--- Step 5: Process Susceptibility Priors ---")
    await s_mod.process_susceptibility_priors()

    print("\n--- Step 6: H3 Hex Indexing ---")
    await h3_mod.process_h3_indexing()

    print("\n--- Step 7: Initialize Living Network State (LNS v0) ---")
    await lns_mod.seed_initial_lns()

    print("\nFull ETL & Data Pipeline completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_full_etl())
