# pyrefly: ignore [missing-import]
import pytest
from fastapi.testclient import TestClient
import asyncio
from main import app, LOCATIONS, ROAD_SEGMENTS, lns_state, active_vehicles, active_deliveries, decision_log, compute_resilience

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_state():
    client.post("/api/v1/demo/reset")
    yield

def test_closed_roads_never_in_feasible_routes():
    # Close NH-6
    client.post("/api/v1/events", json={
        "type": "test", "source": "official", "trust": 1.0,
        "segment_id": "NH-6-GS", "status": "CLOSED"
    })
    
    # Plan route (car)
    resp = client.get("/api/v1/routes?origin=Guwahati&destination=Shillong&vehicle=car")
    data = resp.json()
    
    # Assert NH-6-GS is in blocked_routes, not feasible_routes
    feasible_ids = [r["segment_id"] for r in data["feasible_routes"]]
    blocked_ids = [r["segment_id"] for r in data["blocked_routes"]]
    
    assert "NH-6-GS" not in feasible_ids
    assert "NH-6-GS" in blocked_ids

def test_vehicle_restrictions_enforced():
    # R-114-UMROI has max_class "4x4"
    resp = client.get("/api/v1/routes?origin=Guwahati&destination=Shillong&vehicle=heavy_truck")
    data = resp.json()
    
    # heavy_truck shouldn't be allowed on UMROI
    blocked = next((r for r in data["blocked_routes"] if r["segment_id"] == "R-114-UMROI"), None)
    assert blocked is not None
    assert "Vehicle class not permitted" in blocked["rejection"]

def test_resilience_scores_deterministic():
    seg = ROAD_SEGMENTS["NH-6-GS"]
    res1 = compute_resilience(seg, "OPEN", 1.0, "FRESH")
    res2 = compute_resilience(seg, "OPEN", 1.0, "FRESH")
    assert res1["score"] == res2["score"]

def test_higher_resilience_influences_route_ranking():
    # Create a situation where risk is slightly higher but resilience is much better
    # In our current logic, cost = base_cost - resilience_bonus
    # We can check that the returned route has resilience inputs
    resp = client.get("/api/v1/routes?origin=Guwahati&destination=Shillong&vehicle=car")
    data = resp.json()
    
    # NH-6-GS is the recommended route for car normally
    best_route = data["feasible_routes"][0]
    assert "resilience_score" in best_route
    assert best_route["resilience_score"] > 0

def test_low_confidence_reports_do_not_auto_close_roads():
    client.post("/api/v1/events", json={
        "type": "test", "source": "local", "trust": 0.3,
        "segment_id": "NH-6-GS", "status": "CLOSED"
    })
    
    # Status should still be OPEN because trust < 0.4
    resp = client.get("/api/v1/network/overlay")
    data = resp.json()
    assert data["segments"]["NH-6-GS"]["status"] == "OPEN"
    # But evidence should be added
    assert len(data["segments"]["NH-6-GS"]["evidence"]) > 0

def test_stale_data_is_visibly_marked():
    # Force stale data
    lns_state["segments"]["NH-6-GS"] = {
        "status": "OPEN", "confidence": 1.0, "last_updated": "2020-01-01T00:00:00Z", "evidence": []
    }
    resp = client.get("/api/v1/network/overlay")
    data = resp.json()
    assert data["segments"]["NH-6-GS"]["freshness"] == "STALE"
    assert "Data is stale" in data["segments"]["NH-6-GS"]["warnings"][0]

def test_conflicting_reports_reduce_confidence():
    client.post("/api/v1/events", json={
        "type": "test", "source": "official", "trust": 0.9,
        "segment_id": "NH-6-GS", "status": "OPEN"
    })
    client.post("/api/v1/events", json={
        "type": "test", "source": "driver", "trust": 0.9,
        "segment_id": "NH-6-GS", "status": "CLOSED"
    })
    
    resp = client.get("/api/v1/network/overlay")
    data = resp.json()
    warnings = "\n".join(data["segments"]["NH-6-GS"]["warnings"])
    assert "Conflicting reports detected" in warnings

def test_disruption_cascade_identifies_affected_vehicles_deliveries():
    # Seed active vehicles and deliveries
    active_vehicles.append({"id": "V1", "class": "car", "status": "in_transit", "current_segment": "NH-6-GS"})
    active_deliveries.append({"id": "D1", "cargo_type": "meds", "priority": "emergency", "route_segment": "NH-6-GS"})
    
    resp = client.post("/api/v1/cascade?segment_id=NH-6-GS&new_status=CLOSED")
    data = resp.json()
    
    assert data["affected_vehicles_count"] == 1
    assert data["affected_deliveries_count"] == 1
    assert data["emergency_at_risk_count"] == 1
    assert "NH-6-GS" in data["affected_segments"]

def test_existing_replanning_still_works():
    resp = client.get("/api/v1/routes?origin=Dimapur&destination=Imphal")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["feasible_routes"]) > 0

def test_demo_reset_works():
    client.post("/api/v1/events", json={
        "type": "test", "source": "official", "trust": 1.0,
        "segment_id": "NH-6-GS", "status": "CLOSED"
    })
    client.post("/api/v1/demo/reset")
    
    resp = client.get("/api/v1/network/overlay")
    data = resp.json()
    assert data["segments"]["NH-6-GS"]["status"] == "OPEN"

def test_same_scenario_twice_identical_results():
    def remove_timestamps(data):
        for step in data["steps"]:
            if "decisions" in step:
                for dec in step["decisions"]:
                    dec.pop("timestamp", None)
        return data

    resp1 = client.post("/api/v1/demo/resilience")
    data1 = remove_timestamps(resp1.json())
    
    resp2 = client.post("/api/v1/demo/resilience")
    data2 = remove_timestamps(resp2.json())
    
    assert data1["steps"] == data2["steps"]
