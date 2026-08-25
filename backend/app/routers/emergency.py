from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    EmergencyAlertListResponse, EmergencyAlertFilter,
    EvacuateRequest, EvacuateResponse,
)
from app.services.emergency_service import list_alerts, plan_evacuation
from app.services.weather_service import (
    get_current_weather, list_all_weather, get_weather_zones,
    get_multi_city_weather,
)

router = APIRouter()


@router.get("/alerts", response_model=EmergencyAlertListResponse, summary="List active emergency alerts across NER")
def get_alerts(
    state: Optional[str] = Query(None),
    severity: Optional[str] = Query(None, description="low | medium | high | critical"),
    type: Optional[str] = Query(None, description="flood | landslide | earthquake | cyclone | avalanche | road_block"),
    active_only: bool = Query(True),
):
    sev_val = severity if severity in ("low","medium","high","critical") else None
    type_val = type if type in ("flood","landslide","earthquake","cyclone","avalanche","road_block") else None
    f = EmergencyAlertFilter(state=state, severity=sev_val, type=type_val, active_only=active_only)
    try:
        return list_alerts(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alert query failed: {e}")


@router.post("/evacuate", response_model=EvacuateResponse, summary="Evacuation plan: primary/backup routes + shelters + checklist")
def evacuate(req: EvacuateRequest):
    try:
        return plan_evacuation(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evacuation plan failed: {e}")


@router.get("/weather", summary="Get current NER weather snapshot (Live via Open-Meteo, fallback static)")
async def weather_snapshot(
    city: Optional[str] = Query(None),
    use_live: bool = Query(True, description="Try Open-Meteo live weather API (free, no key)"),
):
    if city:
        w = await get_current_weather(city, use_live=use_live)
        if not w:
            raise HTTPException(status_code=404, detail=f"No weather data for {city}")
        return {"count": 1, "items": [w], "note": "Live via Open-Meteo when available, else NER static"}
    all_w = await list_all_weather(use_live=use_live)
    return {"count": len(all_w), "items": all_w, "note": "Live via Open-Meteo when available, else NER static"}


@router.get("/weather/zones", summary="Get NER agro-climatic & disaster risk zones")
def weather_zones(state: Optional[str] = Query(None)):
    zones = get_weather_zones(state)
    return {"count": len(zones), "items": zones}


@router.get(
    "/live-risk",
    summary="Live multi-city risk panel — all 8 NER state capitals in one call",
    description=(
        "Uses Open-Meteo (free, no key) to fetch live weather for all 8 NER capitals "
        "and derives a risk_tier (low | moderate | high | critical) per city. "
        "Powered by the get_multi_city_weather() service function."
    ),
)
async def live_risk_panel(
    use_live: bool = Query(True),
    cities: Optional[str] = Query(None, description="Comma-separated city list override"),
):
    city_list = [c.strip() for c in cities.split(",")] if cities else None
    try:
        panel = await get_multi_city_weather(cities=city_list, use_live=use_live)
        critical = [p for p in panel if p.get("risk_tier") == "critical"]
        high = [p for p in panel if p.get("risk_tier") == "high"]
        return {
            "count": len(panel),
            "cities": panel,
            "summary": {
                "critical_count": len(critical),
                "high_count": len(high),
                "critical_cities": [p["city"] for p in critical],
                "high_cities": [p["city"] for p in high],
            },
            "note": "Data from Open-Meteo (free) + NER static dataset fallback",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Live risk panel failed: {e}")
