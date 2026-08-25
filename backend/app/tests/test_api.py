import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite://"
os.environ["AUTO_SEED_DEFAULTS"] = "false"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.seeds.seed_data import seed_default_scenarios


engine = create_engine(
    "sqlite+pysqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
Base.metadata.create_all(engine)
with TestingSessionLocal() as seed_db:
    seed_default_scenarios(seed_db)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app = create_app()
app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "healthy"


def test_scenario_list_and_network_endpoint():
    response = client.get("/api/scenarios")
    payload = response.json()

    assert response.status_code == 200
    assert payload["success"] is True
    assert len(payload["data"]) >= 6
    first = payload["data"][0]
    assert "priority_distribution" in first
    assert "expected_challenge" in first

    scenario_id = payload["data"][0]["id"]
    network_response = client.get(f"/api/scenarios/{scenario_id}/network")
    network = network_response.json()["data"]

    assert network_response.status_code == 200
    assert len(network["nodes"]) >= 25
    assert len(network["vehicles"]) >= 3
    assert len(network["demands"]) >= 6


def test_run_simulation_and_read_metrics():
    scenario_id = client.get("/api/scenarios").json()["data"][0]["id"]

    run_response = client.post(
        f"/api/scenarios/{scenario_id}/run",
        json={"algorithm": "greedy", "objective": "minimize_total_distance", "parameters": {}},
    )
    run_payload = run_response.json()

    assert run_response.status_code == 200
    assert run_payload["data"]["status"] == "completed"

    run_id = run_payload["data"]["id"]
    metrics_response = client.get(f"/api/simulation-runs/{run_id}/metrics")
    metric_names = {item["metric_name"] for item in metrics_response.json()["data"]}

    assert "total_distance" in metric_names
    assert "completion_rate" in metric_names


def test_compare_endpoint_returns_ranked_summary_without_breaking_metrics_shape():
    scenario_id = client.get("/api/scenarios").json()["data"][0]["id"]

    compare_response = client.post(
        f"/api/scenarios/{scenario_id}/compare",
        json={
            "algorithms": ["greedy", "priority", "astar"],
            "objective": "weighted_multi_objective",
            "parameters": {"vehicle_count": 2, "demand_scale": 1.1, "congestion_ratio": 0.2},
        },
    )
    assert compare_response.status_code == 200
    run_id = compare_response.json()["data"]["id"]

    comparison_response = client.get(f"/api/scenarios/{scenario_id}/comparison")
    comparison = comparison_response.json()["data"]

    assert comparison["run_id"] == run_id
    assert len(comparison["algorithms"]) == 3
    assert {"algorithm", "metrics"}.issubset(comparison["algorithms"][0].keys())
    assert "summary" in comparison
    assert "best_by" in comparison["summary"]
    assert "total_distance" in comparison["summary"]["best_by"]
    assert "ranking" in comparison["summary"]
    assert comparison["summary"]["ranking"][0]["score"] >= comparison["summary"]["ranking"][-1]["score"]
    assert "weighted_score_model" in comparison["summary"]
    assert comparison["summary"]["weighted_score_model"]["weights"]["completion_rate"] == 0.30
    assert "metric_explanations" in comparison["summary"]
    assert "total_distance" in comparison["summary"]["metric_explanations"]


def test_report_generation_includes_comparison_and_engineering_sections():
    scenario_id = client.get("/api/scenarios").json()["data"][0]["id"]
    run_id = client.post(
        f"/api/scenarios/{scenario_id}/compare",
        json={"algorithms": ["greedy", "priority"], "objective": "weighted_multi_objective", "parameters": {}},
    ).json()["data"]["id"]

    report_response = client.post(f"/api/reports/{run_id}/generate")
    report = report_response.json()["data"]

    assert report_response.status_code == 200
    assert report["generated_by"].startswith("deterministic-template")
    assert "## Algorithm Comparison" in report["markdown"]
    assert "## Metric Comparison Table" in report["markdown"]
    assert "## Best Algorithm Summary" in report["markdown"]
    assert "## Bottleneck Analysis" in report["markdown"]
    assert "## Engineering Recommendations" in report["markdown"]
    assert "Weighted score" in report["markdown"]


def test_missing_resources_return_unified_error_envelope():
    response = client.get("/api/scenarios/999999")

    assert response.status_code == 404
    assert response.json()["success"] is False
    assert "not found" in response.json()["message"].lower()
    assert response.json()["data"] is None


def test_validation_errors_return_unified_error_envelope():
    scenario_id = client.get("/api/scenarios").json()["data"][0]["id"]

    response = client.post(
        f"/api/scenarios/{scenario_id}/run",
        json={"algorithm": "unknown", "objective": "minimize_total_distance", "parameters": {}},
    )

    assert response.status_code == 422
    assert response.json()["success"] is False
    assert "validation" in response.json()["message"].lower()


def test_compare_rejects_unknown_algorithm():
    scenario_id = client.get("/api/scenarios").json()["data"][0]["id"]

    response = client.post(
        f"/api/scenarios/{scenario_id}/compare",
        json={"algorithms": ["greedy", "not_real"], "objective": "weighted_multi_objective", "parameters": {}},
    )

    assert response.status_code == 422
    assert response.json()["success"] is False


def test_empty_scenario_network_and_run_do_not_crash():
    create_response = client.post(
        "/api/scenarios",
        json={"name": "Empty Acceptance Scenario", "description": "No seed data yet.", "scenario_type": "custom"},
    )
    scenario_id = create_response.json()["data"]["id"]

    network_response = client.get(f"/api/scenarios/{scenario_id}/network")
    network = network_response.json()["data"]
    run_response = client.post(
        f"/api/scenarios/{scenario_id}/run",
        json={"algorithm": "greedy", "objective": "minimize_total_distance", "parameters": {}},
    )
    run_id = run_response.json()["data"]["id"]
    metrics = client.get(f"/api/simulation-runs/{run_id}/metrics").json()["data"]

    assert network == {"nodes": [], "edges": [], "depots": [], "vehicles": [], "demands": []}
    assert run_response.status_code == 200
    assert any(item["metric_name"] == "completion_rate" and item["metric_value"] == 1.0 for item in metrics)
