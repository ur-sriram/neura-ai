from typing import List, Dict, Optional
import networkx as nx

from app.data.ner_data import (
    CITIES, ROAD_NETWORK, ACCESSIBILITY_POIS, HOSPITALS,
    get_city_coords, WEATHER_CURRENT, get_weather_zone_of_city,
)
from app.models.schemas import (
    AccessibilityScoreRequest, AccessibilityScoreResponse, AccessibilityDimension,
    AccessibleRouteRequest, AccessibleRoute, AccessibleRouteResponse,
    POIFilterRequest, POIItem, POIListResponse,
    AccessibilityScore100,
)


def _rating_from_score(score: float) -> str:
    if score >= 9:
        return "A+"
    if score >= 8:
        return "A"
    if score >= 6.5:
        return "B"
    if score >= 5:
        return "C"
    if score >= 3:
        return "D"
    return "F"


def score_city(city: str) -> Optional[AccessibilityScoreResponse]:
    if city not in CITIES:
        return None
    cdata = CITIES[city]
    state = cdata["state"]

    side_walk = 4.5 if cdata["population"] > 500000 else 3.5 if cdata["population"] > 100000 else 2.0
    public_transport = 4.0 if (cdata["airport"] or cdata["railhead"]) else 2.5
    slope_hilly_states = ["Meghalaya", "Sikkim", "Nagaland", "Mizoram", "Arunachal Pradesh", "Manipur"]
    terrain = 2.0 if state in slope_hilly_states else 5.5
    services_access = 3.5
    pois_in_city = [p for p in ACCESSIBILITY_POIS if p["city"] == city]
    if pois_in_city:
        services_access = sum(p["rating"] for p in pois_in_city) / len(pois_in_city) * 1.25
    emergency_access = 4.0 if any(h["city"] == city and h["tertiary"] for h in HOSPITALS) else 2.5
    weather = 3.0
    w = WEATHER_CURRENT.get(city)
    if w:
        if w.get("landslide_warning") or w.get("flood_warning"):
            weather = 1.5
        else:
            weather = 4.0

    weights_ordered = [
        ("sidewalks_pedestrian", 0.22),
        ("public_transport", 0.18),
        ("terrain_slope", 0.20),
        ("public_services", 0.20),
        ("emergency_health", 0.12),
        ("current_weather", 0.08),
    ]
    scores_raw = [
        round(min(side_walk, 10), 2),
        round(min(public_transport, 10), 2),
        round(min(terrain, 10), 2),
        round(min(services_access, 10), 2),
        round(min(emergency_access, 10), 2),
        round(min(weather, 10), 2),
    ]
    dims = [
        AccessibilityDimension(name="Sidewalks & Pedestrian Infrastructure", score=scores_raw[0],
                               notes="Estimate based on population; large cities have better pavement"),
        AccessibilityDimension(name="Public Transport Access", score=scores_raw[1],
                               notes=f"Airport={cdata['airport']}, Railhead={cdata['railhead']}"),
        AccessibilityDimension(name="Terrain & Slope Friendliness", score=scores_raw[2],
                               notes=f"{state}: {'Hilly, high slopes require more infrastructure' if state in slope_hilly_states else 'Plains-friendly'}"),
        AccessibilityDimension(name="Public Services Accessibility", score=scores_raw[3],
                               notes=f"Based on {len(pois_in_city)} POIs rated in database"),
        AccessibilityDimension(name="Emergency & Health Access", score=scores_raw[4],
                               notes="Tertiary hospital presence and helipads considered"),
        AccessibilityDimension(name="Current Weather Impact", score=scores_raw[5],
                               notes=("Warning active" if (w and (w.get("landslide_warning") or w.get("flood_warning"))) else "Favourable")),
    ]
    overall = sum(s * w for s, (_, w) in zip(scores_raw, weights_ordered))
    overall = round(min(overall, 10), 2)

    recs: List[str] = []
    if state in slope_hilly_states:
        recs.append("Prefer pre-booked accessible taxi; many public buses are difficult for wheelchairs on steep routes")
    if cdata["airport"]:
        recs.append("Airports in NER generally provide wheelchair assistance; notify airline in advance")
    if w and w.get("landslide_warning"):
        recs.append("Landslide warning active — travel only if essential, carry water/emergency kit")
    if not pois_in_city:
        recs.append("Limited accessibility-rated POIs in dataset; consider local inputs for specific venues")
    if not recs:
        recs.append("Overall conditions suitable for standard accessibility needs")

    nearby_pois = [
        {
            "name": p["name"],
            "type": p["type"],
            "wheelchair": p["wheelchair"],
            "rating": p["rating"],
            "distance_km_est": 2.5,
            "services": p["services"],
        }
        for p in pois_in_city[:5]
    ]

    wheelchair = overall >= 5.0 and (state not in slope_hilly_states or overall >= 6.5)

    score_100_detail: Optional[AccessibilityScore100] = None
    try:
        score_100_detail = calculate_accessibility_score_100(city)
    except Exception:
        pass

    return AccessibilityScoreResponse(
        location=city,
        overall_score=overall,
        rating=_rating_from_score(overall),
        dimensions=dims,
        wheelchair_accessible=wheelchair,
        recommendations=recs,
        nearby_accessible_pois=nearby_pois,
        score_100_detail=score_100_detail,
    )


ACC100_WEATHER_W = 0.20
ACC100_LANDSLIDE_W = 0.22
ACC100_ROAD_W = 0.20
ACC100_TRAFFIC_W = 0.10
ACC100_TERRAIN_W = 0.28


def calculate_accessibility_score_100(city: str) -> AccessibilityScore100:
    cdata = CITIES.get(city)
    if not cdata:
        raise ValueError(f"Unknown city {city}")
    state = cdata["state"]
    zone = get_weather_zone_of_city(city) or {}

    w = WEATHER_CURRENT.get(city, {})
    weather_risk_pct = 0
    if w.get("landslide_warning"):
        weather_risk_pct += 50
    if w.get("flood_warning"):
        weather_risk_pct += 40
    if w.get("condition") == "Rain":
        weather_risk_pct += 20
    if w.get("humidity", 50) >= 90:
        weather_risk_pct += 10
    weather_risk_pct = min(weather_risk_pct, 100)
    weather_component = int(round(100 - weather_risk_pct))

    landslide_base = zone.get("landslide_risk", 0) * 100
    monsoon = zone.get("monsoon_risk", 0) * 40
    hilly = {"Meghalaya", "Sikkim", "Nagaland", "Mizoram", "Arunachal Pradesh", "Manipur"}
    if state in hilly:
        landslide_base += 25
    if w.get("landslide_warning"):
        landslide_base += 50
    landslide_risk_pct = min(landslide_base + monsoon, 100)
    landslide_component = int(round(100 - landslide_risk_pct))

    road_segments_near = [r for r in ROAD_NETWORK if r[0] == city or r[1] == city]
    if road_segments_near:
        acc_ratings = [r[2]["accessibility_rating"] for r in road_segments_near]
        conds = [r[2].get("condition", "fair") for r in road_segments_near]
        avg_acc = sum(acc_ratings) / len(acc_ratings)
        road_pct = (avg_acc / 5) * 100
        if "poor" in conds:
            road_pct -= 15
        poor_ratio = conds.count("poor") / max(len(conds), 1)
        if poor_ratio >= 0.5:
            road_pct -= 15
        road_component = int(round(max(0, min(100, road_pct))))
    else:
        road_component = 40

    pop = cdata.get("population", 100000)
    if pop >= 1000000:
        traffic_component = 55
    elif pop >= 300000:
        traffic_component = 70
    elif pop >= 100000:
        traffic_component = 85
    else:
        traffic_component = 95

    slope_hilly = {"Meghalaya", "Sikkim", "Nagaland", "Mizoram", "Arunachal Pradesh", "Manipur"}
    if state in slope_hilly:
        terrain_raw = zone.get("landslide_risk", 0.3)
        terrain_pct = 35 - terrain_raw * 30
        if state in ("Sikkim", "Arunachal Pradesh"):
            terrain_pct -= 10
        terrain_component = int(round(max(0, min(100, terrain_pct + 15))))
    else:
        terrain_component = int(round(75 + (1 - zone.get("flood_risk", 0.2)) * 15))

    wsum = (
        ACC100_WEATHER_W * weather_component
        + ACC100_LANDSLIDE_W * landslide_component
        + ACC100_ROAD_W * road_component
        + ACC100_TRAFFIC_W * traffic_component
        + ACC100_TERRAIN_W * terrain_component
    )
    score_100 = int(round(max(0, min(100, wsum))))

    if score_100 >= 80:
        tier = "Highly Accessible"
    elif score_100 >= 50:
        tier = "Moderate"
    elif score_100 >= 30:
        tier = "Difficult"
    else:
        tier = "Critical"

    vehicle_suitability = {}
    base_suit = score_100
    vehicle_suitability["heavy_truck"] = int(max(0, min(100, base_suit - (25 if state in slope_hilly else 5))))
    vehicle_suitability["mini_truck"] = int(max(0, min(100, base_suit - (10 if state in slope_hilly else 0))))
    vehicle_suitability["4x4"] = int(max(0, min(100, base_suit + (15 if state in slope_hilly else 5))))
    vehicle_suitability["ambulance"] = int(max(0, min(100, base_suit + 5)))
    vehicle_suitability["bike"] = int(max(0, min(100, base_suit - 15 if weather_component < 50 else 0)))

    factors = {
        "weights": {
            "weather_risk": ACC100_WEATHER_W,
            "landslide_risk": ACC100_LANDSLIDE_W,
            "road_condition": ACC100_ROAD_W,
            "traffic": ACC100_TRAFFIC_W,
            "terrain": ACC100_TERRAIN_W,
        },
        "state": state,
        "zone": zone.get("zone_name"),
        "weather_condition": w.get("condition", "Unknown"),
        "landslide_warning_active": w.get("landslide_warning", False),
        "flood_warning_active": w.get("flood_warning", False),
        "hilly_state": state in slope_hilly,
        "road_segments_analyzed": len(road_segments_near),
    }

    return AccessibilityScore100(
        location=city,
        score_100=score_100,
        tier=tier,
        weather_risk_component=weather_component,
        landslide_component=landslide_component,
        road_condition_component=road_component,
        traffic_component=traffic_component,
        terrain_component=terrain_component,
        vehicle_suitability=vehicle_suitability,
        factors=factors,
    )


def score_location(req: AccessibilityScoreRequest) -> Optional[AccessibilityScoreResponse]:
    if req.city:
        return score_city(req.city)
    if req.route_source and req.route_destination:
        result = score_city(req.route_source)
        if result:
            result.location = f"{req.route_source} → {req.route_destination}"
            result.recommendations.append(f"Also check destination city score: {req.route_destination}")
        return result
    return None


def _build_access_graph(mobility_type: str, min_rating: int) -> nx.DiGraph:
    G = nx.DiGraph()
    for src, dst, attr in ROAD_NETWORK:
        acc = attr["accessibility_rating"]
        if acc < min_rating:
            continue
        dist = attr["distance_km"]
        terrain = attr["terrain_factor"]
        slope_penalty = 1.0
        if mobility_type == "wheelchair":
            slope_penalty = terrain ** 2
        elif mobility_type == "walker":
            slope_penalty = terrain ** 1.5
        elif mobility_type == "stroller":
            slope_penalty = terrain * 1.2
        weight = dist * slope_penalty
        if attr.get("condition") == "poor":
            weight *= 1.5
        G.add_edge(src, dst, **attr, weight=weight)
        G.add_edge(dst, src, **attr, weight=weight)
    return G


def _shortest_path(G: nx.DiGraph, s: str, t: str) -> Optional[List[str]]:
    try:
        return nx.shortest_path(G, source=s, target=t, weight="weight")
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


def _pitstops_along(path: List[str]) -> List[Dict]:
    stops: List[Dict] = []
    for city in path:
        for p in ACCESSIBILITY_POIS:
            if p["city"] == city and p["wheelchair"] and p["rating"] >= 3:
                stops.append({
                    "city": city,
                    "name": p["name"],
                    "type": p["type"],
                    "rating": p["rating"],
                    "services": p["services"][:3],
                })
                break
    return stops


def find_accessible_routes(req: AccessibleRouteRequest) -> AccessibleRouteResponse:
    src, dst = req.source, req.destination
    if src not in CITIES or dst not in CITIES:
        raise ValueError(f"Unknown city. Available: {sorted(CITIES.keys())}")

    G_standard = _build_access_graph(req.mobility_type, req.min_rating)
    path_standard = _shortest_path(G_standard, src, dst)

    best: Optional[AccessibleRoute] = None
    warnings: List[str] = []
    if path_standard:
        total_dist = 0.0
        acc_score = 0.0
        steep = []
        n = 0
        for i in range(len(path_standard) - 1):
            a, b = path_standard[i], path_standard[i+1]
            ed = G_standard[a][b]
            total_dist += ed["distance_km"]
            acc_score += ed["accessibility_rating"]
            n += 1
            if ed["terrain_factor"] >= 1.9:
                steep.append(f"{a}→{b} (factor {ed['terrain_factor']})")
        avg_acc = acc_score / max(n, 1)
        total_time = (total_dist / 25) * 60 if req.mobility_type == "wheelchair" else (total_dist / 40) * 60
        best = AccessibleRoute(
            waypoints=path_standard,
            total_distance_km=round(total_dist, 2),
            accessibility_score=round(avg_acc, 2),
            steep_segments=steep,
            pitstops=_pitstops_along(path_standard),
            eta_min=round(total_time, 1),
        )
    else:
        warnings.append(f"No route meets min_rating={req.min_rating} for {req.mobility_type}. Consider relaxing min_rating.")

    alternatives: List[AccessibleRoute] = []
    for lower_rating in (max(1, req.min_rating - 1), max(1, req.min_rating - 2)):
        if lower_rating == req.min_rating:
            continue
        try:
            G_alt = _build_access_graph(req.mobility_type, lower_rating)
            p_alt = _shortest_path(G_alt, src, dst)
            if not p_alt or (best and p_alt == best.waypoints):
                continue
            d, acc, steep2 = 0.0, 0.0, []
            m = 0
            for i in range(len(p_alt) - 1):
                a, b = p_alt[i], p_alt[i+1]
                ed = G_alt[a][b]
                d += ed["distance_km"]
                acc += ed["accessibility_rating"]
                m += 1
                if ed["terrain_factor"] >= 1.9:
                    steep2.append(f"{a}→{b}")
            t = (d / 25) * 60 if req.mobility_type == "wheelchair" else (d / 40) * 60
            alternatives.append(AccessibleRoute(
                waypoints=p_alt,
                total_distance_km=round(d, 2),
                accessibility_score=round(acc / max(m, 1), 2),
                steep_segments=steep2,
                pitstops=_pitstops_along(p_alt),
                eta_min=round(t, 1),
            ))
        except Exception:
            continue
        if len(alternatives) >= 2:
            break

    return AccessibleRouteResponse(
        source=src,
        destination=dst,
        best_route=best,
        alternatives=alternatives,
        warnings=warnings,
    )


def list_pois(f: POIFilterRequest) -> POIListResponse:
    items: List[POIItem] = []
    seen_names = set()
    for p in ACCESSIBILITY_POIS:
        if f.city and p["city"] != f.city:
            continue
        if f.state:
            cd = CITIES.get(p["city"])
            if not cd or cd["state"] != f.state:
                continue
        if f.type and f.type != "all" and p["type"] != f.type:
            continue
        if f.wheelchair_only and not p["wheelchair"]:
            continue
        if p["rating"] < f.min_rating:
            continue
        key = p["name"] + "|" + p["city"]
        if key in seen_names:
            continue
        seen_names.add(key)
        cd = CITIES.get(p["city"], {})
        items.append(POIItem(
            name=p["name"],
            type=p["type"],
            city=p["city"],
            state=cd.get("state", "Unknown"),
            lat=p["lat"],
            lon=p["lon"],
            wheelchair=p["wheelchair"],
            rating=p["rating"],
            services=p["services"],
        ))
    if f.type in ("all", "hospital"):
        for h in HOSPITALS:
            if f.city and h["city"] != f.city:
                continue
            if f.state:
                cd = CITIES.get(h["city"])
                if not cd or cd["state"] != f.state:
                    continue
            if h["accessibility_rating"] < f.min_rating:
                continue
            if f.wheelchair_only and h["accessibility_rating"] < 3:
                continue
            key = h["name"] + "|" + h["city"]
            if key in seen_names:
                continue
            seen_names.add(key)
            cd = CITIES.get(h["city"], {})
            svcs = []
            if h["emergency"]:
                svcs.append("emergency_24x7")
            if h["tertiary"]:
                svcs.append("tertiary_care")
            if h["helipad"]:
                svcs.append("helipad")
            items.append(POIItem(
                name=h["name"],
                type="hospital",
                city=h["city"],
                state=cd.get("state", "Unknown"),
                lat=h["lat"],
                lon=h["lon"],
                wheelchair=h["accessibility_rating"] >= 3,
                rating=h["accessibility_rating"],
                services=svcs,
            ))
    items.sort(key=lambda x: -x.rating)
    return POIListResponse(count=len(items), items=items)
