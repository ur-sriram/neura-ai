from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import logistics, accessibility, ai, emergency, communities, india_data, events

app = FastAPI(
    title=settings.APP_NAME,
    description="AI Smart Logistics & Accessibility Platform for North Eastern Region (NER) India - Multi-agent system with LangGraph orchestration",
    version="1.1.0",
    contact={
        "name": "NER Logistics Team",
        "email": "team@ner-logistics.in",
    },
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(logistics.router, prefix="/api/logistics", tags=["Logistics"])
app.include_router(accessibility.router, prefix="/api/accessibility", tags=["Accessibility"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI & Multi-Agent"])
app.include_router(emergency.router, prefix="/api/emergency", tags=["Emergency"])
app.include_router(communities.router, prefix="/api/communities", tags=["Communities"])
app.include_router(india_data.router, prefix="/api/india-data", tags=["India Open Data (data.gov.in style)"])
app.include_router(events.router, prefix="/api/events", tags=["Events & Disruptions"])


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.1.0",
        "environment": settings.APP_ENV,
        "gemini_configured": bool(settings.GOOGLE_API_KEY),
        "features": [
            "weighted_route_scoring",
            "accessibility_100_scale",
            "event_ingestion",
            "vehicle_intelligence",
            "emergency_prioritization",
            "what_if_simulation",
            "decision_explainability",
        ],
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "name": settings.APP_NAME,
        "description": "AI-powered Smart Logistics & Accessibility Platform for NER India",
        "version": "1.1.0",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health",
            "logistics": "/api/logistics",
            "accessibility": "/api/accessibility",
            "ai": "/api/ai",
            "emergency": "/api/emergency",
            "communities": "/api/communities",
            "india_data": "/api/india-data",
            "events": "/api/events",
        },
        "new_mvp_features": {
            "route_optimization": "Weighted 7-factor composite scoring (insight-derived)",
            "accessibility": "0-100 scale with 5 weighted components + vehicle suitability",
            "events": "Event ingestion API for landslide/flood/road_block disruption events",
            "vehicle_intel": "Cargo-to-vehicle matching with terrain-aware suitability",
            "prioritization": "Emergency delivery priority scoring 0-100 with approval flags",
            "what_if": "Disruption scenario simulator for planning",
            "explainability": "Decision log + human-in-the-loop flags per route decision",
        },
        "agents": [
            "SupervisorAgent",
            "LogisticsAgent",
            "AccessibilityAgent",
            "EmergencyAgent",
            "CommunityAgent",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
