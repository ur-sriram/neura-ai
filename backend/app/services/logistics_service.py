import math
import heapq
import uuid
import random
import asyncio
import os
import logging
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import networkx as nx

import httpx

logger = logging.getLogger(__name__)

# ── OpenRouteService (GIScience/openrouteservice) ──────────────────────────
# Free REST API for real NER driving directions & geometry. Gracefully
# degrades to NetworkX A* if key is missing or quota exceeded.
_ORS_KEY = os.getenv("ORS_API_KEY", "")
_ORS_BASE = "https://api.openrouteservice.org/v2/directions/driving-car"

# ── Nominatim geocode cache (OpenStreetMap) ────────────────────────────────
_NOM_CACHE: Dict[str, Optional[Tuple[float, float]]] = {}
_NOM_BASE = "https://nominatim.openstreetmap.org/search"

# NER city → (lat, lon) lookup (used by ORS & Nominatim fallback)
_NER_COORDS: Dict[str, Tuple[float, float]] = {
    "Guwahati": (26.1445, 91.7362),
    "Shillong": (25.5788, 91.8933),
    "Imphal": (24.8170, 93.9368),
    "Agartala": (23.8315, 91.2868),
    "Aizawl": (23.7271, 92.7176),
    "Kohima": (25.6751, 94.1086),
    "Itanagar": (27.0844, 93.6053),
    "Gangtok": (27.3389, 88.6065),
    "Dimapur": (25.9091, 93.7267),
    "Silchar": (24.8333, 92.7789),
    "Tezpur": (26.6338, 92.7926),
    "Jorhat": (26.7465, 94.2026),
    "Cherrapunji": (25.2833, 91.7000),
    "Ukhrul": (25.1031, 94.3617),
    "Haflong": (25.1631, 93.0173),
    "Mao Gate": (25.4200, 94.0100),
    "Jiribam": (24.8036, 93.1218),
    "Moreh": (24.2333, 94.2667),
}


async def geocode_city(name: str) -> Optional[Tuple[float, float]]:
    """Resolve a city name to (lat, lon) using local NER dict then Nominatim."""
    # Fast path: match against known NER cities
    base = name.split(",")[0].strip()
    if base in _NER_COORDS:
        return _NER_COORDS[base]
    # Try full match
    for k, v in _NER_COORDS.items():
        if k.lower() in name.lower():
            return v
    # Check cache
    if name in _NOM_CACHE:
        return _NOM_CACHE[name]
    # Nominatim lookup (free, 1 req/sec policy, India bias)
    try:
        params = {"q": name, "countrycodes": "in", "format": "json", "limit": 1}
        headers = {"User-Agent": "NER-Logistics-Platform/1.0"}
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(_NOM_BASE, params=params, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if data:
                coords = (float(data[0]["lat"]), float(data[0]["lon"]))
                _NOM_CACHE[name] = coords
                return coords
    except Exception as exc:
        logger.debug("Nominatim geocode failed for %s: %s", name, exc)
    _NOM_CACHE[name] = None
    return None


async def get_ors_route(
    origin: str, destination: str
) -> Optional[Dict]:
    """
    Fetch real driving route from OpenRouteService (GIScience/openrouteservice).
    Returns dict with distance_km, eta_minutes, geometry (GeoJSON LineString).
    Falls back to None if key absent or request fails.
    """
    if not _ORS_KEY:
        return None
    orig_coords = await geocode_city(origin)
    dest_coords = await geocode_city(destination)
    if not orig_coords or not dest_coords:
        return None
    # ORS expects [lon, lat]
    body = {
        "coordinates": [
            [orig_coords[1], orig_coords[0]],
            [dest_coords[1], dest_coords[0]],
        ],
        "instructions": False,
        "geometry": True,
    }
    headers = {
        "Authorization": _ORS_KEY,
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(_ORS_BASE, json=body, headers=headers)
        if resp.status_code != 200:
            logger.warning("ORS returned %s: %s", resp.status_code, resp.text[:200])
            return None
        data = resp.json()
        summary = data["routes"][0]["summary"]
        geometry = data["routes"][0].get("geometry")
        return {
            "source": "openrouteservice",
            "distance_km": round(summary["distance"] / 1000, 2),
            "eta_minutes": round(summary["duration"] / 60, 1),
            "geometry": geometry,  # GeoJSON LineString or encoded polyline
        }
    except Exception as exc:
        logger.warning("ORS route failed for %s→%s: %s", origin, destination, exc)
        return None


def fleet_optimize_vrp(
    depot: Tuple[float, float],
    deliveries: List[Dict],
    vehicles: List[Dict],
) -> Dict:
    """
    Multi-stop fleet optimizer using PyVRP (PyVRP/PyVRP on GitHub).
    Falls back to round-robin assignment if pyvrp is not installed or errors.

    deliveries: [{"id": str, "lat": float, "lon": float, "demand_kg": int}]
    vehicles:   [{"id": str, "capacity_kg": int}]
    Returns: {"assignments": {vehicle_id: [delivery_ids]}, "solver": "pyvrp"|"fallback"}
    """
    try:
        from pyvrp import Model
        from pyvrp.stop import MaxRuntime

        m = Model()
        depot_loc = m.add_location(x=int(depot[1] * 1e5), y=int(depot[0] * 1e5))
        m.add_depot(location=depot_loc)

        for d in deliveries:
            c_loc = m.add_location(x=int(d["lon"] * 1e5), y=int(d["lat"] * 1e5))
            m.add_client(location=c_loc, delivery=d.get("demand_kg", 100))

        for v in vehicles:
            m.add_vehicle_type(
                num_available=1,
                capacity=v.get("capacity_kg", 5000),
            )

        result = m.solve(stop=MaxRuntime(1), display=False, seed=42)
        assignments: Dict[str, List[str]] = {}
        for r_idx, route in enumerate(result.best.routes()):
            vid = vehicles[r_idx % len(vehicles)]["id"] if vehicles else f"V{r_idx}"
            visited_ids = []
            for act in route:
                if getattr(act, "is_client", False):
                    idx = getattr(act, "idx", 0)
                    if 0 <= idx < len(deliveries):
                        visited_ids.append(deliveries[idx]["id"])
            assignments[vid] = visited_ids

        return {"assignments": assignments, "solver": "pyvrp", "cost": result.best.distance()}
    except ImportError:
        logger.info("pyvrp not installed — using round-robin fallback")
    except Exception as exc:
        logger.warning("PyVRP solve error: %s", exc)

    # Simple round-robin fallback
    assignments = {v["id"]: [] for v in vehicles} if vehicles else {"V0": []}
    vids = list(assignments.keys())
    for i, d in enumerate(deliveries):
        assignments[vids[i % len(vids)]].append(d["id"])
    return {"assignments": assignments, "solver": "fallback"}


from app.data.ner_data import (
    CITIES, ROAD_NETWORK, STATES, get_city_coords, get_state_of_city,
    WEATHER_CURRENT, get_weather_zone_of_city,
)
from app.models.schemas import (
    RouteOptimizeRequest, RouteOptimizeResponse, RouteSegment,
    ScoreBreakdown, DecisionLogEntry,
    CargoMatchRequest, VehicleRecommendation, VehicleProfile,
    DeliveryPrioritizeRequest, DeliveryPriority,
    WhatIfScenarioRequest, WhatIfScenarioResponse,
)
from app.services.events_service import (
    get_blocked_city_set, get_segment_block_penalty,
)


VEHICLE_SPEED = {
    "truck": 35,
    "car": 55,
    "bus": 45,
    "bike": 50,
    "ev_truck": 40,
}

VEHICLE_COST_PER_KM = {
    "truck": 42.0,
    "car": 15.0,
    "bus": 32.0,
    "bike": 6.0,
    "ev_truck": 34.0,
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def build_road_graph(priority: str = "fastest", consider_weather: bool = True, avoid: Optional[List[str]] = None) -> nx.DiGraph:
    avoid_set = set(avoid or [])
    blocked_cities = get_blocked_city_set()
    avoid_set.update(blocked_cities)
    G = nx.DiGraph()

    for src, dst, attr in ROAD_NETWORK:
        if src in avoid_set or dst in avoid_set:
            continue
        distance = attr["distance_km"]
        terrain = attr["terrain_factor"]
        weight_base = distance

        if priority == "fastest":
            weight_base = distance * terrain
        elif priority == "safest":
            weight_base = distance * terrain * (1.0 + ((5 - attr["accessibility_rating"]) * 0.15))
        elif priority == "shortest":
            weight_base = distance

        weather_penalty = 1.0
        if consider_weather:
            w_src = WEATHER_CURRENT.get(src, {})
            w_dst = WEATHER_CURRENT.get(dst, {})
            if w_src.get("landslide_warning") or w_dst.get("landslide_warning"):
                weather_penalty *= 1.8
            if w_src.get("flood_warning") or w_dst.get("flood_warning"):
                weather_penalty *= 1.6
            if attr.get("condition") == "poor":
                weather_penalty *= 1.3
            if priority == "safest" and (w_src.get("landslide_warning") or w_dst.get("landslide_warning")):
                weather_penalty *= 2.0

        event_penalty = get_segment_block_penalty(src, dst)
        total_penalty = weather_penalty * event_penalty

        G.add_edge(src, dst,
                   distance_km=distance,
                   highway=attr["highway"],
                   terrain_factor=terrain,
                   accessibility_rating=attr["accessibility_rating"],
                   condition=attr["condition"],
                   weight=weight_base * total_penalty,
                   weather_penalty=weather_penalty,
                   event_penalty=event_penalty,
                   )
        G.add_edge(dst, src,
                   distance_km=distance,
                   highway=attr["highway"],
                   terrain_factor=terrain,
                   accessibility_rating=attr["accessibility_rating"],
                   condition=attr["condition"],
                   weight=weight_base * total_penalty,
                   weather_penalty=weather_penalty,
                   event_penalty=event_penalty,
                   )
    return G


def _a_star(G: nx.DiGraph, source: str, target: str) -> Optional[List[str]]:
    if source not in G or target not in G:
        return None

    coords_src = get_city_coords(source)
    coords_tgt = get_city_coords(target)

    def h(n: str) -> float:
        if coords_src and coords_tgt:
            c1 = get_city_coords(n) or coords_src
            return _haversine_km(c1[0], c1[1], coords_tgt[0], coords_tgt[1])
        return 0.0

    open_heap: List[Tuple[float, str]] = [(h(source), source)]
    g_score: Dict[str, float] = {source: 0.0}
    came_from: Dict[str, str] = {}

    while open_heap:
        _, current = heapq.heappop(open_heap)
        if current == target:
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            return list(reversed(path))

        for nb in G.neighbors(current):
            edge_wt = G[current][nb]["weight"]
            tentative = g_score[current] + edge_wt
            if tentative < g_score.get(nb, float("inf")):
                came_from[nb] = current
                g_score[nb] = tentative
                heapq.heappush(open_heap, (tentative + h(nb), nb))
    return None


def _segments_from_path(G: nx.DiGraph, path: List[str], vehicle_type: str) -> Tuple[List[RouteSegment], float, float]:
    segments: List[RouteSegment] = []
    total_dist = 0.0
    total_time = 0.0
    base_speed_kmh = VEHICLE_SPEED.get(vehicle_type, 40)
    warnings_all: List[str] = []

    for i in range(len(path) - 1):
        a, b = path[i], path[i+1]
        ed = G[a][b]
        dist = ed["distance_km"]
        terrain = ed["terrain_factor"]
        effective_speed = base_speed_kmh / terrain
        time_min = (dist / max(effective_speed, 5)) * 60
        seg_warnings: List[str] = []

        if ed["condition"] == "poor":
            seg_warnings.append("Poor road condition; drive slowly")
        if ed["accessibility_rating"] <= 1:
            seg_warnings.append("Very low accessibility rating; alternative transport may be needed")
        if WEATHER_CURRENT.get(a, {}).get("landslide_warning") or WEATHER_CURRENT.get(b, {}).get("landslide_warning"):
            seg_warnings.append("Landslide warning active on this segment")
        if WEATHER_CURRENT.get(a, {}).get("flood_warning") or WEATHER_CURRENT.get(b, {}).get("flood_warning"):
            seg_warnings.append("Flood warning active; check road clearance before departure")

        total_dist += dist
        total_time += time_min
        segments.append(RouteSegment(
            from_city=a, to_city=b,
            distance_km=round(dist, 2),
            highway=ed["highway"],
            terrain_factor=terrain,
            accessibility_rating=ed["accessibility_rating"],
            condition=ed["condition"],
            est_time_min=round(time_min, 1),
            warnings=seg_warnings,
        ))
        warnings_all.extend(seg_warnings)

    return segments, total_dist, total_time


def _weather_warnings_for_path(path: List[str]) -> List[str]:
    warn: List[str] = []
    for city in set(path):
        w = WEATHER_CURRENT.get(city)
        if not w:
            continue
        if w.get("landslide_warning"):
            warn.append(f"{city}: Landslide warning active — {w['condition']}")
        if w.get("flood_warning"):
            warn.append(f"{city}: Flood warning active — {w['condition']}")
        zone = get_weather_zone_of_city(city)
        if zone and zone.get("landslide_risk", 0) >= 0.8:
            warn.append(f"{city}: Zone '{zone['zone_name']}' has chronic high landslide risk during monsoon")
    return list(dict.fromkeys(warn))


def _clean_city_name(name: str) -> str:
    if not name:
        return name
    base = name.split(",")[0].strip()
    if base in CITIES:
        return base
    for k in CITIES:
        if k.lower() == base.lower():
            return k
    return base


def optimize_route(req: RouteOptimizeRequest) -> RouteOptimizeResponse:
    src = _clean_city_name(req.source)
    dst = _clean_city_name(req.destination)
    if src not in CITIES or dst not in CITIES:
        known = sorted(CITIES.keys())
        raise ValueError(f"Unknown city: '{req.source}' or '{req.destination}'. Known cities: {known[:5]}... (total {len(known)})")

    G = build_road_graph(priority=req.priority, consider_weather=req.consider_weather, avoid=req.avoid_zones)
    path = _a_star(G, src, dst)
    if not path:
        raise ValueError(f"No known route between {src} and {dst}")

    segments, total_dist, total_time = _segments_from_path(G, path, req.vehicle_type)

    cost_rate = VEHICLE_COST_PER_KM.get(req.vehicle_type, 20.0)
    weight_factor = 1.0
    if req.weight_kg:
        weight_factor = 1.0 + min(max(req.weight_kg / 10000, 0), 1.5)
    cost = total_dist * cost_rate * weight_factor

    advisories: List[str] = []
    state_src = get_state_of_city(src)
    state_dst = get_state_of_city(dst)
    if state_src and state_dst and state_src != state_dst:
        advisories.append(f"Inter-state travel ({state_src} → {state_dst}). Confirm ILP/permits as applicable.")
    if req.priority == "safest":
        advisories.append("Safest route may be longer; prioritises better roads and lower disaster risk.")

    weather_warn = _weather_warnings_for_path(path)

    alt_responses: List[RouteOptimizeResponse] = []
    alt_paths_considered: List[str] = []
    for alt_priority in (["shortest", "safest"] if req.priority == "fastest" else ["fastest"]):
        try:
            G2 = build_road_graph(priority=alt_priority, consider_weather=req.consider_weather, avoid=req.avoid_zones)
            p2 = _a_star(G2, src, dst)
            if not p2 or p2 == path:
                continue
            alt_paths_considered.append(" → ".join(p2))
            s2, d2, t2 = _segments_from_path(G2, p2, req.vehicle_type)
            alt_responses.append(RouteOptimizeResponse(
                source=src, destination=dst,
                total_distance_km=round(d2, 2),
                total_eta_minutes=round(t2, 1),
                total_cost_inr=round(d2 * cost_rate * weight_factor, 2),
                segments=s2,
                advisories=[f"Priority: {alt_priority}"],
            ))
        except Exception:
            continue

    score_breakdown: Optional[ScoreBreakdown] = None
    decision_log: Optional[DecisionLogEntry] = None
    try:
        score_breakdown = calculate_route_score(
            G, path, total_time, req.vehicle_type, req.priority
        )
        confidence = 1.0 - (score_breakdown.final_composite_score * 0.6)
        selected_path_str = " → ".join(path)
        reasons: List[str] = []
        if score_breakdown.interpretation.startswith("Excellent") or score_breakdown.interpretation.startswith("Good"):
            reasons.append(f"Route selected: {score_breakdown.interpretation.lower().split(':')[1].strip()}")
        else:
            reasons.append(score_breakdown.interpretation)
        if weather_warn:
            reasons.append(f"{len(weather_warn)} weather warning(s) factored in")
        if req.avoid_zones:
            reasons.append(f"Avoided {len(req.avoid_zones)} zone(s)")
        human_needed = score_breakdown.final_composite_score >= 0.75 or (weather_warn and len(weather_warn) >= 3)
        decision_log = log_decision(
            trigger_event=f"route_optimize:{req.priority}",
            inputs_summary={
                "source": src, "destination": dst,
                "vehicle_type": req.vehicle_type, "priority": req.priority,
                "consider_weather": req.consider_weather,
                "avoid_zones_count": len(req.avoid_zones or []),
            },
            scores_calculated={
                "composite": score_breakdown.final_composite_score,
                "travel_time_norm": score_breakdown.travel_time_norm,
                "risk_norm": score_breakdown.risk_score_norm,
            },
            routes_considered=[selected_path_str] + alt_paths_considered,
            final_route_selected=selected_path_str,
            reason=". ".join(reasons),
            confidence=confidence,
            human_in_loop_required=human_needed,
            final_vehicle=req.vehicle_type,
            alternative_option=alt_paths_considered[0] if alt_paths_considered else None,
        )
    except Exception:
        pass

    return RouteOptimizeResponse(
        source=src,
        destination=dst,
        total_distance_km=round(total_dist, 2),
        total_eta_minutes=round(total_time, 1),
        total_cost_inr=round(cost, 2),
        segments=segments,
        weather_warnings=weather_warn,
        alternative_routes=alt_responses[:2],
        advisories=advisories,
        score_breakdown=score_breakdown,
        decision_log=decision_log,
    )


SHIPMENT_STORE: Dict[str, Dict] = {}


def create_shipment(data: Dict) -> Dict:
    import uuid, datetime
    sid = data.get("shipment_id") or f"SHP-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.datetime.utcnow()
    record = {
        **data,
        "shipment_id": sid,
        "status": "created",
        "current_location": data["source"],
        "created_at": now,
        "updated_at": now,
        "progress_pct": 0,
        "checkpoints": [{"location": data["source"], "time": now.isoformat(), "status": "created"}],
    }
    SHIPMENT_STORE[sid] = record
    return record


def list_shipments(status: Optional[str] = None, city: Optional[str] = None) -> List[Dict]:
    items = list(SHIPMENT_STORE.values())
    if status:
        items = [s for s in items if s["status"] == status]
    if city:
        items = [s for s in items if s["current_location"] == city]
    return items


def get_shipment(shipment_id: str) -> Optional[Dict]:
    return SHIPMENT_STORE.get(shipment_id)


def advance_shipment(shipment_id: str) -> Optional[Dict]:
    s = SHIPMENT_STORE.get(shipment_id)
    if not s:
        return None
    import datetime
    G = build_road_graph()
    path = _a_star(G, s["source"], s["destination"]) or []
    now = datetime.datetime.utcnow()
    if s["status"] == "created":
        s["status"] = "picked_up"
    elif s["status"] == "picked_up":
        s["status"] = "in_transit"
        if len(path) > 2:
            mid = path[len(path)//2]
            s["current_location"] = mid
            s["checkpoints"].append({"location": mid, "time": now.isoformat(), "status": "in_transit"})
    elif s["status"] == "in_transit":
        s["status"] = "delivered"
        s["current_location"] = s["destination"]
        s["progress_pct"] = 100
        s["checkpoints"].append({"location": s["destination"], "time": now.isoformat(), "status": "delivered"})
    s["progress_pct"] = min(100, s["progress_pct"] + 33)
    s["updated_at"] = now
    return s


def track_shipment(shipment_id: str) -> Optional[Dict]:
    s = get_shipment(shipment_id)
    if not s:
        return None
    G = build_road_graph()
    path = _a_star(G, s["source"], s["destination"]) or []
    eta_min = None
    if s["status"] != "delivered" and s.get("current_location") and s.get("destination"):
        p2 = _a_star(G, s["current_location"], s["destination"])
        if p2:
            _, d, t = _segments_from_path(G, p2, s.get("vehicle_type", "truck"))
            eta_min = round(t, 1)
    alerts: List[str] = []
    for city in set(path):
        w = WEATHER_CURRENT.get(city)
        if w and w.get("landslide_warning"):
            alerts.append(f"Landslide warning at {city}")
        if w and w.get("flood_warning"):
            alerts.append(f"Flood warning at {city}")
    return {
        "shipment_id": shipment_id,
        "status": s["status"],
        "progress_pct": s["progress_pct"],
        "current_location": s["current_location"],
        "last_updated": s["updated_at"],
        "eta_to_destination_min": eta_min,
        "history": s["checkpoints"],
        "alerts": alerts,
    }


ROUTE_SCORE_WEIGHTS = {
    "travel_time": 0.35,
    "risk_score": 0.25,
    "road_condition_penalty": 0.15,
    "weather_penalty": 0.10,
    "terrain_penalty": 0.10,
    "vehicle_mismatch_penalty": 0.05,
    "emergency_priority_bonus": 0.10,
}


def _route_risk_components(
    G: nx.DiGraph, path: List[str], vehicle_type: str, priority: str
) -> Dict[str, float]:
    n = max(len(path) - 1, 1)
    total_dist = 0.0
    risk_sum = 0.0
    road_penalty_sum = 0.0
    weather_penalty_sum = 0.0
    terrain_penalty_sum = 0.0
    event_penalty_sum = 0.0

    for i in range(len(path) - 1):
        a, b = path[i], path[i + 1]
        ed = G[a][b]
        dist = ed["distance_km"]
        total_dist += dist
        acc = ed["accessibility_rating"]
        risk_sum += (5 - acc) * dist
        if ed.get("condition") == "poor":
            road_penalty_sum += 1.0 * dist
        else:
            road_penalty_sum += 0.2 * dist
        w_src = WEATHER_CURRENT.get(a, {})
        w_dst = WEATHER_CURRENT.get(b, {})
        wp = 0.0
        if w_src.get("landslide_warning") or w_dst.get("landslide_warning"):
            wp += 0.6
        if w_src.get("flood_warning") or w_dst.get("flood_warning"):
            wp += 0.4
        weather_penalty_sum += wp * dist
        terrain_penalty_sum += max(0.0, (ed["terrain_factor"] - 1.0)) * dist
        event_penalty_sum += max(0.0, min(ed.get("event_penalty", 1.0) - 1.0, 5.0)) * dist

    avg_risk = risk_sum / max(total_dist, 1)
    avg_road = road_penalty_sum / max(total_dist, 1)
    avg_weather = weather_penalty_sum / max(total_dist, 1)
    avg_terrain = terrain_penalty_sum / max(total_dist, 1)
    avg_event = event_penalty_sum / max(total_dist, 1)

    hilly_states = {"Meghalaya", "Sikkim", "Nagaland", "Mizoram", "Arunachal Pradesh", "Manipur"}
    dest_state = CITIES.get(path[-1], {}).get("state", "") if path else ""
    vehicle_mismatch = 0.0
    if vehicle_type == "heavy_truck" or vehicle_type == "truck":
        if dest_state in hilly_states:
            vehicle_mismatch = 0.6
    if vehicle_type == "bike":
        if avg_weather > 0.3 or avg_terrain > 0.8:
            vehicle_mismatch = 0.7

    emergency_bonus = 0.0
    if priority == "safest":
        emergency_bonus = 0.5
    elif priority == "fastest":
        emergency_bonus = 0.1

    return {
        "risk_raw": min(avg_risk / 4.0, 1.0),
        "road_raw": min(avg_road, 1.0),
        "weather_raw": min(avg_weather + avg_event * 0.5, 1.0),
        "terrain_raw": min(avg_terrain / 1.5, 1.0),
        "vehicle_mismatch_raw": min(vehicle_mismatch, 1.0),
        "emergency_bonus_raw": emergency_bonus,
        "total_distance": total_dist,
    }


def calculate_route_score(
    G: nx.DiGraph, path: List[str], total_eta_min: float,
    vehicle_type: str, priority: str
) -> ScoreBreakdown:
    comps = _route_risk_components(G, path, vehicle_type, priority)
    eta_norm = min(total_eta_min / 600.0, 1.0)
    w = ROUTE_SCORE_WEIGHTS
    final = (
        w["travel_time"] * eta_norm
        + w["risk_score"] * comps["risk_raw"]
        + w["road_condition_penalty"] * comps["road_raw"]
        + w["weather_penalty"] * comps["weather_raw"]
        + w["terrain_penalty"] * comps["terrain_raw"]
        + w["vehicle_mismatch_penalty"] * comps["vehicle_mismatch_raw"]
        - w["emergency_priority_bonus"] * comps["emergency_bonus_raw"]
    )
    final = round(max(0.0, min(final, 1.0)), 4)
    if final < 0.3:
        interpretation = "Excellent: Fast, low-risk route well-matched to vehicle"
    elif final < 0.5:
        interpretation = "Good: Balanced route with manageable constraints"
    elif final < 0.7:
        interpretation = "Moderate: Some risk factors present; drive with caution"
    else:
        interpretation = "High: Significant constraints; consider alternatives if available"

    return ScoreBreakdown(
        travel_time_norm=round(eta_norm, 4),
        risk_score_norm=round(comps["risk_raw"], 4),
        road_condition_penalty_norm=round(comps["road_raw"], 4),
        weather_penalty_norm=round(comps["weather_raw"], 4),
        terrain_penalty_norm=round(comps["terrain_raw"], 4),
        vehicle_mismatch_penalty_norm=round(comps["vehicle_mismatch_raw"], 4),
        emergency_priority_bonus_norm=round(comps["emergency_bonus_raw"], 4),
        final_composite_score=final,
        weights={k: round(v, 2) for k, v in w.items()},
        interpretation=interpretation,
    )


DECISION_LOG: List[Dict] = []


def log_decision(
    trigger_event: str,
    inputs_summary: Dict,
    scores_calculated: Dict,
    routes_considered: List[str],
    final_route_selected: Optional[str],
    reason: str,
    confidence: float,
    human_in_loop_required: bool = False,
    final_vehicle: Optional[str] = None,
    alternative_option: Optional[str] = None,
) -> DecisionLogEntry:
    now = datetime.utcnow()
    did = f"DEC-{uuid.uuid4().hex[:8].upper()}"
    entry = DecisionLogEntry(
        decision_id=did,
        trigger_event=trigger_event,
        timestamp=now,
        inputs_summary=inputs_summary,
        scores_calculated=scores_calculated,
        routes_considered=routes_considered,
        final_route_selected=final_route_selected,
        final_vehicle=final_vehicle,
        reason=reason,
        confidence=round(min(max(confidence, 0.0), 1.0), 2),
        human_in_loop_required=human_in_loop_required,
        alternative_option=alternative_option,
    )
    DECISION_LOG.append({**entry.model_dump()})
    if len(DECISION_LOG) > 500:
        DECISION_LOG.pop(0)
    return entry


def list_decisions(limit: int = 50) -> List[DecisionLogEntry]:
    out = []
    for d in reversed(DECISION_LOG[-limit:]):
        out.append(DecisionLogEntry(**d))
    return out


VEHICLE_CATALOG: List[Dict] = [
    {"vehicle_id": "VH-MINI-01", "vehicle_type": "mini_truck", "capacity_ton": 1.0,
     "terrain_capability": "medium", "max_speed_kmh": 60, "cost_per_km": 18.0,
     "features": ["small", "city_friendly", "low_cost"]},
    {"vehicle_id": "VH-HEAVY-01", "vehicle_type": "heavy_truck", "capacity_ton": 10.0,
     "terrain_capability": "poor", "max_speed_kmh": 50, "cost_per_km": 55.0,
     "features": ["high_capacity", "long_haul", "poor_in_hills"]},
    {"vehicle_id": "VH-4X4-01", "vehicle_type": "4x4", "capacity_ton": 0.5,
     "terrain_capability": "excellent", "max_speed_kmh": 70, "cost_per_km": 40.0,
     "features": ["off_road", "mountain_ready", "emergency"]},
    {"vehicle_id": "VH-AMB-01", "vehicle_type": "ambulance", "capacity_ton": 1.5,
     "terrain_capability": "excellent", "max_speed_kmh": 80, "cost_per_km": 75.0,
     "features": ["medical", "siren", "priority_right_of_way"]},
    {"vehicle_id": "VH-CAR-01", "vehicle_type": "car", "capacity_ton": 0.4,
     "terrain_capability": "medium", "max_speed_kmh": 90, "cost_per_km": 15.0,
     "features": ["passenger", "fast", "standard"]},
    {"vehicle_id": "VH-EV-01", "vehicle_type": "ev_truck", "capacity_ton": 3.0,
     "terrain_capability": "medium", "max_speed_kmh": 65, "cost_per_km": 34.0,
     "features": ["electric", "eco", "quiet"]},
]


TERRAIN_CAP_SCORE = {"poor": 0.2, "medium": 0.6, "excellent": 1.0}


def _hilly_score(origin: str, destination: str) -> float:
    hilly = {"Meghalaya", "Sikkim", "Nagaland", "Mizoram", "Arunachal Pradesh", "Manipur"}
    o_state = CITIES.get(origin, {}).get("state", "")
    d_state = CITIES.get(destination, {}).get("state", "")
    score = 0.0
    if o_state in hilly:
        score += 0.5
    if d_state in hilly:
        score += 0.5
    return min(score, 1.0)


def match_cargo_to_vehicle(req: CargoMatchRequest) -> VehicleRecommendation:
    weight_ton = req.weight_kg / 1000.0
    hilly = _hilly_score(req.origin, req.destination)

    candidates: List[Tuple[float, Dict, str]] = []
    for v in VEHICLE_CATALOG:
        reasons: List[str] = []
        score = 0.0

        capacity_ok = weight_ton <= v["capacity_ton"] * 1.1
        if not capacity_ok:
            reasons.append("insufficient_capacity")
            score -= 1.0

        terrain_match = TERRAIN_CAP_SCORE[v["terrain_capability"]]
        terrain_score = terrain_match * hilly + (1.0 - hilly) * 0.6
        score += terrain_score * 0.35
        if terrain_match >= 0.8 and hilly >= 0.5:
            reasons.append("excellent_terrain_match")

        if req.delivery_priority == "emergency":
            if v["vehicle_type"] in ("ambulance", "4x4"):
                score += 0.35
                reasons.append("emergency_designated")
            elif v["max_speed_kmh"] >= 70:
                score += 0.15
        elif req.delivery_priority == "express":
            if v["max_speed_kmh"] >= 70:
                score += 0.2
                reasons.append("fast_vehicle")

        if req.cargo_type == "medicine":
            if v["vehicle_type"] in ("ambulance", "4x4", "ev_truck"):
                score += 0.15
                reasons.append("medicine_suitable")
        elif req.cargo_type in ("food", "water") and req.delivery_priority == "emergency":
            if v["terrain_capability"] in ("excellent", "medium"):
                score += 0.1
        elif req.cargo_type == "construction":
            if v["capacity_ton"] >= 5:
                score += 0.2
                reasons.append("heavy_load_capable")

        if "refrigeration" in req.special_requirements and "refrigeration" not in v["features"]:
            score -= 0.3
        if "4x4_required" in req.special_requirements and v["terrain_capability"] != "excellent":
            score -= 0.4

        cost_norm = 1.0 - min(v["cost_per_km"] / 100.0, 1.0)
        score += cost_norm * 0.1

        suitability = max(0.0, min(score, 1.0))
        candidates.append((suitability, v, "; ".join(reasons) if reasons else "baseline_match"))

    candidates.sort(key=lambda x: -x[0])
    best_score, best_v, best_reason = candidates[0]
    alt_list = []
    for s, v, r in candidates[1:4]:
        alt_list.append({
            "vehicle_id": v["vehicle_id"],
            "vehicle_type": v["vehicle_type"],
            "capacity_ton": v["capacity_ton"],
            "terrain_capability": v["terrain_capability"],
            "suitability_score": round(s, 3),
            "notes": r,
            "cost_per_km": v["cost_per_km"],
        })

    cargo_compat = True
    if weight_ton > max(v["capacity_ton"] for v in VEHICLE_CATALOG):
        cargo_compat = False

    return VehicleRecommendation(
        recommended_vehicle=best_v["vehicle_id"],
        vehicle_type=best_v["vehicle_type"],
        capacity_ton=best_v["capacity_ton"],
        terrain_capability=best_v["terrain_capability"],
        suitability_score=round(best_score, 3),
        reason=best_reason or f"Best overall match for {req.cargo_type} shipment",
        alternatives=alt_list,
        estimated_cost_inr=round(best_v["cost_per_km"] * 200, 2),
        cargo_compatible=cargo_compat,
    )


DELIVERY_PRIORITY_BASE = {
    "medicine": 95,
    "emergency_kit": 90,
    "water": 86,
    "food": 88,
    "fuel": 70,
    "livestock": 65,
    "construction": 50,
    "normal_parcel": 40,
}


def prioritize_delivery(req: DeliveryPrioritizeRequest) -> DeliveryPriority:
    base = DELIVERY_PRIORITY_BASE.get(req.cargo_type, 40)
    factors: Dict[str, float] = {"cargo_type_base": float(base)}
    bump = 0.0

    if req.delivery_type == "urgent":
        bump += 10
        factors["urgent_delivery"] = 10.0
    elif req.delivery_type == "scheduled":
        bump += 2
        factors["scheduled"] = 2.0

    if req.emergency_active:
        bump += 8
        factors["emergency_active"] = 8.0

    med_map = {"none": 0, "low": 5, "medium": 10, "high": 18, "critical": 30}
    med_add = med_map.get(req.medical_urgency or "none", 0)
    if med_add:
        bump += med_add
        factors["medical_urgency"] = float(med_add)

    if req.flood_affected:
        bump += 7
        factors["flood_zone"] = 7.0
    if req.landslide_affected:
        bump += 7
        factors["landslide_zone"] = 7.0

    if req.affected_population_estimate:
        pop = req.affected_population_estimate
        if pop >= 10000:
            bump += 12
            factors["large_population_affected"] = 12.0
        elif pop >= 1000:
            bump += 7
            factors["medium_population_affected"] = 7.0
        elif pop >= 100:
            bump += 3
            factors["small_population_affected"] = 3.0

    final_score = int(max(0, min(100, round(base + bump))))
    if final_score >= 92:
        tier = "critical"
    elif final_score >= 78:
        tier = "high"
    elif final_score >= 60:
        tier = "medium"
    elif final_score >= 35:
        tier = "standard"
    else:
        tier = "low"

    should_bump = final_score >= 85
    human_needed = final_score >= 90 or req.medical_urgency == "critical"

    reason_parts = [f"Base priority for {req.cargo_type}={base}"]
    if bump > 0:
        reason_parts.append(f"added {round(bump)} from context factors")
    reason_parts.append(f"final tier={tier}")

    return DeliveryPriority(
        delivery_id=req.delivery_id,
        priority_score=final_score,
        priority_tier=tier,
        reason="; ".join(reason_parts),
        factors={k: round(v, 2) for k, v in factors.items()},
        should_bump_normal_deliveries=should_bump,
        human_approval_recommended=human_needed,
    )


def what_if_simulation(req: WhatIfScenarioRequest) -> WhatIfScenarioResponse:
    num_v = req.simulate_vehicles or 5
    num_d = req.simulate_deliveries or 20

    blocked_cities = set(req.blocked_cities or [])
    if req.blocked_road_from:
        blocked_cities.add(req.blocked_road_from)
    if req.blocked_road_to:
        blocked_cities.add(req.blocked_road_to)

    hilly_states = {"Meghalaya", "Sikkim", "Nagaland", "Mizoram", "Arunachal Pradesh", "Manipur"}
    severity_base = 0.0
    if req.scenario_type == "landslide":
        severity_base += 0.7
    elif req.scenario_type == "flood":
        severity_base += 0.8
    elif req.scenario_type == "road_block":
        severity_base += 0.5
    elif req.scenario_type == "weather_deterioration":
        severity_base += 0.4

    if req.weather_downgrade:
        severity_base += 0.15
    severity_base += len(blocked_cities) * 0.08

    all_cities = list(CITIES.keys())
    random.seed(hash(req.scenario_type + str(blocked_cities)) & 0xFFFFFFFF)

    affected_ratio = min(0.9, severity_base)
    affected_v = int(num_v * affected_ratio) + (1 if severity_base > 0.4 else 0)
    affected_d = int(num_d * affected_ratio) + (1 if severity_base > 0.4 else 0)
    emergency_affected = max(0, min(affected_d // 5 + (1 if severity_base > 0.6 else 0), affected_d))

    delay_min = int(round(15 + severity_base * 80 + len(blocked_cities) * 6))

    reroutes: List[Dict] = []
    for i in range(min(num_v, 5)):
        origin = random.choice(all_cities)
        dest = random.choice([c for c in all_cities if c != origin])
        orig_route = f"Route-{chr(65 + i % 3)}"
        new_route = f"Route-{chr(68 + i % 3)}"
        reroutes.append({
            "vehicle": f"Vehicle {i + 1:02d}",
            "original_route": orig_route,
            "original_eta_min": random.randint(90, 240),
            "new_route": new_route,
            "new_eta_min": random.randint(120, 360),
            "origin": origin,
            "destination": dest,
            "delay_added_min": random.randint(15, delay_min),
        })

    sev_label = "low"
    if severity_base >= 0.8:
        sev_label = "critical"
    elif severity_base >= 0.6:
        sev_label = "high"
    elif severity_base >= 0.35:
        sev_label = "medium"

    summary_parts = [
        f"Scenario {req.scenario_type} triggered with {len(blocked_cities)} blocked city nodes.",
        f"Estimated impact: {affected_v}/{num_v} vehicles and {affected_d}/{num_d} deliveries rerouted.",
        f"Average expected delay: {delay_min} min.",
    ]
    if emergency_affected > 0:
        summary_parts.append(f"{emergency_affected} emergency deliveries affected — prioritize human review.")

    recs: List[str] = []
    if severity_base >= 0.6:
        recs.append("Activate emergency operations center; notify DDMA / district control room.")
    if emergency_affected > 0:
        recs.append("Assign 4x4 / ambulance fleet to emergency medicine & water first.")
    recs.append("Pre-emptively flag driver advisory SMS for affected routes.")
    recs.append("Prepare alternate routes via unaffected state highways as contingency.")
    if len(blocked_cities) > 0:
        recs.append(f"Confirm clearance status for: {', '.join(sorted(blocked_cities))}.")

    return WhatIfScenarioResponse(
        scenario=req.scenario_type,
        severity=sev_label,
        affected_vehicles=affected_v,
        affected_deliveries=affected_d,
        emergency_deliveries_affected=emergency_affected,
        expected_additional_delay_minutes=delay_min,
        reroutes=reroutes,
        summary=" ".join(summary_parts),
        recommendations=recs,
    )

