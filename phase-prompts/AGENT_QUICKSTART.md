# NE-SETU — QUICK START FOR AI CODING AGENTS
**Read this before reading any phase file.**

---

## What You Are Building

**NE-Setu** — an AI-powered logistics & accessibility intelligence platform for Northeast India's difficult terrain.
- **Hackathon:** SIH 2026, Problem SIH26002
- **Ministry:** DoNER (Development of North Eastern Region)
- **Build time:** 27 hours using AI coding agents
- **Corridor:** Guwahati → Shillong → Jowai (real OSM roads, real weather)

The system answers one question in real-time: **"Which roads can which vehicle use, right now and over the next 72 hours — and what's the best plan?"**

---

## Repository Structure (Target — Build This)

```
c:\sriram\soap.ai\
├── phase-prompts/          ← You are here. Implementation blueprints.
│   ├── PHASE_00_OVERVIEW.md
│   ├── PHASE_01_DATABASE.md
│   ├── PHASE_02_ETL_GIS.md
│   ├── PHASE_03_BACKEND_CORE.md
│   ├── PHASE_04_AI_ML.md
│   ├── PHASE_05_API.md
│   ├── PHASE_06_FRONTEND.md
│   ├── PHASE_07_TESTING.md
│   └── PHASE_08_DEMO_DEPLOY.md
├── backend/                ← FastAPI Python backend
│   ├── app/
│   ├── scripts/
│   │   ├── etl/
│   │   └── ml/
│   ├── models/             ← .joblib ML artifacts + EVAL.md
│   ├── tests/
│   └── requirements.txt
├── frontend/               ← React + Vite + TypeScript SPA
│   ├── src/
│   └── package.json
├── data/
│   ├── graph.pkl           ← NetworkX road graph
│   ├── tiles/              ← Offline basemap tiles
│   └── scenarios/          ← SCN-01 scripted demo scenario
├── docker-compose.yml
└── MASTER_PROJECT_OVERVIEW.md ← Full architecture spec (3000 lines)
```

---

## Python Dependencies (`backend/requirements.txt`)

```
# Web framework
fastapi==0.111.0
uvicorn[standard]==0.29.0
websockets==12.0
python-multipart==0.0.9

# Database
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
alembic==1.13.1
psycopg2-binary==2.9.9
geoalchemy2==0.15.0

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
pydantic-settings==2.2.1

# GIS & Spatial
osmnx==1.9.3
networkx==3.3
geopandas==0.14.4
shapely==2.0.4
h3==3.7.7
rasterio==1.3.10
pyproj==3.6.1
elevation==1.1.3        # SRTM DEM downloader
requests==2.32.3

# ML
lightgbm==4.3.0
scikit-learn==1.5.0
numpy==1.26.4
pandas==2.2.2
scipy==1.13.0
joblib==1.4.2

# Optimization
ortools==9.10.4067

# Utilities
httpx==0.27.0
python-dotenv==1.0.1
structlog==24.1.0
```

---

## Frontend Dependencies (`frontend/package.json`)

```json
{
  "name": "nesetu-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "zustand": "^4.5.2",
    "axios": "^1.7.2",
    "maplibre-gl": "^4.3.2",
    "@deck.gl/core": "^9.0.16",
    "@deck.gl/react": "^9.0.16",
    "@deck.gl/layers": "^9.0.16",
    "@deck.gl/geo-layers": "^9.0.16",
    "recharts": "^2.12.7",
    "date-fns": "^3.6.0",
    "h3-js": "^4.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.13",
    "tailwindcss": "^3.4.4",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "@shadcn/ui": "latest",
    "vitest": "^1.6.0",
    "@playwright/test": "^1.44.1"
  }
}
```

---

## One-Command Start

```bash
# From c:\sriram\soap.ai\
docker compose up --build -d

# Run ETL (first time only — takes ~20min for OSM + DEM download)
docker compose exec api python scripts/etl/run_all.sh

# Train ML models (after ETL)
docker compose exec api python scripts/ml/run_all.sh

# Verify
curl http://localhost:8000/health
# → {"status": "ok", "db": "connected", "models": {"hazard": "ml", "eta": "ml"}}

# Frontend
open http://localhost:5173
# Login: manager1 / demo123
```

---

## Bounding Box (Use This Everywhere)

```python
BBOX = {
    'south': 25.30, 'west': 91.30,
    'north': 26.30, 'east': 92.60
}
# Guwahati (26.14N, 91.74E) → Shillong (25.57N, 91.88E) → Jowai (25.45N, 92.20E)
```

---

## Simulation Clock Convention

| sim_hour | Real world meaning |
|---|---|
| 0 | 06:00 Day 1 (calm morning — demo start) |
| 18 | 00:00 Day 2 (rain begins in hills) |
| 36 | 18:00 Day 2 (LANDSLIDE — demo centrepiece) |
| 42 | 00:00 Day 3 (emergency delivery created) |
| 72 | 06:00 Day 4 (road re-opens) |
| 96 | 06:00 Day 5 (demo timeline end) |

`sim_time` (INTEGER hours) is ALWAYS separate from `wall_time` (TIMESTAMPTZ). Never conflate.

---

## Demo Accounts

| Username | Password | Role |
|---|---|---|
| manager1 | demo123 | manager |
| officer1 | demo123 | officer |
| driver1 | demo123 | driver |

---

## The 5 Features That Must Work (Everything Else Is Optional)

1. **Vehicle-class toggle on map** → hexes recolour (S2/S3)
2. **Landslide event → cascade → plan in < 5s** (S5)
3. **Human approval gate** → plan approved → drivers rerouted (S5)
4. **What-if: close any segment → diff in < 3s** (S6)
5. **Decision record: why was this route chosen** (S7)

If hours run short, cut everything except these 5. See PHASE_00_OVERVIEW.md drop list.
