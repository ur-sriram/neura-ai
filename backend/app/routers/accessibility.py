from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    AccessibilityScoreResponse, AccessibleRouteRequest, AccessibleRouteResponse,
    POIListResponse, POIFilterRequest,
)
from app.services.accessibility_service import (
    score_city, find_accessible_routes, list_pois,
)

router = APIRouter()


@router.get("/score", response_model=AccessibilityScoreResponse, summary="Accessibility score for a city/route")
def get_score(
    city: Optional[str] = Query(None, description="City name to score overall accessibility"),
    route_source: Optional[str] = Query(None, description="Source city for route score"),
    route_destination: Optional[str] = Query(None, description="Destination city for route score"),
):
    if not city and not (route_source and route_destination):
        raise HTTPException(status_code=400, detail="Provide either 'city' or both 'route_source' and 'route_destination'.")
    target = city or route_source
    result = score_city(target)
    if not result:
        raise HTTPException(status_code=404, detail=f"No data for city: {target}")
    if route_source and route_destination:
        result.location = f"{route_source} → {route_destination}"
        result.recommendations.append(f"Also check destination score: /api/accessibility/score?city={route_destination}")
    return result


@router.post("/routes", response_model=AccessibleRouteResponse, summary="Mobility-aware route planning")
def accessible_routes(req: AccessibleRouteRequest):
    try:
        return find_accessible_routes(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Accessible route search failed: {e}")


@router.get("/pois", response_model=POIListResponse, summary="List accessibility-rated POIs")
def get_pois(
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    type: Optional[str] = Query("all", description="airport | railway | bus_terminal | hospital | market | all"),
    wheelchair_only: bool = Query(False),
    min_rating: int = Query(0, ge=0, le=5),
):
    req = POIFilterRequest(
        city=city, state=state, type=type if type in ("airport","railway","bus_terminal","hospital","market","all") else "all",
        wheelchair_only=wheelchair_only, min_rating=min_rating,
    )
    try:
        return list_pois(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
