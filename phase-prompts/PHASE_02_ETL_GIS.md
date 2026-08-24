# PHASE 02 — ETL PIPELINE & GIS DATA
**Track:** A | **Hours:** 4–10 | **Agent:** GIS/Data Agent  
**Output:** Populated database with real road graph, elevation, weather, and susceptibility data  
**Master spec refs:** Section 20 (GIS System), Section 22 (Data Architecture), Section 23.1 (ML Artifact Pipeline)

---

## Context

You are building the **build-time ETL pipeline** for NE-Setu. This runs **once before the demo** and populates the PostgreSQL database with real geospatial and weather data. The demo never calls external APIs at runtime — all external data is fetched here and baked in.

**Prerequisites:** Phase 01 database must be running and migrated.

**Bounding box:** `(25.30°N, 91.30°E) → (26.30°N, 92.60°E)` — Guwahati to Jowai corridor.

---

## Deliverables

1. `scripts/etl/01_extract_osm.py` — download and process OSM road network
2. `scripts/etl/02_elevation_slope.py` — attach DEM elevation and grade to each segment
3. `scripts/etl/03_weather_archive.py` — fetch historical rainfall and seed weather_timeline
4. `scripts/etl/04_susceptibility.py` — compute landslide/flood susceptibility priors per segment
5. `scripts/etl/05_h3_assignment.py` — assign segments and locations to H3 hex grid
6. `scripts/etl/06_seed_locations.py` — geocode and seed the 30 demo locations
7. `scripts/etl/run_all.sh` — runs all scripts in order
8. `data/graph.pkl` — serialised NetworkX MultiDiGraph (output of step 01)

---

## Step 1: OSM Road Network (`01_extract_osm.py`)

```python
import osmnx as ox
import networkx as nx
import pickle, psycopg2

BBOX = (25.30, 91.30, 26.30, 92.60)  # (south, west, north, east)
HIGHWAY_FILTER = '["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|track|service"]'

# Download graph
G = ox.graph_from_bbox(
    bbox=BBOX,
    network_type='drive',
    custom_filter=HIGHWAY_FILTER,
    retain_all=False,
    simplify=True
)

# Project to UTM for accurate distance calculations
G_proj = ox.project_graph(G)
G_proj = ox.add_edge_lengths(G_proj)

# Extract edges as GeoDataFrame
edges = ox.graph_to_gdfs(G, nodes=False, edges=True)
edges = edges.reset_index()

# Map OSM tags to our schema
def classify_surface(tags):
    s = tags.get('surface', '')
    if s in ['asphalt', 'concrete', 'paved']: return 'paved'
    if s in ['gravel', 'compacted']: return 'gravel'
    if s in ['dirt', 'earth', 'mud']: return 'dirt'
    if s in ['grass', 'sand', 'ground', 'track']: return 'track'
    # Heuristic fallback by highway class
    hw = tags.get('highway', 'unclassified')
    if hw in ['motorway','trunk','primary']: return 'paved'
    if hw in ['secondary','tertiary']: return 'paved'
    if hw in ['unclassified','residential']: return 'gravel'
    return 'track'

def get_maxweight(tags):
    mw = tags.get('maxweight')
    if mw:
        try: return float(str(mw).replace('t','').strip())
        except: pass
    # Seed heuristic for bridges without maxweight tag
    if tags.get('bridge') == 'yes':
        hw = tags.get('highway','unclassified')
        if hw in ['primary','trunk']: return 20.0
        if hw in ['secondary']: return 10.0
        return 5.0  # conservative default for untagged minor bridges — provenance='seeded'
    return None

# Insert into road_segments table
# For each edge, insert with provenance='real' for geometry,
# and flag maxweight as 'seeded' in provenance if it was heuristically derived
```

**Important:** After inserting, also serialize and save the NetworkX graph:
```python
# Save the base graph (edge weights will be re-computed at runtime from LNS)
with open('data/graph.pkl', 'wb') as f:
    pickle.dump(G, f)
```

**Target output:** 3,000–8,000 road segments in `road_segments` table.

---

## Step 2: Elevation & Slope (`02_elevation_slope.py`)

Use the `elevation` Python package (wraps SRTM S3 tiles — free, no key):

```python
import elevation
import rasterio
from rasterio.transform import rowcol
import numpy as np

# Download DEM for bbox
elevation.clip(bounds=(91.30, 25.30, 92.60, 26.30), output='data/dem.tif', product='SRTM3')

# For each road segment midpoint, sample elevation
# Compute grade = (elevation_end - elevation_start) / length_m
# Store mean_grade and max_grade per segment
```

**Fallback:** If `elevation` package tile download fails, use Open-Meteo elevation endpoint:
```
GET https://api.open-meteo.com/v1/elevation?latitude={lat_list}&longitude={lon_list}
```
Batch all segment midpoints (max 100 per request). No API key needed.

**Slope classification:**
- flat: |grade| < 2%
- gentle: 2–5%
- moderate: 5–8%
- steep: 8–12%
- severe: > 12%

---

## Step 3: Weather Archive (`03_weather_archive.py`)

Fetch 96 hours of real historical monsoon data from Open-Meteo (free, no key):

```python
import requests, json

# Use monsoon 2023 data for the corridor
# Two zones: Brahmaputra plain (north) and Khasi hills (south)
ZONES = {
    'brahmaputra_plain': (26.14, 91.74),  # near Guwahati
    'khasi_hills':       (25.57, 91.88),  # near Shillong
}

# Pick a real heavy-monsoon window for drama: August 2023
START = "2023-08-10"
END   = "2023-08-14"    # 96 hours

for zone, (lat, lon) in ZONES.items():
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat, "longitude": lon,
        "start_date": START, "end_date": END,
        "hourly": "precipitation,rain,wind_speed_10m,visibility"
    }
    resp = requests.get(url, params=params, timeout=30).json()
    
    for i, (rain, wind, vis) in enumerate(zip(
        resp['hourly']['rain'],
        resp['hourly']['wind_speed_10m'],
        resp['hourly']['visibility']
    )):
        # Insert into weather_timeline with sim_hour = i
        # sim_hour 0 = 06:00 day 1 (calm morning)
        # Pick the window such that the storm peaks around sim_hour 36-48
```

**Important:** Map the historical data so that:
- Sim hours 0–6: clear (calm demo opening)
- Sim hours 18–36: rain building (pre-emptive rerouting scenario)
- Sim hours 36–48: peak intensity (landslide trigger scenario)
- Sim hours 60–96: clearing (recovery)

---

## Step 4: Susceptibility Priors (`04_susceptibility.py`)

For each road segment, compute static landslide and flood susceptibility priors:

```python
def compute_landslide_susceptibility(segment):
    """
    Physical susceptibility index S in [0, 1].
    Formula from Section 11.1 of master spec:
    S = w1*slope_factor + w2*elevation_factor + w3*historical_factor
    """
    slope = abs(segment.mean_grade)
    
    # Slope factor (dominant driver)
    slope_factor = min(1.0, slope / 15.0)  # normalise to 15% = max
    
    # Elevation band factor (Khasi hills = higher susceptibility)
    elev = segment.elevation_m
    elev_factor = min(1.0, max(0.0, (elev - 200) / 1300))  # 200m=0, 1500m=1
    
    # Historical density factor: segments near known landslide zones
    # Use distance to high-risk road segments (NH-6 hairpin bends area)
    # Simple proxy: latitude < 25.8 AND elevation > 500 → higher prior
    hist_factor = 0.4 if (segment.lat < 25.8 and elev > 500) else 0.1
    
    S = 0.5 * slope_factor + 0.3 * elev_factor + 0.2 * hist_factor
    return min(1.0, S)

def compute_flood_susceptibility(segment):
    """
    Flood susceptibility based on elevation relative to river network.
    Low-elevation, near-river segments near Brahmaputra = high risk.
    """
    elev = segment.elevation_m
    near_brahmaputra = segment.lat > 25.8  # northern corridor
    
    elev_factor = max(0.0, 1.0 - elev / 200.0)  # below 200m = high risk
    zone_factor = 0.6 if near_brahmaputra else 0.1
    
    return min(1.0, 0.6 * elev_factor + 0.4 * zone_factor)
```

---

## Step 5: H3 Assignment (`05_h3_assignment.py`)

```python
import h3

RESOLUTION = 7  # ~5km² hexagons

# For each road segment, compute H3 index of midpoint
# For each location, compute H3 index of point
# Insert into h3_cells table (unique set of hexes covering the bbox)

# Compute initial hex accessibility (all segments OPEN at sim_hour 0)
# GROUP BY h3_index, average a_scores across member segments
```

---

## Step 6: Seed Locations (`06_seed_locations.py`)

Use Nominatim geocoding (no key, 1 req/sec) to geocode all 30 locations:

```python
import requests, time

LOCATIONS = [
    # Depots
    {"name": "Guwahati Central Depot", "kind": "depot", "query": "Guwahati, Assam"},
    {"name": "Shillong Forward Point", "kind": "depot", "query": "Shillong, Meghalaya"},
    {"name": "Jowai Sub-depot", "kind": "depot", "query": "Jowai, Meghalaya"},
    # Health facilities
    {"name": "GNRC Hospital Guwahati", "kind": "health", "query": "GNRC Hospital, Guwahati"},
    {"name": "Civil Hospital Shillong", "kind": "health", "query": "Civil Hospital, Shillong"},
    {"name": "District Hospital Jowai", "kind": "health", "query": "District Hospital, Jowai, Meghalaya"},
    # ... add 7 more health, 20 villages across the corridor
]

def geocode(query):
    url = "https://nominatim.openstreetmap.org/search"
    resp = requests.get(url, params={"q": query, "format": "json", "limit": 1},
                        headers={"User-Agent": "NE-Setu/1.0"}).json()
    time.sleep(1.1)  # respect 1 req/sec
    if resp:
        return float(resp[0]['lat']), float(resp[0]['lon'])
    return None
```

---

## Initial LNS Seed (`07_seed_lns.py`)

After the road graph is loaded, create the initial LNS version (version=0, all segments OPEN):

```python
# For every road_segment, insert a segment_overlay at lns_version=0, valid_at_sim=0
# status = 'OPEN'
# a_score_* = compute accessibility score using the formula from Section 13.2
# p_landslide_* = 0.0 (calm initial state, no rain yet)
# p_flood_* = 0.0
# contributing_factors = full decomposition JSON

def compute_accessibility_score(segment, vehicle_class, weather_rain_mm=0.0, hazard_p=0.0):
    """
    Section 13.2 formula. Returns score in [0,100].
    """
    # Hazard penalty
    hazard = 1 - 0.9 * hazard_p
    
    # Status penalty (all OPEN at init)
    status = 1.0
    
    # Surface penalty by vehicle class
    surface_factors = {
        'paved':   {'heavy':1.0, 'mini':1.0, '4x4':1.0, 'special':1.0},
        'gravel':  {'heavy':0.75, 'mini':0.85, '4x4':0.92, 'special':0.88},
        'dirt':    {'heavy':0.45, 'mini':0.65, '4x4':0.85, 'special':0.75},
        'track':   {'heavy':0.30, 'mini':0.50, '4x4':0.90, 'special':0.80},
    }
    surface = surface_factors.get(segment.surface, surface_factors['gravel'])[vehicle_class]
    
    # Terrain penalty
    grade = abs(segment.mean_grade)
    grade_comfort = {'heavy':5.0, 'mini':7.0, '4x4':12.0, 'special':8.0}[vehicle_class]
    terrain = max(0.0, 1 - 0.08 * max(0, grade - grade_comfort))
    
    # Hard restriction (maxweight vs vehicle weight)
    vehicle_weights = {'heavy':10000, 'mini':3500, '4x4':2500, 'special':3000}
    if segment.maxweight and vehicle_weights[vehicle_class] > segment.maxweight * 1000:
        return 0.0  # infeasible
    
    # Weather penalty
    weather = 1 - 0.05 * min(weather_rain_mm, 10.0)
    
    score = 100 * hazard * status * surface * terrain * weather
    return max(0.0, min(100.0, score))
```

---

## Acceptance Criteria

- [ ] `road_segments` table: 3,000–8,000 rows with geom, highway_class, surface, grade populated
- [ ] `weather_timeline` table: 96 rows × 2 zones = 192 rows, storm peaks at hours 36–48
- [ ] `segment_overlays` table: one overlay per segment at lns_version=0 (initial OPEN state)
- [ ] `h3_cells` table populated with hexes covering the bbox
- [ ] `locations` table: 30 rows (3 depots, 10 health, 17 villages) with valid geom
- [ ] `data/graph.pkl` exists and loads with `nx.read_gpickle` / `pickle.load`
- [ ] Data provenance panel shows: "Road geometry: real (OSM). Surface/weight on untagged bridges: seeded. Weather: Open-Meteo archive 2023-08-10–14. Fleet/deliveries: simulated."

---

## Data Quality Disclosure (Critical)

The provenance panel must show these honest statements:
- **Bridge weight limits:** Many OSM bridges in NE India lack `maxweight` tags. We seed a conservative heuristic (primary=20t, secondary=10t, minor=5t) and label these as `provenance='seeded'`.
- **Road surface:** ~40% of segments will lack surface tags in this region. Fallback by highway class, labelled as `seeded`.
- **Landslide history:** No public machine-readable segment-level closure database exists. Susceptibility priors use terrain proxy (slope + elevation band). Labelled as `simulated`.
- **Fleet and deliveries:** Entirely simulated by design, explicitly disclosed.
