import uuid
import random
from typing import List, Dict, Optional
from datetime import datetime, timedelta

from app.data.ner_data import CITIES, HOSPITALS, WEATHER_CURRENT, WEATHER_ZONES, STATES, COMMUNITY_HUBS
from app.models.schemas import (
    EmergencyAlert, EmergencyAlertFilter, EmergencyAlertListResponse,
    EvacuateRequest, EvacuationRoute, EvacuateResponse,
)
from app.services.logistics_service import build_road_graph, _segments_from_path


ALERT_SEED: List[Dict] = []


def _seed_alerts_if_needed() -> None:
    if ALERT_SEED:
        return
    now = datetime.utcnow()
    base_alerts = [
        {
            "type": "landslide", "severity": "high", "state": "Meghalaya",
            "cities_affected": ["Shillong", "Cherrapunji", "Nongpoh"],
            "headline": "Landslide Warning: Shillong–Cherrapunji Road (NH-40 bypass)",
            "description": "Heavy rainfall (91% humidity, continuous rain) on the Shillong plateau. Risk of debris fall on steep stretches; NH-40 between Shillong–Cherrapunji and Jowai roads. Monitor DDMA Meghalaya monitoring 24x7.",
            "advice": ["Avoid non-essential travel after sunset; carry chains + shovel; follow @MeghalayaPolice updates."],
            "active": True, "duration_h": 48,
        },
        {
            "type": "flood", "severity": "medium", "state": "Assam",
            "cities_affected": ["Pasighat", "Silchar", "Agartala"],
            "headline": "Flood Watch: Barak Valley & Upper Siang Rise",
            "description": "Sustained heavy rain in Upper Siang and Barak basins. Water levels rising in Barak (Silchar) and Siang (Pasighat). Low-lying areas at risk of inundation.",
            "advice": ["Move to higher ground if advised; avoid river-bank transit; keep documents sealed; ready emergency bag."],
            "active": True, "duration_h": 36,
        },
        {
            "type": "landslide", "severity": "high", "state": "Sikkim",
            "cities_affected": ["Gangtok", "Rangpo", "Namchi"],
            "headline": "Landslide Advisory: NH-10 (Siliguri–Gangtok) Risk",
            "description": "Teesta catchment landslide risk high during monsoon; rockfall & mud reported between Rangpo–Gangtok stretch. Fog adds to reduced visibility.",
            "advice": ["Plan trips in daylight only; follow BRO traffic updates; avoid night travel."],
            "active": True, "duration_h": 60,
        },
        {
            "type": "landslide", "severity": "medium", "state": "Arunachal Pradesh",
            "cities_affected": ["Itanagar", "Bomdila", "Ziro"],
            "headline": "Landslide Risk: Itanagar–Bomdila Axis",
            "description": "Pre-monsoon + monsoon overlap triggers on NH-229 Tawang road. Narrow two-way, steep faces. Rockfall events reported.",
            "advice": ["Convoy travel advised; carry 2L extra water/food; check BRO helipad use."],
            "active": True, "duration_h": 72,
        },
        {
            "type": "landslide", "severity": "medium", "state": "Mizoram",
            "cities_affected": ["Aizawl", "Lunglei", "Serchhip"],
            "headline": "Vertical-cut Landslide Watch: NH-54 Corridor",
            "description": "Lushai hills vertical road cuts — post-rain slips. Aizawl→Lunglei NH-54 section monitored.",
            "advice": ["Inspect overhead cut faces; avoid parking under overhangs; have alternate route via Champhai side if possible."],
            "active": True, "duration_h": 48,
        },
        {
            "type": "road_block", "severity": "low", "state": "Nagaland",
            "cities_affected": ["Kohima", "Mokokchung"],
            "headline": "Intermittent Road Block: NH-61 Kohima–Mokokchung",
            "description": "Minor slips and uprooted trees slow traffic NH-61 section. Local administration at work.",
            "advice": ["Check with Nagaland traffic for 1-day delay expected; carry snacks/water for hold-ups."],
            "active": True, "duration_h": 12,
        },
    ]
    for a in base_alerts:
        ALERT_SEED.append({
            "alert_id": f"ALT-{uuid.uuid4().hex[:7].upper()}",
            "issued_at": now - timedelta(hours=random.randint(1, 12)),
            "expires_at": now + timedelta(hours=a.get("duration_h", a.get("duration_hours", 24))),
            **a,
        })


def list_alerts(f: EmergencyAlertFilter) -> EmergencyAlertListResponse:
    _seed_alerts_if_needed()
    items: List[EmergencyAlert] = []
    for a in ALERT_SEED:
        if f.active_only and not a["active"]:
            continue
        if f.state and a["state"] != f.state:
            continue
        if f.severity and a["severity"] != f.severity:
            continue
        if f.type and a["type"] != f.type:
            continue
        items.append(EmergencyAlert(**a))
    items.sort(key=lambda e: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(e.severity, 9))
    return EmergencyAlertListResponse(count=len(items), items=items)


def _rank_evacuation_destination(from_city: str, urgency: str) -> str:
    from_data = CITIES.get(from_city)
    if not from_data:
        return "Guwahati"
    state = from_data["state"]
    priority = {
        "Assam": "Guwahati",
        "Meghalaya": "Guwahati",
        "Manipur": "Imphal",
        "Tripura": "Agartala",
        "Mizoram": "Aizawl",
        "Nagaland": "Dimapur",
        "Arunachal Pradesh": "Itanagar",
        "Sikkim": "Siliguri",
    }
    default = priority.get(state, "Guwahati")
    if urgency == "immediate" and from_city == default:
        return "Guwahati"
    return default


def _build_shelter_list(cities: List[str]) -> List[Dict]:
    out: List[Dict] = []
    for c in cities:
        for h in HOSPITALS:
            if h["city"] == c:
                out.append({"name": h["name"], "city": c, "type": "hospital",
                          "capacity_beds": h["beds"], "emergency": h["emergency"], "helipad": h["helipad"]})
        for hub in COMMUNITY_HUBS:
            if hub["city"] == c and any(s in hub["services"] for s in ["shelter_list", "evacuation_route", "rescue_coordinate"]):
                out.append({"name": hub["name"], "city": c, "type": "community_hub",
                          "capacity_beds": 150, "emergency": True, "helipad": False})
    if not out:
        for c in cities:
            out.append({"name": f"{c} Community Hall (temporary)", "city": c, "type": "government_shelter",
                        "capacity_beds": 200, "emergency": True, "helipad": False})
    return out[:10]


def _weather_for_route(path: List[str]) -> str:
    risk_parts = []
    for c in set(path):
        w = WEATHER_CURRENT.get(c)
        if not w:
            continue
        if w.get("landslide_warning"):
            risk_parts.append(f"landslide@{c}")
        if w.get("flood_warning"):
            risk_parts.append(f"flood@{c}")
    return ", ".join(risk_parts) or "clear"


def plan_evacuation(req: EvacuateRequest) -> EvacuateResponse:
    from_city = req.from_city
    if from_city not in CITIES:
        raise ValueError(f"Unknown from_city. Available: {sorted(CITIES.keys())}")

    to_city = req.to_city or _rank_evacuation_destination(from_city, req.urgency)

    try:
        G = build_road_graph(priority="safest", consider_weather=True, avoid=[])
        import networkx as nx
        paths = []
        try:
            paths = list(nx.all_simple_paths(G, source=from_city, target=to_city, cutoff=6))
        except Exception:
            paths = []
        if not paths:
            try:
                sp = nx.shortest_path(G, source=from_city, target=to_city, weight="weight")
                paths = [sp]
            except Exception:
                paths = []
    except Exception:
        paths = []

    routes_ev: List[EvacuationRoute] = []
    special_accessible_need = any(s in req.special_needs for s in ["wheelchair", "elderly", "medical"])
    for pidx, path in enumerate(paths[:3]):
        segs, d, t = _segments_from_path(G, path, "bus")
        accessible = True
        for s in segs:
            if s.accessibility_rating < 2:
                accessible = False
        cap = 300 if pidx == 0 else 180
        routes_ev.append(EvacuationRoute(
            route=path,
            distance_km=round(d, 2),
            eta_min=round(t, 1) if req.urgency != "immediate" else round(t * 1.15, 1),
            capacity=cap,
            shelters=_build_shelter_list(path),
            accessible=accessible,
            block_risk=_weather_for_route(path),
        ))
    primary = routes_ev[0] if routes_ev else None
    backups = routes_ev[1:]

    if not primary:
        primary = EvacuationRoute(
            route=[from_city, to_city],
            distance_km=200.0,
            eta_min=420.0,
            capacity=200,
            shelters=_build_shelter_list([from_city, to_city]),
            accessible=not special_accessible_need,
            block_risk="unknown (offline fallback",
        )

    emergency_contacts = [
        {"name": "National Emergency (India)", "phone": "112"},
        {"name": "NER Disaster Response Force (NDRF) 10 BN", "phone": "9711077372"},
        {"name": "State Emergency Control Room (Assam)", "phone": "+91-361-2237270"},
        {"name": "Indian Medical Emergency", "phone": "108"},
        {"name": "Women Helpline", "phone": "1091"},
        {"name": "Child Helpline", "phone": "1098"},
    ]
    checklists = [
        "Confirm assembly point & family meeting spot fixed",
        "IDs + cash + photocopies of documents packed",
        "Emergency medicines, water, dry ration (min 3 days)",
        "Mobile + powerbank + local SIM backup",
        "Flashlight, whistle, first-aid, masks",
        "Pet carriers / mobility aids charged & accessible transport booked",
        "Turn off gas / electricity mains at main switch",
        "Inform neighbours / local ward member before leaving",
    ]
    if "wheelchair" in req.special_needs:
        checklists.append("Confirm accessible vehicle & ramp/portable ramp loaded; confirm destination has ramps.")
    if "elderly" in req.special_needs:
        checklists.append("Carry blankets; assign family/buddy per elderly.")
    if "medical" in req.special_needs:
        checklists.append("Carry prescriptions, cooler & medical file + meds for 7 days.")
    if "children" in req.special_needs:
        checklists.append("Formula/diapers, favourite toys; buddy assigned.")
    if "pets" in req.special_needs:
        checklists.append("Pet food, water, leash/crate; confirm shelter accepts pets.")
    if req.urgency == "immediate":
        checklists.insert(0, "URGENT: Leave NOW with grab-bag only; take medicines, go to nearest assembly / pickup.")
    return EvacuateResponse(
        from_city=from_city,
        recommended_city=to_city,
        primary_route=primary,
        backup_routes=backups,
        shelter_list=_build_shelter_list([from_city, to_city] + (primary.route if primary else [])),
        emergency_contacts=emergency_contacts,
        checklists=checklists,
    )
