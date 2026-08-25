import json
import base64
import random
from typing import List, Dict, Optional, Any
from datetime import datetime

from app.config import settings
from app.data.ner_data import CITIES, ROAD_NETWORK, STATES, WEATHER_CURRENT, get_weather_zone_of_city


def _gemini_available() -> bool:
    return bool(settings.GOOGLE_API_KEY)


def _fallback_chat(message: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
    msg_lower = message.lower()

    cities_mentioned = [c for c in CITIES if c.lower() in msg_lower]
    states_mentioned = [s for s in STATES if s.lower() in msg_lower]

    if any(k in msg_lower for k in ["route", "way", "road", "distance", "reach", "go from", "travel", "ship"]):
        reply = "Let me route this to the **LogisticsAgent**. You can call `POST /api/logistics/optimize` with the exact source/destination and vehicle type. The engine uses A* search over the NER road network with terrain factors and live-weather landslide/flood penalties. The response will include segments, ETA, cost, advisories and alternatives."
        if len(cities_mentioned) >= 2:
            reply += f" Based on your message, try optimize from **{cities_mentioned[0]}** → **{cities_mentioned[1]}**."
        return {
            "reply": reply,
            "sources": ["NER Road Network (48 cities, ~60 road segments)", "LangGraph LogisticsAgent"],
            "agent_trace": {"agent": "LogisticsAgent", "intent_detected": "logistics.route", "confidence": 0.9, "actions": ["Route: A* over weather-weighted graph", "Compute ETA & cost", "List advisories"]},
            "followups": [f"Optimize route {cities_mentioned[0]} to {cities_mentioned[1]}" if len(cities_mentioned)>=2 else "Show me logistics endpoints", "What's the weather like today along that route?", "Can you make it wheelchair-accessible too?"],
        }

    if any(k in msg_lower for k in ["wheelchair", "access", "accessible", "disability", "ramp", "poi", "disable", "special"]):
        reply = "This maps to the **AccessibilityAgent**. Use `GET /api/accessibility/score?city=X` for a 0-10 accessibility rating across 6 dimensions or `POST /api/accessibility/routes` for mobility-aware routes. The platform rates POIs (airports, railway stations, hospitals, markets) and filters by wheelchair flag."
        if cities_mentioned:
            reply += f" Try: `/api/accessibility/score?city={cities_mentioned[0]}`"
        return {
            "reply": reply,
            "sources": ["ACCESSIBILITY_POIS dataset", "HOSPITALS dataset", "AccessibilityAgent (LangGraph)"],
            "agent_trace": {"agent": "AccessibilityAgent", "intent_detected": "accessibility.query", "confidence": 0.92, "actions": ["Compute 6-dim accessibility score", "Filter wheelchair POIs", "Recommend access-friendly routing"]},
            "followups": ["What cities have the best accessibility in NER?", "List all wheelchair-friendly POIs in Shillong", "Can you plan a wheelchair-accessible tour?"] if not cities_mentioned else [f"Score accessibility in {cities_mentioned[0]}", "Plan accessible itinerary", "List nearby accessible hospitals"],
        }

    if any(k in msg_lower for k in ["emergency", "evacuate", "flood", "landslide", "disaster", "rescue", "alert", "quake", "cyclone"]):
        reply = "This is best handled by the **EmergencyAgent**. Use `GET /api/emergency/alerts` for active NER-wide alerts or `POST /api/emergency/evacuate` for a multi-route evacuation plan (primary + 2 backups, shelter list, emergency contacts). The system factors chronic risk per weather zone, current warnings, special-needs capacity (wheelchair, elderly, medical)."
        if cities_mentioned:
            reply += f" Start by fetching active alerts around **{cities_mentioned[0]}**."
        return {
            "reply": reply,
            "sources": ["WEATHER_ZONES chronic risk data", "EmergencyAgent (LangGraph)", "NER DDMA contacts"],
            "agent_trace": {"agent": "EmergencyAgent", "intent_detected": "emergency.response", "confidence": 0.95, "actions": ["Fetch active alerts", "Compute evacuation routes (primary/backup)", "Shelter assignment", "Contact list"]},
            "followups": ["List active emergency alerts", "Evacuation plan for my city", "What disaster risk is highest in Shillong?"] if not cities_mentioned else [f"Evacuate {cities_mentioned[0]}", f"List alerts near {cities_mentioned[0]}", "DDMA contacts"],
        }

    if any(k in msg_lower for k in ["community", "hub", "partner", "feedback", "local", "cooperative", "shg", "women", "ngo"]):
        reply = "I'll route this to the **CommunityAgent**. `GET /api/communities/hubs` filters NER partner hubs (government/NGO/cooperative/volunteer), and `POST /api/communities/feedback` accepts feedback with auto-sentiment + assignment to the correct agent. 18 hubs across 8 states covering agri, crafts, bamboo, disaster volunteers, women SHGs, border trade, etc."
        return {
            "reply": reply,
            "sources": ["COMMUNITY_HUBS (18 entries)", "CommunityAgent (LangGraph)"],
            "agent_trace": {"agent": "CommunityAgent", "intent_detected": "community.liaison", "confidence": 0.88, "actions": ["Hub filter", "Feedback analysis", "Partner matching"]},
            "followups": ["List bamboo & cane hubs in Tripura", "Show women SHG hubs", "How do I submit road feedback?"],
        }

    intro = (
        "Welcome to **NER AI Logistics & Accessibility Platform** powered by a LangGraph multi-agent system. "
        "I'm the SupervisorAgent and can route your query to one of four specialists.\n\n"
        "I can currently help with:\n"
        "1. **Logistics** — route optimization, shipment tracking, ETA & cost (considering NER terrain + monsoon)\n"
        "2. **Accessibility** — city accessibility score, wheelchair routes, POI filter\n"
        "3. **Emergency** — active disaster alerts, evacuation planning with backup routes\n"
        "4. **Community** — find SHG/cooperative hubs, submit feedback\n\n"
        "Try: *'Route from Guwahati to Shillong for a truck'* or *'Is Imphal wheelchair friendly?'*"
    )
    return {
        "reply": intro,
        "sources": ["NER static data (8 states, 48 cities)", "LangGraph SupervisorAgent"],
        "agent_trace": {"agent": "SupervisorAgent", "intent_detected": "general.greeting", "confidence": 0.6, "actions": ["Intent classification", "Route to specialist if needed"]},
        "followups": [
            "Optimize route Guwahati → Imphal",
            "Score accessibility in Gangtok",
            "List active emergency alerts",
            "Show community hubs in Mizoram",
        ],
    }


async def chat_with_ai(message: str, history: Optional[List[Dict[str, str]]] = None, agent_override: Optional[str] = None) -> Dict[str, Any]:
    history = history or []
    if _gemini_available():
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            system_prompt = (
                "You are the AI assistant for the NER Smart Logistics & Accessibility Platform, India. "
                "The North Eastern Region (NER) covers Assam, Meghalaya, Manipur, Tripura, Mizoram, Nagaland, Arunachal Pradesh, Sikkim. "
                "Keep replies concise, highlight terrain/weather/accessibility context, and mention API endpoints when helpful. "
                "If you don't know, suggest calling the platform endpoints."
            )
            hist_text = "\n".join(f"{h.get('role','user')}: {h.get('content','')}" for h in history[-4:])
            prompt = f"{system_prompt}\n\nHistory:\n{hist_text}\n\nUser: {message}\nAssistant:"
            resp = model.generate_content(prompt)
            text = resp.text if resp and resp.text else ""
            if not text:
                return _fallback_chat(message, history)
            fb = _fallback_chat(message, history)
            return {
                "reply": text,
                "sources": ["Google Gemini " + settings.GEMINI_MODEL, "NER platform data"],
                "agent_trace": fb.get("agent_trace"),
                "suggested_followups": fb.get("followups", []),
            }
        except Exception:
            return _fallback_chat(message, history)
    return _fallback_chat(message, history)


def _mock_road_condition(image_b64: Optional[str], image_url: Optional[str], location: Optional[str]) -> Dict[str, Any]:
    if location:
        zone = get_weather_zone_of_city(location)
    else:
        zone = None
    risk_ls = zone.get("landslide_risk", 0.3) if zone else 0.3
    risk_fl = zone.get("flood_risk", 0.3) if zone else 0.3
    r = random.Random(hash((image_b64 or image_url or "none", location or "any")) % 2**32)
    surface_opts = ["asphalt_good", "asphalt_poor", "gravel", "mud", "under_construction"]
    surface = r.choices(surface_opts, weights=[0.3, 0.25, 0.15, 0.1, 0.2])[0]
    pothole = r.choice(["none", "low", "medium", "high"])
    acc_map = {"asphalt_good": 4, "asphalt_poor": 2, "gravel": 2, "mud": 1, "under_construction": 2, "blocked": 0}
    acc = acc_map.get(surface, 3)
    if pothole == "high":
        acc = max(0, acc - 1)
    ls_out = "high" if risk_ls > 0.75 else ("medium" if risk_ls > 0.45 else "low")
    fl_out = "high" if risk_fl > 0.65 else ("medium" if risk_fl > 0.35 else "low")
    if surface == "mud":
        ls_out = "medium"
        fl_out = "high"
    if surface == "blocked":
        ls_out = "high"
    summary_parts = [f"Surface detected: **{surface.replace('_', ' ')}**", f"Potholes: {pothole}"]
    if location:
        summary_parts.append(f"Context location: {location} (zone: {zone['zone_name'] if zone else 'Unknown'})")
    summary = ". ".join(summary_parts) + "."
    advisories: List[str] = []
    if surface in ("mud", "blocked", "under_construction"):
        advisories.append(f"Road surface is `{surface}` — 2-axle trucks not recommended.")
    if pothole in ("medium", "high"):
        advisories.append(f"Pothole severity {pothole}: Avoid high speed; ensure vehicle tyre condition.")
    if ls_out == "high":
        advisories.append("Chronic/active landslide risk. Avoid travel after heavy rain.")
    if fl_out == "high":
        advisories.append("Flood risk present — confirm underpass culvert levels before departure.")
    if acc <= 2:
        advisories.append("Low accessibility score — wheelchair/ambulance transit may need an alternative route.")
    if not advisories:
        advisories.append("Road looks passable; standard caution on hilly NER stretches applies.")
    alternates: List[str] = []
    if location:
        edges_from = [e for e in ROAD_NETWORK if e[0] == location or e[1] == location]
        edges_from.sort(key=lambda e: -e[2]["accessibility_rating"])
        for e in edges_from[:2]:
            other = e[1] if e[0] == location else e[0]
            alternates.append(f"{location} ↔ {other} via {e[2]['highway']} (acc rating {e[2]['accessibility_rating']})")
    landmarks = []
    if r.random() > 0.6:
        landmarks = [random.choice(["Roadside cutting", "Culvert/bridge", "Retaining wall", "Hairpin bend", "Street signage", "Assam-style wayside stop"])]
    return {
        "summary": summary,
        "road_condition": {
            "surface": surface,
            "pothole_severity": pothole,
            "accessibility_score": acc,
            "safe_for_wheelchair": acc >= 3,
            "safe_for_truck": surface not in ("mud", "blocked"),
            "landslide_risk": ls_out,
            "flood_risk": fl_out,
        },
        "advisories": advisories,
        "alternate_routes_suggested": alternates,
        "landmarks_detected": landmarks,
    }


async def analyze_image(image_b64: Optional[str] = None, image_url: Optional[str] = None, context_location: Optional[str] = None) -> Dict[str, Any]:
    if _gemini_available() and (image_b64 or image_url):
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_VISION_MODEL)
            parts = []
            if image_b64:
                parts.append({"mime_type": "image/jpeg", "data": image_b64})
            elif image_url:
                parts.append({"file_uri": image_url})
            parts.append(
                "Analyze this photo as a road in the North East Region of India. "
                "Return a strict JSON with keys: surface (one of asphalt_good/asphalt_poor/gravel/mud/blocked/under_construction), "
                "pothole_severity (none/low/medium/high), accessibility_score (0-5 integer), safe_for_wheelchair (bool), "
                "safe_for_truck (bool), landslide_risk (none/low/medium/high), flood_risk (none/low/medium/high), "
                "advisories (string list), landmarks_detected (string list), summary (string), alternate_routes_suggested (string list)."
            )
            resp = model.generate_content(parts)
            if resp and resp.text:
                text = resp.text.strip()
                if text.startswith("```json"):
                    text = text[7:]
                if text.endswith("```"):
                    text = text[:-3]
                try:
                    data = json.loads(text.strip())
                    rc = {
                        "surface": data.get("surface", "asphalt_good"),
                        "pothole_severity": data.get("pothole_severity", "none"),
                        "accessibility_score": int(data.get("accessibility_score", 0)),
                        "safe_for_wheelchair": bool(data.get("safe_for_wheelchair", False)),
                        "safe_for_truck": bool(data.get("safe_for_truck", True)),
                        "landslide_risk": data.get("landslide_risk", "none"),
                        "flood_risk": data.get("flood_risk", "none"),
                    }
                    return {
                        "summary": data.get("summary", "Gemini vision analysis complete."),
                        "road_condition": rc,
                        "advisories": data.get("advisories", []),
                        "alternate_routes_suggested": data.get("alternate_routes_suggested", []),
                        "landmarks_detected": data.get("landmarks_detected", []),
                    }
                except Exception:
                    pass
        except Exception:
            pass
    return _mock_road_condition(image_b64, image_url, context_location)


def plan_trip(
    trip_type: str,
    source: str,
    destination: str,
    start_date: Optional[str],
    constraints: List[str],
    vehicle_type: str,
) -> Dict[str, Any]:
    from app.services.logistics_service import optimize_route, RouteOptimizeRequest
    req = RouteOptimizeRequest(
        source=source, destination=destination, vehicle_type=vehicle_type if vehicle_type in {"truck","car","bus","bike","ev_truck"} else "car",
        priority="safest" if trip_type in {"accessibility", "evacuation"} else "fastest",
        consider_weather=True,
    )
    route = optimize_route(req)
    overview_intro = {
        "logistics": "Cargo shipment plan accounting for NER terrain, monsoon patterns and truck accessibility.",
        "personal": "Personal journey plan across NER with weather advisories and cultural stops.",
        "accessibility": "Accessibility-first travel plan (mobility-aware; minimises steep segments and identifies pitstops).",
        "evacuation": "Emergency evacuation plan with primary route, backups and assembly points.",
    }.get(trip_type, "Generated travel plan.")

    packing: List[str] = []
    if trip_type == "evacuation":
        packing = ["ID & important documents", "Emergency medicines (3-day)", "Water bottles + dry ration", "Torch + powerbank", "Raincoat & warm clothes", "First-aid kit"]
    elif "wheelchair" in constraints:
        packing = ["Wheelchair repair kit + spare tube", "Portable ramp (if possible)", "Medications + cooler if needed", "Rain cover for wheelchair", "Mobility contact cards"]
    else:
        packing = ["Valid permits/ILP if interstate", "Rain gear (Jun-Sep mandatory)", "Powerbank + local SIM (Jio/Airtel)", "Warm layers (higher altitude Oct-Feb)", "First-aid + motion sickness pills (hilly roads)"]
    contacts: List[Dict[str, str]] = [
        {"name": "NER Emergency Helpline (Dial 112)", "phone": "112"},
        {"name": "Assam State Disaster Management", "phone": "+91-361-2220011"},
        {"name": "Meghalaya DDMA", "phone": "+91-364-2223125"},
    ]
    itinerary: List[Dict[str, Any]] = []
    day = 1
    total_min = route.total_eta_minutes
    days_needed = max(1, int(total_min // 420) + 1) if trip_type == "personal" else 1
    per_day = max(1, len(route.segments) // days_needed)
    for i, seg in enumerate(route.segments):
        bucket = i // per_day
        title = f"Leg {i+1}: {seg.from_city} → {seg.to_city}"
        desc = f"{seg.distance_km} km via {seg.highway}. ETA ~{seg.est_time_min:.0f} min. Terrain factor {seg.terrain_factor} — accessibility rating {seg.accessibility_rating}/5."
        if seg.warnings:
            desc += f" ⚠ Warnings: {'; '.join(seg.warnings)}."
        itinerary.append({
            "day": bucket + 1,
            "title": title,
            "description": desc,
            "location": seg.to_city,
            "timing": None,
            "warnings": seg.warnings,
        })
    risk = "low"
    if any(w for w in route.weather_warnings if "Landslide" in w):
        risk = "high"
    elif route.weather_warnings:
        risk = "medium"
    return {
        "title": f"{trip_type.title()} Plan: {source} → {destination}",
        "overall_risk": risk,
        "overview": f"{overview_intro} Total {route.total_distance_km} km, ETA ~{route.total_eta_minutes/60:.1f} h, est cost ₹{route.total_cost_inr:.0f}. {len(route.weather_warnings)} active weather advisories.",
        "itinerary": itinerary,
        "packing_list": packing,
        "contacts": contacts,
    }
