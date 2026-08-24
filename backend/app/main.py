import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.services.websocket import ws_manager
from app.services.sim_clock import sim_clock
from app.ml import hazard_model, eta_model

# Import routers
from app.routers import (
    auth, map as map_router, accessibility, events,
    plans, optimization, simulation, demo, deliveries
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting NE-Setu FastAPI Application...")
    # Initialize DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("  - Database tables initialized.")

    # Load ML models
    hazard_model.load()
    eta_model.load()
    print("  - ML models initialized.")

    yield
    print("Shutting down NE-Setu FastAPI Application...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(map_router.router, prefix=settings.API_V1_STR)
app.include_router(accessibility.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(plans.router, prefix=settings.API_V1_STR)
app.include_router(optimization.router, prefix=settings.API_V1_STR)
app.include_router(simulation.router, prefix=settings.API_V1_STR)
app.include_router(demo.router, prefix=settings.API_V1_STR)
app.include_router(deliveries.router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    """Health check endpoint required by acceptance criteria."""
    db_status = "connected"
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1;"))
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "db": db_status,
        "sim_time": sim_clock.sim_hour,
        "llm_available": bool(settings.LLM_API_KEY)
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time WebSocket endpoint for LNS updates, clock ticks, and alert fan-out."""
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Echo ping check
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong", "sim_time": sim_clock.sim_hour})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
