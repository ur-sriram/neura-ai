import os
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NE-Setu-ETL")

def run_etl_pipeline(region="Guwahati-Shillong-Jowai"):
    """
    Mock ETL pipeline per Section 47.1 Track A
    Extracts OSM data, builds graph, enriches with DEM, creates seeds.
    """
    logger.info(f"Starting ETL Pipeline for region: {region}")
    
    # In a real environment, this would call osmnx.graph_from_bbox
    logger.info("Extracting OSM data...")
    
    # 22.1 - Generating synthetic closure events
    logger.info("Generating synthetic closure events...")
    
    logger.info("Saving graph.pkl and seed.sql...")
    
    # Write mock output
    os.makedirs("data", exist_ok=True)
    with open("data/graph.pkl", "w") as f:
        f.write("mock_graph_data")
        
    with open("data/seed.json", "w") as f:
        json.dump({
            "locations": [
                {"id": "depot_guwahati", "name": "Guwahati Hub", "type": "depot"},
                {"id": "village_shillong", "name": "Shillong Center", "type": "village"}
            ],
            "vehicles": [
                {"id": "V-1", "class": "heavy_truck"},
                {"id": "V-2", "class": "4x4"}
            ]
        }, f)
        
    logger.info("ETL Pipeline complete.")

if __name__ == "__main__":
    run_etl_pipeline()
