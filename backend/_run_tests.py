import sys
import traceback

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print("=" * 60)
print("NER Platform: Import & Functional Tests")
print("=" * 60)

# 1. Config
try:
    from app.config import settings
    print(f"[1/9] OK  config: APP_NAME={settings.APP_NAME}, DEBUG={settings.DEBUG}")
except Exception as e:
    traceback.print_exc()
    sys.exit(1)

# 2. Data
try:
    from app.data.ner_data import CITIES, STATES, ROAD_NETWORK, WEATHER_ZONES
    print(f"[2/9] OK  ner_data: {len(STATES)} states, {len(CITIES)} cities, {len(ROAD_NETWORK)} road edges, {len(WEATHER_ZONES)} weather zones")
except Exception as e:
    traceback.print_exc()
    sys.exit(1)

# 3. Schemas
try:
    from app.models.schemas import RouteOptimizeRequest, ChatRequest, EmergencyAlert, EvacuateRequest, FeedbackItem
    print("[3/9] OK  schemas imported")
except Exception as e:
    traceback.print_exc()
    sys.exit(1)

# 4. Logistics Service
try:
    from app.services.logistics_service import optimize_route
    from app.models.schemas import RouteOptimizeRequest as R
    req = R(source="Guwahati", destination="Shillong", vehicle_type="truck")
    res = optimize_route(req)
    print(f"[4/9] OK  logistics_service: Guwahati→Shillong {res.total_distance_km}km, ETA {res.total_eta_minutes:.0f}min, ₹{res.total_cost_inr:.0f}")
except Exception as e:
    traceback.print_exc()
    sys.exit(1)

# 5. Accessibility Service
try:
    from app.services.accessibility_service import score_city, find_accessible_routes, AccessibleRouteRequest
    res = score_city("Guwahati")
    print(f"[5/9] OK  accessibility_service: score_city(Guwahati) = {res.overall_score}/10 [{res.rating} / {'♿ wheelchair' if res.wheelchair_accessible else 'wheelchair challenging'}")
    req2 = AccessibleRouteRequest(source="Guwahati", destination="Shillong", mobility_type="wheelchair", min_rating=1)
    res2 = find_accessible_routes(req2)
    print(f"       find_accessible_routes: best={'YES' if res2.best_route else 'none found'}, alternatives={len(res2.alternatives)}")
except Exception as e:
    traceback.print_exc()
    sys.exit(1)

# 6. Weather Service
try:
    import asyncio
    from app.services.weather_service import get_current_weather, weather_aware_factor
    w = asyncio.run(get_current_weather("Guwahati"))
    f = asyncio.run(weather_aware_factor(["Guwahati", "Shillong"]))
    print(f"[6/9] OK  weather_service: Guwahati {w.temp_c}°C, {w.condition}, landslide={w.landslide_warning}, flood={w.flood_warning}, risk_factors={f}")
except Exception as e:
    traceback.print_exc()
    sys.exit(1)

# 7. Emergency Service
try:
    from app.services.emergency_service import list_alerts, EmergencyAlertFilter, plan_evacuation, EvacuateRequest
    a = list_alerts(EmergencyAlertFilter())
    print(f"[7/9] OK  emergency_service: {a.count} active alerts")
    ev_req = EvacuateRequest(from_city="Shillong", to_city="Guwahati", num_people=50, special_needs=["elderly"], urgency="urgent")
    ev = plan_evacuation(ev_req)
    print(f"       plan_evacuation Shillong→Guwahati: route={'YES' if ev.primary_route else 'none'}, shelters={len(ev.shelter_list)}, contacts={len(ev.emergency_contacts)}")
except Exception as e:
    traceback.print_exc()
    sys.exit(1)

# 8. LangGraph / Agents
try:
    from app.agents.graph import run_agent_query, graph_description
    r = run_agent_query("What's the best route from Guwahati to Shillong for a truck during monsoon?")
    print(f"[8/9] OK  agents/graph: detected_agent={r.get('detected_agent')}, intent={r.get('detected_intent')}, actions={len(r.get('actions_taken', []))}")
    gd = graph_description()
    print(f"       graph_description: langgraph_available={gd['langgraph_available']}, specialists={list(gd['specialists'].keys())}")
except Exception as e:
    traceback.print_exc()
    sys.exit(1)

# 9. FastAPI App
try:
    from app.main import app
    routes = sorted([r.path for r in app.routes if hasattr(r, "path")])
    print(f"[9/9] OK  FastAPI main: {len(routes)} routes, {len(app.user_middleware)} middlewares")
    print(f"       Routes sample: {routes[:15]}")
except Exception as e:
    traceback.print_exc()
    sys.exit(1)

print("=" * 60)
print("ALL TESTS PASSED! Ready for uvicorn app.main:app --reload")
print("=" * 60)
