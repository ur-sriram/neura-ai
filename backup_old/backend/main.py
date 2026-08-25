from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import math
import random
from datetime import datetime, timezone
import httpx
import copy

app = FastAPI(title="NE-Setu API", version="3.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-Memory State ──────────────────────────────────────────────────────────

lns_state = {"version": 1, "segments": {}}
active_connections: List[WebSocket] = []
community_reports: List[Dict] = []
emergency_requests: List[Dict] = []
decision_log: List[Dict] = []
active_deliveries: List[Dict] = []
active_vehicles: List[Dict] = []
cascade_history: List[Dict] = []

# ─── NE India Location Database ──────────────────────────────────────────────

LOCATIONS = {
    "Guwahati": {"lat": 26.1445, "lon": 91.7362, "type": "city", "state": "Assam"},
    "Shillong": {"lat": 25.5788, "lon": 91.8800, "type": "city", "state": "Meghalaya"},
    "Jowai": {"lat": 25.4455, "lon": 92.2135, "type": "city", "state": "Meghalaya"},
    "Silchar": {"lat": 24.8333, "lon": 92.7789, "type": "city", "state": "Assam"},
    "Dimapur": {"lat": 25.9091, "lon": 93.7264, "type": "city", "state": "Nagaland"},
    "Kohima": {"lat": 25.6748, "lon": 94.1086, "type": "city", "state": "Nagaland"},
    "Imphal": {"lat": 24.8170, "lon": 93.9368, "type": "city", "state": "Manipur"},
    "Aizawl": {"lat": 23.7307, "lon": 92.7173, "type": "city", "state": "Mizoram"},
    "Agartala": {"lat": 23.8315, "lon": 91.2868, "type": "city", "state": "Tripura"},
    "Itanagar": {"lat": 27.0844, "lon": 93.6053, "type": "city", "state": "Arunachal Pradesh"},
    "Jorhat": {"lat": 26.7509, "lon": 94.2037, "type": "city", "state": "Assam"},
    "Tezpur": {"lat": 26.6338, "lon": 92.7926, "type": "city", "state": "Assam"},
    "Bongaigaon": {"lat": 26.4769, "lon": 90.5586, "type": "city", "state": "Assam"},
    "Goalpara": {"lat": 26.1682, "lon": 90.6290, "type": "city", "state": "Assam"},
    "Nongpoh": {"lat": 25.9015, "lon": 91.8690, "type": "town", "state": "Meghalaya"},
    "Mawlai": {"lat": 25.6046, "lon": 91.8897, "type": "town", "state": "Meghalaya"},
    "Cherrapunji": {"lat": 25.2841, "lon": 91.7224, "type": "village", "state": "Meghalaya"},
    "Dawki": {"lat": 25.1977, "lon": 92.0161, "type": "border", "state": "Meghalaya"},
    "Umroi": {"lat": 25.7000, "lon": 91.9500, "type": "town", "state": "Meghalaya"},
    "Byrnihat": {"lat": 26.0004, "lon": 91.8858, "type": "town", "state": "Meghalaya"},
}

# ─── Road Network ─────────────────────────────────────────────────────────────

ROAD_SEGMENTS = {
    "NH-6-GS": {
        "name": "NH-6: Guwahati–Shillong National Highway",
        "from": [91.7362, 26.1445], "to": [91.8800, 25.5788],
        "via": [[91.8858, 26.0004], [91.8690, 25.9015]],
        "distance_km": 105, "surface": "paved", "max_class": "heavy_truck",
        "bridge_limit_tonnes": 40, "status": "OPEN",
        "landslide_risk": 0.35, "flood_risk": 0.20,
        "notes": "Main highway. Prone to landslides between Nongpoh and Shillong during monsoon."
    },
    "R-114-UMROI": {
        "name": "R-114: Umroi Alternate Hill Route",
        "from": [91.7362, 26.1445], "to": [91.8800, 25.5788],
        "via": [[91.9500, 25.8000]],
        "distance_km": 128, "surface": "mixed", "max_class": "4x4",
        "bridge_limit_tonnes": 10, "status": "OPEN",
        "landslide_risk": 0.65, "flood_risk": 0.15,
        "notes": "Alternate. 4x4/motorbike only during monsoon. Narrow roads, no night travel advised."
    },
    "NH-6-SJ": {
        "name": "NH-6: Shillong–Jowai Ridge Road",
        "from": [91.8800, 25.5788], "to": [92.2135, 25.4455],
        "via": [],
        "distance_km": 64, "surface": "paved", "max_class": "heavy_truck",
        "bridge_limit_tonnes": 25, "status": "OPEN",
        "landslide_risk": 0.45, "flood_risk": 0.10,
        "notes": "Ridge road. High fog and hairpin bends. Occasionally blocked by rockfalls."
    },
    "BYRNIHAT-SHL": {
        "name": "Byrnihat–Shillong Back Road",
        "from": [91.8858, 26.0004], "to": [91.8800, 25.5788],
        "via": [],
        "distance_km": 60, "surface": "paved", "max_class": "car",
        "bridge_limit_tonnes": 8, "status": "OPEN",
        "landslide_risk": 0.25, "flood_risk": 0.30,
        "notes": "Good during dry season. Bridge at km 32 has 8T limit — no trucks."
    },
    "NH-6-JOWAI-SCL": {
        "name": "NH-6: Jowai–Silchar Highway",
        "from": [92.2135, 25.4455], "to": [92.7789, 24.8333],
        "via": [[92.3683, 25.1052]],
        "distance_km": 150, "surface": "paved", "max_class": "heavy_truck",
        "bridge_limit_tonnes": 40, "status": "OPEN",
        "landslide_risk": 0.40, "flood_risk": 0.30,
        "notes": "Critical supply route for Barak Valley."
    },
    "NH-29-DIM-KOH": {
        "name": "NH-29: Dimapur–Kohima",
        "from": [93.7264, 25.9091], "to": [94.1086, 25.6748],
        "via": [[93.8967, 25.7501]],
        "distance_km": 74, "surface": "paved", "max_class": "heavy_truck",
        "bridge_limit_tonnes": 30, "status": "OPEN",
        "landslide_risk": 0.50, "flood_risk": 0.10,
        "notes": "Major artery to Nagaland. High landslide risk during monsoon."
    },
    "NH-2-KOH-IMP": {
        "name": "NH-2: Kohima–Imphal",
        "from": [94.1086, 25.6748], "to": [93.9368, 24.8170],
        "via": [[94.0200, 25.3000]],
        "distance_km": 138, "surface": "paved", "max_class": "heavy_truck",
        "bridge_limit_tonnes": 40, "status": "OPEN",
        "landslide_risk": 0.35, "flood_risk": 0.05,
        "notes": "Primary route connecting Nagaland and Manipur."
    },
    "NH-27-GUW-TEZ": {
        "name": "NH-27: Guwahati–Tezpur",
        "from": [91.7362, 26.1445], "to": [92.7926, 26.6338],
        "via": [[92.0000, 26.3500]],
        "distance_km": 180, "surface": "paved", "max_class": "heavy_truck",
        "bridge_limit_tonnes": 50, "status": "OPEN",
        "landslide_risk": 0.05, "flood_risk": 0.45,
        "notes": "Plains highway. Watch for Brahmaputra flooding."
    },
    "NH-306-SCL-AIZ": {
        "name": "NH-306: Silchar–Aizawl",
        "from": [92.7789, 24.8333], "to": [92.7173, 23.7307],
        "via": [[92.6500, 24.2500]],
        "distance_km": 170, "surface": "mixed", "max_class": "light_truck",
        "bridge_limit_tonnes": 15, "status": "OPEN",
        "landslide_risk": 0.60, "flood_risk": 0.15,
        "notes": "Hilly terrain, extremely prone to washouts. Heavy vehicles restricted."
    },
}

VEHICLE_CLASSES = {
    "motorbike": {"label": "Motorbike / Two-Wheeler", "max_weight_tonnes": 0.5, "emoji": "🏍️"},
    "car": {"label": "Car / SUV", "max_weight_tonnes": 3.0, "emoji": "🚗"},
    "4x4": {"label": "4x4 / Jeep", "max_weight_tonnes": 5.0, "emoji": "🚙"},
    "light_truck": {"label": "Light Truck (< 10T)", "max_weight_tonnes": 10.0, "emoji": "🚛"},
    "heavy_truck": {"label": "Heavy Truck / Bus (> 10T)", "max_weight_tonnes": 40.0, "emoji": "🚚"},
    "ambulance": {"label": "Ambulance (Emergency)", "max_weight_tonnes": 4.0, "emoji": "🚑"},
}

# ─── Feature 3: Data Freshness Helpers ────────────────────────────────────────

def get_segment_meta(seg_id: str) -> Dict:
    """Get enriched metadata for a segment including freshness and evidence."""
    seg = ROAD_SEGMENTS.get(seg_id)
    if not seg:
        return {}
    dynamic = lns_state["segments"].get(seg_id, {})
    status = dynamic.get("status", seg["status"])
    confidence = dynamic.get("confidence", 0.90)
    last_updated = dynamic.get("last_updated", None)
    evidence = dynamic.get("evidence", [])

    # Compute freshness
    freshness = "BASELINE"
    age_minutes = None
    if last_updated:
        age = datetime.now(timezone.utc) - datetime.fromisoformat(last_updated)
        age_minutes = age.total_seconds() / 60
        if age_minutes < 30:
            freshness = "FRESH"
        elif age_minutes < 180:
            freshness = "AGING"
        else:
            freshness = "STALE"
            # Degrade confidence for stale data
            confidence = max(0.30, confidence * 0.7)

    # Determine evidence sources or use baseline
    if not evidence:
        evidence = [{"source": "baseline_model", "description": "Historical hazard model + road survey", "trust": 0.60}]

    # Build warnings
    warnings = []
    if freshness == "STALE":
        warnings.append("Data is stale — last update over 3 hours ago")
    if confidence < 0.50:
        warnings.append("Low confidence — recommend human verification")
    if status == "SUSPECTED":
        warnings.append("Road state is inferred, not directly confirmed")

    # Detect conflicting evidence
    if len(evidence) >= 2:
        statuses_reported = set()
        for e in evidence:
            if "status" in e:
                statuses_reported.add(e["status"])
        if len(statuses_reported) > 1:
            warnings.append("Conflicting reports detected — sources disagree on road state")
            confidence = max(0.20, confidence * 0.6)

    return {
        "segment_id": seg_id,
        "name": seg["name"],
        "status": status,
        "confidence": round(confidence, 2),
        "last_updated": last_updated,
        "age_minutes": round(age_minutes, 1) if age_minutes is not None else None,
        "freshness": freshness,
        "evidence": evidence,
        "warnings": warnings,
        "landslide_risk": seg["landslide_risk"],
        "flood_risk": seg["flood_risk"],
        "surface": seg["surface"],
        "bridge_limit_tonnes": seg["bridge_limit_tonnes"],
        "notes": seg["notes"],
    }

# ─── Feature 1: Route Resilience ──────────────────────────────────────────────

def compute_resilience(seg: Dict, dynamic_status: str, confidence: float, freshness: str = "BASELINE") -> Dict:
    """
    Compute a deterministic Route Resilience Score 0–100.
    Resilience = how likely the route remains usable during the delivery window.
    This is NOT the same as route cost/risk — a high-risk route can have decent
    resilience if the risk is well-understood and stable.
    """
    # Factor 1: Hazard stability (40% weight) — lower combined hazard = more resilient
    hazard_combined = seg["landslide_risk"] * 0.6 + seg["flood_risk"] * 0.4
    hazard_stability = 1.0 - hazard_combined  # 0..1 where 1 = very stable

    # Factor 2: Road status (20% weight)
    status_factor = {"OPEN": 1.0, "SUSPECTED": 0.4, "CLOSED": 0.0}.get(dynamic_status, 0.5)

    # Factor 3: Surface durability (10% weight) — paved roads more resilient to weather
    surface_durability = {"paved": 1.0, "mixed": 0.55, "gravel": 0.30}.get(seg["surface"], 0.5)

    # Factor 4: Confidence in data (15% weight) — higher confidence = more reliable assessment
    confidence_factor = min(confidence, 1.0)

    # Factor 5: Bridge redundancy (5% weight) — higher bridge limit = less vulnerability
    bridge_factor = min(seg["bridge_limit_tonnes"] / 50.0, 1.0)

    # Factor 6: Data freshness (10% weight) — stale data means uncertain resilience
    freshness_factor = {"FRESH": 1.0, "AGING": 0.7, "STALE": 0.3, "BASELINE": 0.5}.get(freshness, 0.5)

    # Weighted composite
    score = (
        0.40 * hazard_stability +
        0.20 * status_factor +
        0.10 * surface_durability +
        0.15 * confidence_factor +
        0.05 * bridge_factor +
        0.10 * freshness_factor
    )

    resilience = round(score * 100)
    resilience = max(0, min(100, resilience))

    return {
        "score": resilience,
        "inputs": {
            "hazard_stability": round(hazard_stability, 3),
            "status_factor": status_factor,
            "surface_durability": surface_durability,
            "confidence_factor": round(confidence_factor, 3),
            "bridge_factor": round(bridge_factor, 3),
            "freshness_factor": freshness_factor,
        },
        "breakdown": f"Hazard:{round(hazard_stability*100)}% Status:{round(status_factor*100)}% Surface:{round(surface_durability*100)}% Conf:{round(confidence_factor*100)}% Bridge:{round(bridge_factor*100)}% Fresh:{round(freshness_factor*100)}%"
    }

# ─── Route Planning ───────────────────────────────────────────────────────────

def haversine(lon1, lat1, lon2, lat2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def find_routes(origin: str, destination: str, vehicle_class: str, cargo_tonnes: float = 0):
    orig = LOCATIONS.get(origin)
    dest = LOCATIONS.get(destination)
    if not orig or not dest:
        return {"error": "Location not found"}

    direct_km = haversine(orig["lon"], orig["lat"], dest["lon"], dest["lat"])
    veh = VEHICLE_CLASSES.get(vehicle_class, VEHICLE_CLASSES["car"])
    total_weight = veh["max_weight_tonnes"] + cargo_tonnes
    is_emergency = vehicle_class == "ambulance"

    candidates = []
    for seg_id, seg in ROAD_SEGMENTS.items():
        # Stage A: Hard feasibility filters (Section 12.2)
        dynamic_status = lns_state["segments"].get(seg_id, {}).get("status", seg["status"])
        if dynamic_status == "CLOSED" and not is_emergency:
            candidates.append({
                "segment_id": seg_id, "name": seg["name"], "feasible": False,
                "rejection": "Road closed — hazard active",
                "status": dynamic_status, "distance_km": seg["distance_km"],
                "eta_min": None, "risk_score": 1.0, "coordinates": build_coords(seg),
                "resilience_score": 0, "resilience_inputs": {},
            })
            continue

        veh_classes = ["motorbike", "car", "4x4", "light_truck", "heavy_truck", "ambulance"]
        seg_max_idx = veh_classes.index(seg["max_class"]) if seg["max_class"] in veh_classes else 4
        veh_idx = veh_classes.index(vehicle_class) if vehicle_class in veh_classes else 2
        if veh_idx > seg_max_idx:
            candidates.append({
                "segment_id": seg_id, "name": seg["name"], "feasible": False,
                "rejection": f"Vehicle class not permitted — max allowed: {seg['max_class']}",
                "status": dynamic_status, "distance_km": seg["distance_km"],
                "eta_min": None, "risk_score": 0.9, "coordinates": build_coords(seg),
                "resilience_score": 0, "resilience_inputs": {},
            })
            continue

        if total_weight > seg["bridge_limit_tonnes"]:
            candidates.append({
                "segment_id": seg_id, "name": seg["name"], "feasible": False,
                "rejection": f"Exceeds bridge limit ({seg['bridge_limit_tonnes']}T). Your vehicle+cargo: {total_weight:.1f}T",
                "status": dynamic_status, "distance_km": seg["distance_km"],
                "eta_min": None, "risk_score": 0.85, "coordinates": build_coords(seg),
                "resilience_score": 0, "resilience_inputs": {},
            })
            continue

        # Stage B: Cost + ETA (Section 12.3)
        base_speed = {"motorbike": 50, "car": 55, "4x4": 45, "light_truck": 40, "heavy_truck": 35, "ambulance": 60}.get(vehicle_class, 45)
        surface_factor = {"paved": 1.0, "mixed": 0.75, "gravel": 0.55}.get(seg["surface"], 0.8)
        rain_factor = 0.85  # assume light monsoon
        eta_p50 = (seg["distance_km"] / (base_speed * surface_factor * rain_factor)) * 60
        eta_p90 = eta_p50 * 1.30

        risk = (seg["landslide_risk"] * 0.6 + seg["flood_risk"] * 0.4)
        if dynamic_status == "SUSPECTED":
            risk = min(risk * 1.5, 1.0)

        # Data freshness
        seg_meta = get_segment_meta(seg_id)
        confidence = seg_meta["confidence"]
        freshness = seg_meta["freshness"]

        # Feature 1: Resilience Score
        resilience = compute_resilience(seg, dynamic_status, confidence, freshness)

        # Composite cost (lower = better) — now includes resilience factor
        # Resilience contributes negatively to cost (higher resilience = lower cost)
        base_cost = 0.30 * (seg["distance_km"] / 150) + 0.40 * risk + 0.20 * (1 - surface_factor) - (0.10 if is_emergency else 0)
        resilience_bonus = 0.15 * (resilience["score"] / 100)  # higher resilience reduces cost
        cost = base_cost - resilience_bonus

        # ETA uncertainty
        eta_uncertainty = round(eta_p90 - eta_p50)

        candidates.append({
            "segment_id": seg_id, "name": seg["name"], "feasible": True,
            "rejection": None, "status": dynamic_status,
            "distance_km": seg["distance_km"], "eta_min": round(eta_p50),
            "eta_p90_min": round(eta_p90),
            "eta_uncertainty_min": eta_uncertainty,
            "risk_score": round(risk, 2), "cost": round(cost, 3),
            "landslide_risk_pct": round(seg["landslide_risk"] * 100),
            "flood_risk_pct": round(seg["flood_risk"] * 100),
            "surface": seg["surface"], "bridge_limit_t": seg["bridge_limit_tonnes"],
            "confidence": round(confidence, 2), "notes": seg["notes"],
            "coordinates": build_coords(seg),
            # Feature 1: Resilience
            "resilience_score": resilience["score"],
            "resilience_inputs": resilience["inputs"],
            "resilience_breakdown": resilience["breakdown"],
            # Feature 3: Freshness
            "freshness": freshness,
            "warnings": seg_meta["warnings"],
        })

    feasible = [c for c in candidates if c["feasible"]]
    infeasible = [c for c in candidates if not c["feasible"]]
    feasible.sort(key=lambda x: x["cost"])

    # Generate tradeoff explanations
    if len(feasible) >= 2:
        best = feasible[0]
        for r in feasible:
            reasons = []
            if r["segment_id"] == best["segment_id"]:
                r["recommended"] = True
                reasons.append("✓ Lowest composite cost")
                if r["resilience_score"] >= 60:
                    reasons.append("✓ Good resilience score")
                if r["risk_score"] < 0.4:
                    reasons.append("✓ Lower hazard risk")
                if r["confidence"] > 0.7:
                    reasons.append("✓ High data confidence")
                r["tradeoff_explanation"] = " | ".join(reasons)
            else:
                eta_diff = (r["eta_min"] or 0) - (best["eta_min"] or 0)
                res_diff = r["resilience_score"] - best["resilience_score"]
                risk_diff = r["risk_score"] - best["risk_score"]
                parts = []
                if eta_diff > 0:
                    parts.append(f"{eta_diff} min slower")
                elif eta_diff < 0:
                    parts.append(f"{abs(eta_diff)} min faster")
                if res_diff > 10:
                    parts.append(f"resilience +{res_diff}")
                elif res_diff < -10:
                    parts.append(f"resilience {res_diff}")
                if risk_diff > 0.1:
                    parts.append(f"higher risk (+{round(risk_diff*100)}%)")
                elif risk_diff < -0.1:
                    parts.append(f"lower risk ({round(risk_diff*100)}%)")
                r["tradeoff_explanation"] = " | ".join(parts) if parts else "Similar overall profile"
    elif len(feasible) == 1:
        feasible[0]["recommended"] = True
        feasible[0]["tradeoff_explanation"] = "✓ Only feasible route available"

    # Build DecisionRecord
    decision = {
        "id": f"DEC-{len(decision_log)+1:04d}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "trigger": "route_planning",
        "inputs": {
            "origin": origin, "destination": destination,
            "vehicle_class": vehicle_class, "cargo_tonnes": cargo_tonnes,
            "total_weight_tonnes": total_weight,
        },
        "network_state_version": lns_state["version"],
        "candidates_evaluated": len(candidates),
        "feasible_count": len(feasible),
        "rejected_count": len(infeasible),
        "rejected_reasons": [{"segment": c["segment_id"], "reason": c["rejection"]} for c in infeasible],
        "selected_route": feasible[0]["segment_id"] if feasible else None,
        "selected_resilience": feasible[0]["resilience_score"] if feasible else None,
        "selected_confidence": feasible[0]["confidence"] if feasible else None,
        "all_resilience_scores": {c["segment_id"]: c["resilience_score"] for c in feasible},
        "human_approval_state": "PENDING",
    }
    decision_log.append(decision)

    return {
        "origin": origin, "destination": destination,
        "vehicle": veh["label"], "vehicle_emoji": veh["emoji"],
        "cargo_tonnes": cargo_tonnes, "total_weight_tonnes": total_weight,
        "feasible_routes": feasible,
        "blocked_routes": infeasible,
        "summary": f"Found {len(feasible)} route(s) for your {veh['label']} from {origin} to {destination}.",
        "decision_id": decision["id"],
    }

def build_coords(seg):
    coords = [seg["from"]] + seg.get("via", []) + [seg["to"]]
    return coords

# ─── Feature 2: Disruption Cascade Analyzer ──────────────────────────────────

def compute_cascade(segment_id: str, new_status: str = "CLOSED") -> Dict:
    """
    Compute the full downstream impact when a segment transitions to
    SUSPECTED or CLOSED. Uses the real road network graph.
    """
    seg = ROAD_SEGMENTS.get(segment_id)
    if not seg:
        return {"error": f"Unknown segment: {segment_id}"}

    timestamp = datetime.now(timezone.utc).isoformat()

    # 1. Affected segments — find segments that share endpoints with the closed segment
    affected_segments = [segment_id]
    seg_from = tuple(seg["from"])
    seg_to = tuple(seg["to"])
    for other_id, other in ROAD_SEGMENTS.items():
        if other_id == segment_id:
            continue
        other_from = tuple(other["from"])
        other_to = tuple(other["to"])
        # Check if they share an endpoint (connected in the network graph)
        if seg_from in (other_from, other_to) or seg_to in (other_from, other_to):
            other_status = lns_state["segments"].get(other_id, {}).get("status", other["status"])
            if other_status != "OPEN":
                affected_segments.append(other_id)

    # 2. Affected routes — find all origin-destination pairs that use this segment
    affected_routes = []
    test_pairs = [
        ("Guwahati", "Shillong"), ("Shillong", "Jowai"), ("Guwahati", "Jowai"),
        ("Jowai", "Silchar"), ("Shillong", "Silchar"), ("Guwahati", "Silchar"),
        ("Dimapur", "Kohima"), ("Kohima", "Imphal"), ("Dimapur", "Imphal"),
        ("Guwahati", "Tezpur"), ("Silchar", "Aizawl"),
    ]
    for orig, dest in test_pairs:
        result = find_routes(orig, dest, "car", 0)
        feasible = result.get("feasible_routes", [])
        # Check if ANY feasible route uses the closed segment
        for r in feasible:
            if r["segment_id"] == segment_id:
                affected_routes.append({
                    "origin": orig, "destination": dest,
                    "segment_used": segment_id,
                    "alternative_count": len(feasible) - 1,
                    "has_alternative": len(feasible) > 1,
                })
                break
        # Also check if closing this segment would leave NO feasible routes
        if not any(r["segment_id"] != segment_id for r in feasible) and feasible:
            affected_routes.append({
                "origin": orig, "destination": dest,
                "segment_used": segment_id,
                "alternative_count": 0,
                "has_alternative": False,
                "critical": True,
            })

    # 3. Affected vehicles (from active_vehicles)
    affected_vehicles = []
    for v in active_vehicles:
        if v.get("current_segment") == segment_id:
            affected_vehicles.append({
                "vehicle_id": v["id"],
                "vehicle_class": v["class"],
                "status": v["status"],
                "impact": "must_reroute" if new_status == "CLOSED" else "delay_expected",
            })

    # 4. Affected deliveries (from active_deliveries)
    affected_deliveries = []
    emergency_at_risk = []
    for d in active_deliveries:
        if d.get("route_segment") == segment_id:
            entry = {
                "delivery_id": d["id"],
                "cargo_type": d["cargo_type"],
                "priority": d.get("priority", "routine"),
                "destination": d.get("destination"),
                "impact": "reroute_needed" if new_status == "CLOSED" else "delay_likely",
            }
            affected_deliveries.append(entry)
            if d.get("priority") in ("emergency", "critical"):
                emergency_at_risk.append(entry)

    # 5. Expected delays
    expected_delay = {}
    for route in affected_routes:
        # Estimate delay based on alternative route ETA vs original
        if route.get("has_alternative"):
            expected_delay[f"{route['origin']}-{route['destination']}"] = {
                "status": "reroutable",
                "estimated_delay_min": 15 + len(affected_segments) * 10,
            }
        else:
            expected_delay[f"{route['origin']}-{route['destination']}"] = {
                "status": "no_alternative",
                "estimated_delay_min": None,
                "action": "defer_or_wait",
            }

    # 6. Recommended reassignments
    reassignments = []
    deferred = []
    for v in affected_vehicles:
        reassignments.append({
            "vehicle_id": v["vehicle_id"],
            "action": "reassign_to_alternate_route",
            "reason": f"Segment {segment_id} is {new_status}",
        })
    for d in affected_deliveries:
        if d["impact"] == "reroute_needed" and d["priority"] != "emergency":
            if not any(r.get("has_alternative") for r in affected_routes):
                deferred.append({
                    "delivery_id": d["delivery_id"],
                    "reason": "No alternate route available",
                })

    cascade = {
        "id": f"CASCADE-{len(cascade_history)+1:04d}",
        "timestamp": timestamp,
        "event": {
            "segment_id": segment_id,
            "segment_name": seg["name"],
            "new_status": new_status,
        },
        "affected_segments": affected_segments,
        "affected_segments_count": len(affected_segments),
        "affected_routes": affected_routes,
        "affected_routes_count": len(affected_routes),
        "affected_vehicles": affected_vehicles,
        "affected_vehicles_count": len(affected_vehicles),
        "affected_deliveries": affected_deliveries,
        "affected_deliveries_count": len(affected_deliveries),
        "emergency_deliveries_at_risk": emergency_at_risk,
        "emergency_at_risk_count": len(emergency_at_risk),
        "expected_delay": expected_delay,
        "reassignments": reassignments,
        "deferred_deliveries": deferred,
        "summary": f"Closing {seg['name']} affects {len(affected_routes)} route(s), {len(affected_vehicles)} vehicle(s), {len(affected_deliveries)} delivery(ies). {len(emergency_at_risk)} emergency delivery(ies) at risk.",
    }

    cascade_history.append(cascade)

    # Store DecisionRecord for cascade
    decision = {
        "id": f"DEC-{len(decision_log)+1:04d}",
        "timestamp": timestamp,
        "trigger": "disruption_cascade",
        "inputs": {"segment_id": segment_id, "new_status": new_status},
        "network_state_version": lns_state["version"],
        "cascade_id": cascade["id"],
        "affected_routes_count": len(affected_routes),
        "affected_vehicles_count": len(affected_vehicles),
        "affected_deliveries_count": len(affected_deliveries),
        "emergency_at_risk_count": len(emergency_at_risk),
        "reassignments_count": len(reassignments),
        "deferred_count": len(deferred),
        "human_approval_state": "PENDING",
    }
    decision_log.append(decision)

    return cascade

# ─── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

async def broadcast(msg: dict):
    dead = []
    for ws in active_connections:
        try:
            await ws.send_text(json.dumps(msg))
        except:
            dead.append(ws)
    for ws in dead:
        active_connections.remove(ws)

# ─── Core API ─────────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "lns_version": lns_state["version"], "connections": len(active_connections)}

@app.get("/api/v1/locations")
async def get_locations():
    return {"locations": LOCATIONS}

@app.get("/api/v1/network/overlay")
async def get_overlay():
    overlay = {}
    for seg_id, seg in ROAD_SEGMENTS.items():
        meta = get_segment_meta(seg_id)
        overlay[seg_id] = {
            **seg,
            "status": meta["status"],
            "confidence": meta["confidence"],
            "freshness": meta["freshness"],
            "last_updated": meta["last_updated"],
            "age_minutes": meta["age_minutes"],
            "evidence": meta["evidence"],
            "warnings": meta["warnings"],
            "coordinates": build_coords(seg)
        }
    return {"version": lns_state["version"], "segments": overlay}

@app.get("/api/v1/routes")
async def plan_route(origin: str, destination: str, vehicle: str = "car", cargo_tonnes: float = 0):
    result = find_routes(origin, destination, vehicle, cargo_tonnes)
    return result

# ─── Feature 3: Segment Detail Endpoint ──────────────────────────────────────

@app.get("/api/v1/segments/{seg_id}/details")
async def segment_details(seg_id: str):
    meta = get_segment_meta(seg_id)
    if not meta:
        return {"error": f"Segment '{seg_id}' not found"}
    return meta

# ─── Events ──────────────────────────────────────────────────────────────────

class EventPayload(BaseModel):
    type: str
    source: str
    trust: float
    segment_id: str
    status: str
    description: Optional[str] = ""

@app.post("/api/v1/events")
async def ingest_event(event: EventPayload):
    seg = lns_state["segments"].setdefault(event.segment_id, {
        "status": "OPEN", "confidence": 1.0,
        "last_updated": None, "evidence": [],
    })

    old_status = seg.get("status", "OPEN")

    # Add evidence entry
    evidence_entry = {
        "source": event.source,
        "description": event.description or f"{event.type} reported by {event.source}",
        "trust": event.trust,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": event.status,
    }
    if not isinstance(seg.get("evidence"), list):
        seg["evidence"] = []
    seg["evidence"].append(evidence_entry)
    # Keep last 10 evidence entries
    seg["evidence"] = seg["evidence"][-10:]

    # Update status based on trust threshold (existing logic preserved)
    if event.trust >= 0.8:
        seg["status"] = event.status
        seg["confidence"] = event.trust
    elif event.trust >= 0.4:
        seg["status"] = "SUSPECTED"
        seg["confidence"] = event.trust
    # Low trust (<0.4): do NOT change status, only add evidence
    # This satisfies: "A single low-trust report must NOT automatically close a road"

    seg["last_updated"] = datetime.now(timezone.utc).isoformat()
    lns_state["version"] += 1

    # Auto-compute cascade if status changed to SUSPECTED or CLOSED
    cascade_data = None
    if seg["status"] in ("SUSPECTED", "CLOSED") and seg["status"] != old_status:
        cascade_data = compute_cascade(event.segment_id, seg["status"])

    await broadcast({
        "type": "LNS_UPDATE",
        "version": lns_state["version"],
        "segment_id": event.segment_id,
        "new_status": seg["status"],
        "confidence": seg["confidence"],
        "cascade": cascade_data,
    })
    return {"status": "ok", "lns_version": lns_state["version"], "cascade": cascade_data}

# ─── Feature 2: Cascade API ──────────────────────────────────────────────────

@app.post("/api/v1/cascade")
async def cascade_analysis(segment_id: str, new_status: str = "CLOSED"):
    result = compute_cascade(segment_id, new_status)
    return result

@app.get("/api/v1/cascade/history")
async def get_cascade_history():
    return {"cascades": cascade_history[-20:]}

# ─── DecisionRecord API ──────────────────────────────────────────────────────

@app.get("/api/v1/decisions")
async def get_decisions():
    return {"decisions": decision_log[-30:]}

@app.get("/api/v1/decisions/{dec_id}")
async def get_decision(dec_id: str):
    for d in decision_log:
        if d["id"] == dec_id:
            return d
    return {"error": "Decision not found"}

# ─── Community Reports ───────────────────────────────────────────────────────

class CommunityReport(BaseModel):
    reporter_type: str   # "local", "driver", "official"
    location_name: str
    segment_id: Optional[str] = ""
    issue_type: str      # "landslide", "flood", "pothole", "blocked", "fallen_tree", "other"
    severity: str        # "minor", "moderate", "severe"
    description: str
    vehicle_class: Optional[str] = "car"

@app.post("/api/v1/reports")
async def submit_report(report: CommunityReport):
    entry = {
        "id": f"RPT-{len(community_reports)+1:04d}",
        "timestamp": datetime.now().isoformat(),
        **report.dict()
    }
    community_reports.append(entry)
    # Auto-update LNS if severe
    if report.severity == "severe" and report.segment_id:
        trust = {"official": 0.95, "driver": 0.70, "local": 0.55}.get(report.reporter_type, 0.5)
        event = EventPayload(type=report.issue_type, source=f"community_{report.reporter_type}",
                             trust=trust, segment_id=report.segment_id, status="SUSPECTED",
                             description=report.description)
        await ingest_event(event)
    await broadcast({"type": "NEW_REPORT", "report_id": entry["id"], "segment_id": report.segment_id})
    return {"status": "ok", "report_id": entry["id"]}

@app.get("/api/v1/reports")
async def get_reports():
    return {"reports": community_reports[-20:]}

# ─── Emergency ───────────────────────────────────────────────────────────────

class EmergencyRequest(BaseModel):
    requester_name: str
    contact: str
    location: str
    emergency_type: str  # "medical", "rescue", "supply", "other"
    people_count: int
    description: str

@app.post("/api/v1/emergency")
async def emergency_request(req: EmergencyRequest):
    entry = {"id": f"SOS-{len(emergency_requests)+1:04d}", "timestamp": datetime.now().isoformat(),
             "status": "DISPATCHING", **req.dict()}
    emergency_requests.append(entry)
    await broadcast({"type": "EMERGENCY_SOS", "sos_id": entry["id"], "location": req.location, "type": req.emergency_type})
    return {"status": "ok", "sos_id": entry["id"], "message": "Emergency registered. Help being dispatched."}

@app.get("/api/v1/emergency")
async def get_emergencies():
    return {"requests": emergency_requests}

# ─── Demo Scenario ───────────────────────────────────────────────────────────

@app.post("/api/v1/demo/reset")
async def demo_reset():
    lns_state["version"] = 1
    lns_state["segments"].clear()
    community_reports.clear()
    emergency_requests.clear()
    decision_log.clear()
    active_deliveries.clear()
    active_vehicles.clear()
    cascade_history.clear()
    await broadcast({"type": "DEMO_RESET"})
    return {"status": "ok"}

@app.post("/api/v1/demo/resilience")
async def demo_resilience_scenario():
    """
    8-step polished demo sequence showcasing all three features.
    """
    steps = []

    # Reset first
    await demo_reset()
    steps.append({"step": 1, "action": "RESET", "description": "Network reset to baseline"})

    # Step 2: Seed some active deliveries and vehicles for cascade demo
    active_vehicles.extend([
        {"id": "VEH-001", "class": "heavy_truck", "status": "in_transit", "current_segment": "NH-6-GS"},
        {"id": "VEH-002", "class": "car", "status": "in_transit", "current_segment": "NH-6-GS"},
        {"id": "VEH-003", "class": "4x4", "status": "in_transit", "current_segment": "R-114-UMROI"},
        {"id": "VEH-004", "class": "ambulance", "status": "in_transit", "current_segment": "NH-6-GS"},
    ])
    active_deliveries.extend([
        {"id": "DEL-001", "cargo_type": "medical_supplies", "priority": "emergency", "route_segment": "NH-6-GS", "destination": "Shillong"},
        {"id": "DEL-002", "cargo_type": "construction", "priority": "routine", "route_segment": "NH-6-GS", "destination": "Shillong"},
        {"id": "DEL-003", "cargo_type": "food_ration", "priority": "critical", "route_segment": "NH-6-GS", "destination": "Nongpoh"},
        {"id": "DEL-004", "cargo_type": "electronics", "priority": "routine", "route_segment": "R-114-UMROI", "destination": "Shillong"},
        {"id": "DEL-005", "cargo_type": "fuel", "priority": "routine", "route_segment": "NH-6-SJ", "destination": "Jowai"},
    ])
    steps.append({"step": 2, "action": "SEED_DATA", "description": "Seeded 4 vehicles and 5 deliveries (2 emergency/critical)"})

    # Step 3: Show two candidate routes (Guwahati → Shillong)
    routes_before = find_routes("Guwahati", "Shillong", "car", 0)
    steps.append({
        "step": 3, "action": "ROUTE_COMPARISON",
        "description": "Compare routes Guwahati → Shillong before disruption",
        "routes": [{
            "name": r["name"],
            "eta_min": r["eta_min"],
            "risk_score": r["risk_score"],
            "resilience_score": r["resilience_score"],
            "recommended": r.get("recommended", False),
            "tradeoff": r.get("tradeoff_explanation", ""),
        } for r in routes_before["feasible_routes"]],
    })

    # Step 4: Add a low-trust community report (should NOT close the road)
    seg = lns_state["segments"].setdefault("NH-6-GS", {
        "status": "OPEN", "confidence": 1.0, "last_updated": None, "evidence": [],
    })
    low_trust_event = EventPayload(
        type="landslide", source="community_local", trust=0.35,
        segment_id="NH-6-GS", status="CLOSED",
        description="Local villager reports possible rockfall near km 45"
    )
    await ingest_event(low_trust_event)
    steps.append({
        "step": 4, "action": "LOW_TRUST_REPORT",
        "description": "Low-trust report (0.35) submitted — road should NOT auto-close",
        "segment_status": lns_state["segments"]["NH-6-GS"]["status"],
        "confidence": lns_state["segments"]["NH-6-GS"]["confidence"],
    })

    # Step 5: Add a high-trust official report → road goes CLOSED
    high_trust_event = EventPayload(
        type="landslide", source="official_ndrf", trust=0.95,
        segment_id="NH-6-GS", status="CLOSED",
        description="NDRF confirms major landslide blocking both lanes at km 47"
    )
    result = await ingest_event(high_trust_event)
    cascade_data = result.get("cascade")
    steps.append({
        "step": 5, "action": "ROAD_CLOSURE",
        "description": "High-trust official confirms landslide — NH-6 CLOSED",
        "cascade_summary": cascade_data.get("summary") if cascade_data else "No cascade computed",
        "affected_routes": cascade_data.get("affected_routes_count", 0) if cascade_data else 0,
        "affected_vehicles": cascade_data.get("affected_vehicles_count", 0) if cascade_data else 0,
        "affected_deliveries": cascade_data.get("affected_deliveries_count", 0) if cascade_data else 0,
        "emergency_at_risk": cascade_data.get("emergency_at_risk_count", 0) if cascade_data else 0,
    })

    # Step 6: Re-plan routes after closure
    routes_after = find_routes("Guwahati", "Shillong", "car", 0)
    steps.append({
        "step": 6, "action": "REPLAN",
        "description": "Routes recalculated after NH-6 closure",
        "feasible_count": len(routes_after["feasible_routes"]),
        "blocked_count": len(routes_after["blocked_routes"]),
        "routes": [{
            "name": r["name"],
            "eta_min": r["eta_min"],
            "risk_score": r["risk_score"],
            "resilience_score": r["resilience_score"],
            "recommended": r.get("recommended", False),
        } for r in routes_after["feasible_routes"]],
    })

    # Step 7: Show data freshness on the affected segment
    seg_detail = get_segment_meta("NH-6-GS")
    steps.append({
        "step": 7, "action": "DATA_FRESHNESS",
        "description": "Segment intelligence for NH-6-GS",
        "status": seg_detail["status"],
        "confidence": seg_detail["confidence"],
        "freshness": seg_detail["freshness"],
        "evidence_count": len(seg_detail["evidence"]),
        "warnings": seg_detail["warnings"],
    })

    # Step 8: Show decision log
    steps.append({
        "step": 8, "action": "DECISION_LOG",
        "description": "All decisions recorded with full provenance",
        "total_decisions": len(decision_log),
        "decisions": [{"id": d["id"], "trigger": d["trigger"], "timestamp": d["timestamp"]} for d in decision_log[-5:]],
    })

    return {
        "scenario": "NE-Setu Resilience Demo",
        "steps": steps,
        "workflow": "SENSE → UNDERSTAND → PREDICT → ASSESS → OPTIMIZE → APPROVE → ACT → RECALCULATE",
    }

# ─── Real-Time Weather (Open-Meteo Free API) ──────────────────────────────────

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

@app.get("/api/v1/weather")
async def get_weather(location: str = "Guwahati"):
    """Fetch real-time weather from Open-Meteo for any NE India location."""
    loc = LOCATIONS.get(location)
    if not loc:
        return {"error": f"Location '{location}' not found"}

    params = {
        "latitude": loc["lat"],
        "longitude": loc["lon"],
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m",
        "hourly": "temperature_2m,precipitation_probability,precipitation,weather_code,visibility,wind_speed_10m",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,sunrise,sunset",
        "forecast_days": 3,
        "timezone": "Asia/Kolkata"
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(OPEN_METEO_URL, params=params)
            data = resp.json()

        # WMO weather code to description
        wmo = {0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
               45: "Foggy", 48: "Depositing rime fog",
               51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
               61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
               71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
               80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
               95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"}

        current = data.get("current", {})
        code = current.get("weather_code", 0)

        return {
            "location": location,
            "state": loc["state"],
            "lat": loc["lat"], "lon": loc["lon"],
            "current": {
                "temperature_c": current.get("temperature_2m"),
                "feels_like_c": current.get("apparent_temperature"),
                "humidity_pct": current.get("relative_humidity_2m"),
                "precipitation_mm": current.get("precipitation"),
                "rain_mm": current.get("rain"),
                "wind_speed_kmh": current.get("wind_speed_10m"),
                "wind_direction": current.get("wind_direction_10m"),
                "weather_code": code,
                "weather_description": wmo.get(code, f"Code {code}"),
            },
            "hourly": data.get("hourly", {}),
            "daily": data.get("daily", {}),
            "source": "Open-Meteo (open-meteo.com)"
        }
    except Exception as e:
        return {"error": str(e), "location": location}

@app.get("/api/v1/weather/all")
async def get_weather_all():
    """Fetch current weather for all major NE India locations."""
    results = {}
    major = ["Guwahati", "Shillong", "Jowai", "Silchar", "Dimapur", "Kohima", "Imphal", "Aizawl"]
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            for name in major:
                loc = LOCATIONS[name]
                params = {
                    "latitude": loc["lat"], "longitude": loc["lon"],
                    "current": "temperature_2m,precipitation,rain,weather_code,wind_speed_10m",
                    "timezone": "Asia/Kolkata"
                }
                resp = await client.get(OPEN_METEO_URL, params=params)
                data = resp.json()
                c = data.get("current", {})
                wmo = {0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",51:"🌦️",53:"🌧️",55:"🌧️",
                       61:"🌧️",63:"🌧️",65:"🌧️💧",80:"🌦️",81:"🌧️",82:"⛈️",95:"⛈️",96:"⛈️",99:"⛈️🧊"}
                results[name] = {
                    "temp_c": c.get("temperature_2m"),
                    "rain_mm": c.get("rain", 0),
                    "precipitation_mm": c.get("precipitation", 0),
                    "wind_kmh": c.get("wind_speed_10m"),
                    "code": c.get("weather_code", 0),
                    "emoji": wmo.get(c.get("weather_code", 0), "🌡️"),
                    "state": loc["state"]
                }
    except Exception as e:
        return {"error": str(e)}
    return {"weather": results, "source": "Open-Meteo (open-meteo.com)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
