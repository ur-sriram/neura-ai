import re
from typing import Dict, Any, List

from app.agents.state import NERGraphState, AgentName
from app.data.ner_data import CITIES, STATES
from app.services.logistics_service import optimize_route, RouteOptimizeRequest
from app.services.accessibility_service import score_city, find_accessible_routes, AccessibleRouteRequest
from app.services.emergency_service import plan_evacuation, EvacuateRequest, list_alerts, EmergencyAlertFilter
from app.services.gemini_service import chat_with_ai


def _extract_cities(text: str) -> List[str]:
    found = []
    for c in CITIES:
        if re.search(r"\b" + re.escape(c) + r"\b", text, flags=re.IGNORECASE):
            found.append(c)
    if not found:
        for c in CITIES:
            if c.lower() in text.lower():
                found.append(c)
    return list(dict.fromkeys(found))


def _extract_states(text: str) -> List[str]:
    found = []
    for s in STATES:
        if re.search(r"\b" + re.escape(s) + r"\b", text, flags=re.IGNORECASE):
            found.append(s)
    return found


def _classify_intent(msg: str) -> tuple[str, AgentName, float]:
    m = msg.lower()
    scores: Dict[AgentName, float] = {
        "logistics": 0.0,
        "accessibility": 0.0,
        "emergency": 0.0,
        "community": 0.0,
    }
    for kw in ["route", "optimize", "shipment", "ship", "delivery", "logistics", "truck", "distance", "eta", "cargo", "go from", "reach", "travel", "way to", "how to get"]:
        if kw in m:
            scores["logistics"] += 0.18
    for kw in ["track", "tracking"]:
        if kw in m:
            scores["logistics"] += 0.25
    for kw in ["wheelchair", "accessibility", "accessible", "disability", "ramp", "disable", "stroller", "walker", "poi", "elderly access", "access"]:
        if kw in m:
            scores["accessibility"] += 0.22
    for kw in ["accessibility score", "how accessible", "accessibility rating"]:
        if kw in m:
            scores["accessibility"] += 0.3
    for kw in ["evacuate", "evacuation", "flood", "landslide", "disaster", "rescue", "alert", "quake", "earthquake", "cyclone", "avalanche", "emergency", "sos"]:
        if kw in m:
            scores["emergency"] += 0.3
    for kw in ["community", "hub", "partner", "cooperative", "shg", "feedback", "local", "ngo", "women group", "self help", "volunteer"]:
        if kw in m:
            scores["community"] += 0.22
    best_agent: AgentName = "logistics"
    best_score = 0.0
    for a, s in scores.items():
        if s > best_score:
            best_score = s
            best_agent = a
    if best_score < 0.15:
        intent_label = "general.greeting"
        best_agent = "logistics"
        best_score = 0.2
    else:
        intent_map = {
            "logistics": "logistics.route_or_shipment",
            "accessibility": "accessibility.assessment",
            "emergency": "emergency.response",
            "community": "community.support",
        }
        intent_label = intent_map[best_agent]
    return intent_label, best_agent, min(best_score, 0.99)


def supervisor_node(state: NERGraphState) -> Dict[str, Any]:
    msg = state.get("user_message", "")
    override = state.get("agent_override")
    cities = _extract_cities(msg)
    states_m = _extract_states(msg)
    intent, agent, conf = _classify_intent(msg)
    if override:
        agent = override
        conf = max(conf, 0.9)
    constraints = []
    for kw in ["wheelchair", "walker", "stroller", "elderly", "children", "pets", "medical", "no tolls", "avoid", "ev", "electric", "express", "safest"]:
        if kw in msg.lower():
            constraints.append(kw)
    notes = [
        f"Supervisor classified intent={intent} via keyword scoring (confidence {conf:.2f}).",
        f"Routing to {agent.upper()}Agent.",
    ]
    if cities:
        notes.append(f"Cities mentioned: {', '.join(cities)}")
    if states_m:
        notes.append(f"States mentioned: {', '.join(states_m)}")
    return {
        "detected_intent": intent,
        "detected_agent": agent,
        "intent_confidence": conf,
        "cities": cities,
        "states_mentioned": states_m,
        "constraints": constraints,
        "special_needs": [c for c in constraints if c in ["wheelchair", "elderly", "children", "medical", "pets"]],
        "entities": {"cities": cities, "states": states_m},
        "supervisor_notes": notes,
        "actions_taken": [f"supervisor: classify intent → {intent}", f"supervisor: dispatch to {agent}"],
    }


def router_after_supervisor(state: NERGraphState) -> AgentName:
    return state.get("detected_agent", "logistics")


def logistics_agent_node(state: NERGraphState) -> Dict[str, Any]:
    msg = state.get("user_message", "")
    cities = state.get("cities", [])
    constraints = state.get("constraints", [])
    vehicle = "truck" if "truck" in msg.lower() else "bus" if "bus" in msg.lower() else "car"
    priority = "safest" if "safest" in constraints or "safe" in msg.lower() else "shortest" if "shortest" in msg.lower() else "fastest"
    result = None
    actions = ["logistics: prepare request"]
    if len(cities) >= 2:
        try:
            req = RouteOptimizeRequest(
                source=cities[0], destination=cities[1],
                vehicle_type=vehicle if vehicle in ("truck","car","bus","bike","ev_truck") else "car",
                priority=priority,
                consider_weather=True,
            )
            opt = optimize_route(req)
            result = {
                "source": opt.source,
                "destination": opt.destination,
                "total_distance_km": opt.total_distance_km,
                "total_eta_minutes": opt.total_eta_minutes,
                "total_cost_inr": opt.total_cost_inr,
                "segments_count": len(opt.segments),
                "segments": [s.model_dump() for s in opt.segments[:8]],
                "weather_warnings": opt.weather_warnings,
                "advisories": opt.advisories,
                "alternatives_count": len(opt.alternative_routes),
            }
            actions.append(f"logistics: optimize route A* {cities[0]}→{cities[1]} via {len(opt.segments)} segments")
        except Exception as e:
            result = {"error": str(e)}
            actions.append(f"logistics: optimize failed: {e}")
    else:
        actions.append("logistics: need 2 cities; skipping optimization, reply will ask user")
    reply_parts = ["**LogisticsAgent Summary**"]
    if result and "error" not in result:
        reply_parts.append(f"Route: {result['source']} → {result['destination']}")
        reply_parts.append(f"Distance: {result['total_distance_km']} km • ETA: {result['total_eta_minutes']/60:.1f} h • Est. cost: ₹{result['total_cost_inr']:,.0f}")
        if result.get("weather_warnings"):
            reply_parts.append(f"🌧 Weather advisories ({len(result['weather_warnings'])}): " + " | ".join(result["weather_warnings"][:3]))
        if result.get("advisories"):
            reply_parts.append("ℹ " + " | ".join(result["advisories"]))
    else:
        reply_parts.append("I can optimize routes between NER cities (Guwahati, Shillong, Imphal, Aizawl, Dimapur, Itanagar, Gangtok, Agartala, Dibrugarh, etc.). Please specify source and destination.")
    sources = ["NER Road Network (NetworkX A*)", "WeatherService: WEATHER_CURRENT + ZONES", "LogisticsService"]
    followups = [
        f"Optimize {cities[0]}→{cities[1]} (safest priority)" if len(cities)>=2 else "Optimize route Guwahati → Imphal",
        "Track shipment SHP-EXAMPLE",
        "List recent shipments",
    ]
    return {
        "logistics_result": result,
        "actions_taken": actions,
        "final_reply": "\n".join(reply_parts),
        "sources": sources,
        "suggested_followups": followups,
    }


def accessibility_agent_node(state: NERGraphState) -> Dict[str, Any]:
    msg = state.get("user_message", "")
    cities = state.get("cities", [])
    constraints = state.get("constraints", [])
    mobility = "wheelchair" if "wheelchair" in constraints else "walker" if "walker" in constraints else "stroller" if "stroller" in constraints else "none"
    actions = ["accessibility: parse request"]
    score = None
    route_res = None
    if cities:
        try:
            score_res = score_city(cities[0])
            if score_res:
                score = score_res.model_dump()
                actions.append(f"accessibility: scored {cities[0]} (overall {score['overall_score']}, rating {score['rating']})")
        except Exception as e:
            actions.append(f"accessibility: score failed: {e}")
        if len(cities) >= 2:
            try:
                req = AccessibleRouteRequest(
                    source=cities[0], destination=cities[1],
                    mobility_type=mobility if mobility in ("wheelchair","walker","stroller","none") else "wheelchair",
                    min_rating=2,
                )
                acc_r = find_accessible_routes(req)
                route_res = acc_r.model_dump()
                actions.append(f"accessibility: route {cities[0]}→{cities[1]} (best accessibility {acc_r.best_route.accessibility_score if acc_r.best_route else 'N/A'})")
            except Exception as e:
                actions.append(f"accessibility: route failed: {e}")
    reply = ["**AccessibilityAgent Summary**"]
    if score:
        reply.append(f"{score['location']}: overall {score['overall_score']}/10 → rating **{score['rating']}** {'♿ Wheelchair-friendly' if score['wheelchair_accessible'] else '⚠ Wheelchair difficult'}.")
        if score.get("recommendations"):
            reply.append("Recommendations: " + " • ".join(score["recommendations"][:3]))
    if route_res and route_res.get("best_route"):
        br = route_res["best_route"]
        reply.append(f"Route: {br['accessibility_score']:.2f} accessibility • {br['total_distance_km']} km • ETA {br['eta_min']:.0f} min • {len(br['waypoints'])} waypoints.")
        if br.get("steep_segments"):
            reply.append(f"⚠ Steep segments: {', '.join(br['steep_segments'][:3])}")
    if not score and not route_res:
        reply.append("Specify a city (e.g. 'accessibility score in Guwahati') or a route ('wheelchair route Imphal to Thoubal') and I'll compute details.")
    sources = ["ACCESSIBILITY_POIS", "HOSPITALS dataset", "AccessibilityService", "NetworkX weighted graph"]
    followups = [
        f"Score accessibility in {cities[0]}" if cities else "Score Guwahati",
        "List wheelchair-friendly POIs in Shillong",
        "Plan wheelchair-accessible tour" if mobility == "wheelchair" else "Wheelchair accessible route from Shillong",
    ]
    return {
        "accessibility_result": {"score": score, "route": route_res},
        "actions_taken": actions,
        "final_reply": "\n".join(reply),
        "sources": sources,
        "suggested_followups": followups,
    }


def emergency_agent_node(state: NERGraphState) -> Dict[str, Any]:
    msg = state.get("user_message", "")
    cities = state.get("cities", [])
    special_needs = state.get("special_needs", [])
    actions = ["emergency: parse request"]
    alerts_filter = EmergencyAlertFilter(active_only=True)
    if any(s in ("Assam","Meghalaya","Manipur","Tripura","Mizoram","Nagaland","Arunachal Pradesh","Sikkim") for s in state.get("states_mentioned", [])):
        for s in state.get("states_mentioned", []):
            alerts_filter.state = s
            break
    alerts = list_alerts(alerts_filter).model_dump()
    actions.append(f"emergency: queried active alerts → {alerts['count']} found")
    evac_result = None
    urgent = "immediate" if "immediate" in msg.lower() or "now" in msg.lower() or "sos" in msg.lower() else "urgent"
    if len(cities) >= 1 and ("evacuate" in msg.lower() or "evacuation" in msg.lower() or "urgent" in msg.lower()):
        try:
            req = EvacuateRequest(
                from_city=cities[0],
                to_city=cities[1] if len(cities) >= 2 else None,
                num_people=100,
                special_needs=[s for s in special_needs if s in ("wheelchair","elderly","children","medical","pets")],
                urgency=urgent,
            )
            ev = plan_evacuation(req)
            evac_result = ev.model_dump()
            actions.append(f"emergency: evacuation plan {ev.from_city}→{ev.recommended_city} (urgency={urgent})")
        except Exception as e:
            actions.append(f"emergency: evacuation failed {e}")
    reply = ["**EmergencyAgent Summary**"]
    if alerts["count"]:
        top = alerts["items"][:3]
        reply.append(f"⚠ Active alerts ({alerts['count']} total):")
        for a in top:
            reply.append(f"  • [{a['severity'].upper()}] {a['type']} in {a['state']} — {a['headline']}")
    else:
        reply.append("No active state-filtered alerts right now. Always call Dial 112 in real emergency.")
    if evac_result:
        pr = evac_result.get("primary_route")
        if pr:
            reply.append(f"🚑 Evacuation route: {' → '.join(pr['route'])} • {pr['distance_km']} km • ETA {pr['eta_min']:.0f} min • {'♿ accessible' if pr.get('accessible') else 'limited accessibility'}")
            reply.append(f"Block risk: {pr.get('block_risk','clear')}")
        if evac_result.get("checklists"):
            reply.append("Checklist: " + " • ".join(evac_result["checklists"][:4]))
    reply.append("📞 In real emergency: DIAL 112 immediately; do not rely on platform alone.")
    sources = ["WEATHER_ZONES chronic risk", "EmergencySeed (6 live alerts)", "EmergencyService", "BRO / DDMA contacts"]
    followups = [
        "List all active emergency alerts",
        f"Evacuation from {cities[0]}" if cities else "Evacuation from Shillong",
        "What disaster risk is highest in Arunachal Pradesh?",
    ]
    return {
        "emergency_result": {"alerts": alerts, "evacuation": evac_result},
        "actions_taken": actions,
        "final_reply": "\n".join(reply),
        "sources": sources,
        "suggested_followups": followups,
    }


def community_agent_node(state: NERGraphState) -> Dict[str, Any]:
    msg = state.get("user_message", "")
    states_m = state.get("states_mentioned", [])
    cities = state.get("cities", [])
    actions = ["community: parse request"]
    from app.data.ner_data import COMMUNITY_HUBS
    hubs = COMMUNITY_HUBS
    filtered = []
    for h in hubs:
        if states_m and h["state"] not in states_m:
            continue
        if cities and h["city"] not in cities:
            continue
        if any(k in msg.lower() for k in h["partner_type"].split()):
            filtered.append(h)
        elif any(re.search(r"\b" + re.escape(svc.split("_")[0]) + r"\w*", msg.lower()) for svc in h["services"]):
            filtered.append(h)
    if not filtered and (states_m or cities):
        filtered = [h for h in hubs if (not states_m or h["state"] in states_m) and (not cities or h["city"] in cities)]
    if not filtered:
        filtered = hubs[:6]
    actions.append(f"community: matched {len(filtered)} hubs")
    reply = ["**CommunityAgent Summary**"]
    if filtered:
        reply.append(f"Matched {len(filtered)} community partners/hubs:")
        for h in filtered[:5]:
            reply.append(f"  • {h['name']} ({h['partner_type']}) — {h['city']}, {h['state']} • {len(h['services'])} services • {h['contact']}")
    else:
        reply.append("18 hubs registered across NER (government, cooperative, NGO, volunteer, interstate_body, industry). Filter by state/city/service.")
    if "feedback" in msg.lower():
        reply.append("\nTo submit feedback: call POST /api/communities/feedback with {category, city, rating 1-5, comment}. Auto-sentiment + agent assignment is applied.")
    sources = ["COMMUNITY_HUBS (18 entries)", "FeedbackStore", "CommunityAgent"]
    followups = [
        f"List community hubs in {states_m[0]}" if states_m else "List hubs in Mizoram",
        "Find women SHG hubs in NER",
        "Submit feedback about road in Shillong",
    ]
    return {
        "community_result": {"hubs_matched": [dict(h) for h in filtered[:10]], "count": len(filtered)},
        "actions_taken": actions,
        "final_reply": "\n".join(reply),
        "sources": sources,
        "suggested_followups": followups,
    }


def aggregate_node(state: NERGraphState) -> Dict[str, Any]:
    reply = state.get("final_reply", "")
    supervisor_notes = state.get("supervisor_notes", [])
    actions = state.get("actions_taken", [])
    sources = state.get("sources", [])
    followups = state.get("suggested_followups", [])
    agent = state.get("detected_agent", "logistics")
    if supervisor_notes:
        reply = reply + "\n\n---\n*Supervisor note:* " + " ".join(supervisor_notes[-1:])
    combined_actions = actions + [f"aggregator: finalize response from {agent}Agent"]
    return {
        "final_reply": reply,
        "sources": list(dict.fromkeys(sources)),
        "suggested_followups": list(dict.fromkeys(followups))[:4],
        "actions_taken": combined_actions,
    }
