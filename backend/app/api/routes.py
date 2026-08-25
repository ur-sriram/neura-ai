from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Demand, Edge, ConditionReport
from app.reports import generate_report
from app.schemas import (
    AssistedMobilityRequest,
    CompareRequest,
    ConditionReportRead,
    RoadConditionReport,
    RunRequest,
    ScenarioCreate,
    PointToPointRequest,
    PointToPointResponse,
)
from app.services.scenario_service import (
    create_scenario,
    get_scenario_or_none,
    list_scenario_summaries,
    load_network,
    scenario_summary,
    seed_scenario,
    fork_scenario,
)
from app.services.simulation_service import (
    get_metrics_for_run,
    get_routes_for_run,
    get_run,
    latest_comparison,
    run_algorithms,
    find_point_to_point_route,
)
from app.services.analytics_service import get_model_performance

router = APIRouter()


def ok(data=None, message: str = "ok") -> dict:
    return {"success": True, "message": message, "data": jsonable_encoder(data)}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@router.get("/health")
def health() -> dict:
    return ok({"status": "healthy", "service": "ne-setu-api"})


# ---------------------------------------------------------------------------
# Scenarios
# ---------------------------------------------------------------------------

@router.get("/scenarios")
def list_scenarios(db: Session = Depends(get_db)) -> dict:
    return ok(list_scenario_summaries(db))


@router.post("/scenarios", status_code=201)
def create_scenario_endpoint(payload: ScenarioCreate, db: Session = Depends(get_db)) -> dict:
    scenario = create_scenario(db, payload)
    return ok(scenario_summary(db, scenario), "scenario_created")


@router.get("/scenarios/{scenario_id}")
def get_scenario(scenario_id: int, db: Session = Depends(get_db)) -> dict:
    scenario = get_scenario_or_none(db, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return ok(scenario_summary(db, scenario))


@router.post("/scenarios/{scenario_id}/seed")
def seed_scenario_endpoint(scenario_id: int, db: Session = Depends(get_db)) -> dict:
    scenario = seed_scenario(db, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return ok(scenario_summary(db, scenario), "scenario_seeded")


@router.post("/scenarios/{scenario_id}/fork")
def fork_scenario_endpoint(scenario_id: int, db: Session = Depends(get_db)) -> dict:
    forked = fork_scenario(db, scenario_id)
    if forked is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return ok(scenario_summary(db, forked), "scenario_forked")


# ---------------------------------------------------------------------------
# Network
# ---------------------------------------------------------------------------

@router.get("/scenarios/{scenario_id}/network")
def get_network(scenario_id: int, db: Session = Depends(get_db)) -> dict:
    if get_scenario_or_none(db, scenario_id) is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return ok(load_network(db, scenario_id))


@router.get("/scenarios/{scenario_id}/demands")
def get_demands(scenario_id: int, db: Session = Depends(get_db)) -> dict:
    if get_scenario_or_none(db, scenario_id) is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return ok(load_network(db, scenario_id)["demands"])


@router.get("/scenarios/{scenario_id}/vehicles")
def get_vehicles(scenario_id: int, db: Session = Depends(get_db)) -> dict:
    if get_scenario_or_none(db, scenario_id) is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return ok(load_network(db, scenario_id)["vehicles"])


# ---------------------------------------------------------------------------
# NE-SETU: Model Performance / Analytics
# ---------------------------------------------------------------------------

@router.get("/scenarios/{scenario_id}/model-performance")
def get_model_performance_endpoint(scenario_id: int, db: Session = Depends(get_db)) -> dict:
    if get_scenario_or_none(db, scenario_id) is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return ok(get_model_performance(db, scenario_id), "model_performance_fetched")


# ---------------------------------------------------------------------------
# NE-SETU: Event Ingestion API (Road Condition Reports)
# ---------------------------------------------------------------------------

@router.post("/scenarios/{scenario_id}/reports")
def submit_road_condition_report(
    scenario_id: int,
    payload: RoadConditionReport,
    db: Session = Depends(get_db),
) -> dict:
    """Community / operator road condition report.

    Mutates the Living Network State (LNS):
    - CLOSED: sets is_blocked = True on the edge
    - SUSPECTED: increases congestion_factor
    - OPEN: resets the edge to normal
    """
    if get_scenario_or_none(db, scenario_id) is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    edge = db.get(Edge, payload.edge_id)
    if edge is None or edge.scenario_id != scenario_id:
        raise HTTPException(status_code=404, detail="Edge not found in this scenario")

    if payload.status == "CLOSED":
        edge.is_blocked = True
        edge.congestion_factor = 10.0
    elif payload.status == "SUSPECTED":
        edge.is_blocked = False
        edge.congestion_factor = max(edge.congestion_factor, 1.5 + payload.severity * 0.3)
    elif payload.status == "OPEN":
        edge.is_blocked = False
        edge.congestion_factor = 1.0

    trust_scores = {
        "sensor": 1.0,
        "operator": 0.9,
        "community": 0.6
    }
    
    report = ConditionReport(
        scenario_id=scenario_id,
        edge_id=edge.id,
        status=payload.status,
        source_type=payload.source_type,
        severity=payload.severity,
        description=payload.description,
        trust_score=trust_scores.get(payload.source_type, 0.5)
    )
    db.add(report)

    db.commit()

    return ok({
        "edge_id": edge.id,
        "is_blocked": edge.is_blocked,
        "congestion_factor": edge.congestion_factor,
        "report_id": report.id
    })

@router.get("/scenarios/{scenario_id}/reports", response_model=dict)
def get_condition_reports(scenario_id: int, db: Session = Depends(get_db)):
    reports = db.query(ConditionReport).filter(ConditionReport.scenario_id == scenario_id).order_by(ConditionReport.reported_at.desc()).all()
    return ok([ConditionReportRead.model_validate(r).model_dump() for r in reports])


# ---------------------------------------------------------------------------
# NE-SETU: Assisted Mobility Request
# ---------------------------------------------------------------------------

@router.post("/scenarios/{scenario_id}/assisted-mobility", status_code=201)
def submit_assisted_mobility_request(
    scenario_id: int,
    payload: AssistedMobilityRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Submit an Assisted Mobility Request — a demand where cargo is a person.

    Automatically sets requires_accessibility = True so the optimizer
    only assigns accessibility-equipped vehicles.
    """
    scenario = get_scenario_or_none(db, scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    demand = Demand(
        scenario_id=scenario_id,
        node_id=payload.node_id,
        name=payload.name,
        quantity=1,  # 1 person
        priority=payload.priority,
        time_window_start_min=0.0,
        time_window_end_min=60.0,  # 1 hour deadline
        service_time_min=10.0,
        cargo_type="person",
        requires_accessibility=True,
    )
    db.add(demand)
    db.commit()
    db.refresh(demand)

    return ok({
        "demand_id": demand.id,
        "name": demand.name,
        "node_id": demand.node_id,
        "priority": demand.priority,
        "requires_accessibility": demand.requires_accessibility,
    }, "assisted_mobility_request_created")


# ---------------------------------------------------------------------------
# Simulation
# ---------------------------------------------------------------------------

@router.post("/scenarios/{scenario_id}/run")
def run_scenario(scenario_id: int, payload: RunRequest, db: Session = Depends(get_db)) -> dict:
    try:
        run = run_algorithms(db, scenario_id, [payload.algorithm], payload.objective, payload.parameters)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ok(run, "simulation_completed")


@router.post("/scenarios/{scenario_id}/route", response_model=dict)
def get_point_to_point_route(
    scenario_id: int,
    payload: PointToPointRequest,
    db: Session = Depends(get_db),
) -> dict:
    try:
        route_response = find_point_to_point_route(db, scenario_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ok(route_response, "route_calculated")


@router.get("/simulation-runs/{run_id}")
def read_run(run_id: int, db: Session = Depends(get_db)) -> dict:
    run = get_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return ok(run)


@router.get("/simulation-runs/{run_id}/routes")
def read_routes(run_id: int, db: Session = Depends(get_db)) -> dict:
    if get_run(db, run_id) is None:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return ok(get_routes_for_run(db, run_id))


@router.get("/simulation-runs/{run_id}/metrics")
def read_metrics(run_id: int, db: Session = Depends(get_db)) -> dict:
    if get_run(db, run_id) is None:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return ok(get_metrics_for_run(db, run_id))


@router.post("/scenarios/{scenario_id}/compare")
def compare_algorithms(scenario_id: int, payload: CompareRequest, db: Session = Depends(get_db)) -> dict:
    try:
        run = run_algorithms(db, scenario_id, payload.algorithms, payload.objective, payload.parameters)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ok(run, "comparison_completed")


@router.get("/scenarios/{scenario_id}/comparison")
def get_comparison(scenario_id: int, db: Session = Depends(get_db)) -> dict:
    if get_scenario_or_none(db, scenario_id) is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return ok(latest_comparison(db, scenario_id))


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

@router.post("/reports/{run_id}/generate")
def generate_report_endpoint(run_id: int, db: Session = Depends(get_db)) -> dict:
    try:
        markdown, generated_by = generate_report(db, run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ok({"run_id": run_id, "markdown": markdown, "generated_by": generated_by}, "report_generated")
