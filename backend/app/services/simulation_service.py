from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
import networkx as nx

from app.algorithms.dispatch_greedy import greedy_dispatch
from app.algorithms.dispatch_ortools import ortools_cvrp_dispatch
from app.algorithms.dispatch_priority import priority_dispatch
from app.algorithms.graph import build_constrained_graph, path_cost, path_risk
from app.algorithms.metrics import compute_metrics
from app.algorithms.shortest_path import find_path
from app.algorithms.types import DispatchResult, VehicleInput
from app.models import AlgorithmConfig, DispatchPlan, MetricResult, Route, SimulationRun
from app.schemas import PointToPointRequest, PointToPointResponse
from app.services.scenario_service import algorithm_inputs, get_scenario_or_none


METRIC_UNITS = {
    "total_distance": "km",
    "average_response_time": "min",
    "max_response_time": "min",
    "completion_rate": "ratio",
    "priority_completion_rate": "ratio",
    "vehicle_utilization": "ratio",
    "delayed_demands": "count",
    "unserved_demands": "count",
    "algorithm_runtime_ms": "ms",
}

METRIC_EXPLANATIONS = {
    "total_distance": "Total route distance traveled by all vehicles. Lower is better.",
    "average_response_time": "Average arrival time for served demand points. Lower is better.",
    "max_response_time": "Worst-case arrival time among served demand points. Lower is better.",
    "completion_rate": "Share of demand points served by the dispatch plan. Higher is better.",
    "priority_completion_rate": "Priority-weighted completion ratio for urgent demands. Higher is better.",
    "vehicle_utilization": "Served load divided by available vehicle capacity. Higher means resources are used more fully.",
    "delayed_demands": "Number of served demands arriving after their time window. Lower is better.",
    "unserved_demands": "Number of demand points not assigned to any route. Lower is better.",
    "algorithm_runtime_ms": "Algorithm execution time in milliseconds. Lower is better.",
}

WEIGHTED_SCORE_MODEL = {
    "formula": (
        "score = 0.30 * completion_rate + 0.25 * priority_completion_rate "
        "+ 0.20 * normalized_response_time_score + 0.15 * normalized_distance_score "
        "+ 0.10 * normalized_runtime_score"
    ),
    "normalization": (
        "For lower-is-better metrics, normalized_score = 1 - (value - min_value) / "
        "(max_value - min_value). If all compared algorithms have the same value, "
        "the normalized score is 1.0. Completion metrics are already ratios in [0, 1]."
    ),
    "weights": {
        "completion_rate": 0.30,
        "priority_completion_rate": 0.25,
        "normalized_response_time_score": 0.20,
        "normalized_distance_score": 0.15,
        "normalized_runtime_score": 0.10,
    },
}

LOWER_IS_BETTER_METRICS = {
    "total_distance",
    "average_response_time",
    "max_response_time",
    "delayed_demands",
    "unserved_demands",
    "algorithm_runtime_ms",
}

HIGHER_IS_BETTER_METRICS = {
    "completion_rate",
    "priority_completion_rate",
    "vehicle_utilization",
}


def _dispatch(algorithm: str, nodes, edges, vehicles, demands, objective: str) -> DispatchResult:
    if algorithm == "priority":
        return priority_dispatch(nodes, edges, vehicles, demands, objective)
    if algorithm == "astar":
        return greedy_dispatch(nodes, edges, vehicles, demands, objective, path_method="astar", algorithm_name="astar")
    if algorithm == "ortools_cvrp" or algorithm == "vrptw":
        return ortools_cvrp_dispatch(nodes, edges, vehicles, demands, objective)
    return greedy_dispatch(
        nodes,
        edges,
        vehicles,
        demands,
        objective,
        path_method="dijkstra",
        algorithm_name="dijkstra" if algorithm == "dijkstra" else "greedy",
    )



def _persist_result(
    db: Session,
    scenario_id: int,
    run_id: int,
    config_id: int,
    result: DispatchResult,
    vehicles,
    demands,
) -> DispatchPlan:
    plan = DispatchPlan(
        scenario_id=scenario_id,
        simulation_run_id=run_id,
        algorithm_config_id=config_id,
        algorithm=result.algorithm,
        objective_value=result.objective_value,
        runtime_ms=result.runtime_ms,
        unserved_demands=result.unserved_demands,
    )
    db.add(plan)
    db.flush()

    for index, route in enumerate(result.routes):
        db.add(
            Route(
                dispatch_plan_id=plan.id,
                vehicle_id=route.vehicle_id,
                sequence_index=index,
                node_path=route.node_path,
                demand_sequence=route.demand_sequence,
                distance_km=round(route.distance_km, 3),
                travel_time_min=round(route.travel_time_min, 3),
                load_units=route.load_units,
                risk_score=route.risk_score,
                decision_rationale=route.decision_rationale,
            )
        )

    metrics = compute_metrics(result, vehicles, demands)
    for name, value in metrics.items():
        db.add(
            MetricResult(
                simulation_run_id=run_id,
                dispatch_plan_id=plan.id,
                metric_name=name,
                metric_value=float(value),
                unit=METRIC_UNITS.get(name, ""),
            )
        )
    return plan


def run_algorithms(db: Session, scenario_id: int, algorithms: list[str], objective: str, parameters: dict) -> SimulationRun:
    if get_scenario_or_none(db, scenario_id) is None:
        raise ValueError(f"Scenario {scenario_id} does not exist")

    run = SimulationRun(
        scenario_id=scenario_id,
        status="running",
        algorithms=algorithms,
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    db.flush()

    nodes, edges, _depots, vehicles, demands = algorithm_inputs(db, scenario_id)
    vehicle_count = int(parameters.get("vehicle_count", len(vehicles)) or len(vehicles))
    demand_scale = float(parameters.get("demand_scale", 1.0) or 1.0)
    congestion_ratio = float(parameters.get("congestion_ratio", 0.0) or 0.0)

    vehicles = vehicles[: max(1, min(vehicle_count, len(vehicles)))]
    if demand_scale != 1.0:
        demands = [replace(demand, quantity=max(1, int(round(demand.quantity * demand_scale)))) for demand in demands]
    if congestion_ratio > 0:
        affected_edges = max(1, int(len(edges) * min(congestion_ratio, 1.0)))
        edges = [
            replace(edge, congestion_factor=max(edge.congestion_factor, 1.8)) if index < affected_edges else edge
            for index, edge in enumerate(edges)
        ]
    for algorithm in algorithms:
        config = AlgorithmConfig(
            scenario_id=scenario_id,
            name=f"{algorithm}-{objective}",
            algorithm=algorithm,
            objective=objective,
            parameters=parameters,
        )
        db.add(config)
        db.flush()
        result = _dispatch(algorithm, nodes, edges, vehicles, demands, objective)
        _persist_result(db, scenario_id, run.id, config.id, result, vehicles, demands)

    run.status = "completed"
    run.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(run)
    return run


def get_run(db: Session, run_id: int) -> SimulationRun | None:
    return db.get(SimulationRun, run_id)


def find_point_to_point_route(db: Session, scenario_id: int, request: PointToPointRequest) -> PointToPointResponse:
    if get_scenario_or_none(db, scenario_id) is None:
        raise ValueError(f"Scenario {scenario_id} does not exist")
    
    nodes, edges, _, _, _ = algorithm_inputs(db, scenario_id)
    
    vehicle = VehicleInput(
        id=0,
        depot_id=0,
        start_node_id=request.source_node_id,
        capacity=0,
        speed_kmph=50.0,
        is_4x4=request.is_4x4,
        weight_tons=request.vehicle_weight_tons,
        accessibility_equipped=False
    )
    
    graph = build_constrained_graph(nodes, edges, vehicle)
    
    try:
        path = find_path(graph, request.source_node_id, request.target_node_id, method="dijkstra", weight=request.objective)
        distance, travel_time = path_cost(graph, path)
        risk = path_risk(graph, path)
        
        if request.objective == "distance_km":
            obj_val = distance
        elif request.objective == "travel_time_min":
            obj_val = travel_time
        else:
            obj_val = sum(graph[u][v]["nesetu_cost"] for u, v in zip(path, path[1:]))
            
        return PointToPointResponse(
            path_nodes=path,
            distance_km=distance,
            travel_time_min=travel_time,
            risk_score=risk,
            objective_value=obj_val,
            unreachable=False,
            message="Route found successfully."
        )
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return PointToPointResponse(
            path_nodes=[],
            distance_km=0.0,
            travel_time_min=0.0,
            risk_score=0.0,
            objective_value=0.0,
            unreachable=True,
            message="No route found between the specified points given the constraints."
        )


def get_routes_for_run(db: Session, run_id: int) -> list[Route]:
    return list(
        db.scalars(
            select(Route)
            .join(DispatchPlan, Route.dispatch_plan_id == DispatchPlan.id)
            .where(DispatchPlan.simulation_run_id == run_id)
            .order_by(Route.dispatch_plan_id, Route.sequence_index)
        ).all()
    )


def get_metrics_for_run(db: Session, run_id: int) -> list[MetricResult]:
    return list(
        db.scalars(
            select(MetricResult)
            .where(MetricResult.simulation_run_id == run_id)
            .order_by(MetricResult.dispatch_plan_id, MetricResult.metric_name)
        ).all()
    )


def get_plans_for_run(db: Session, run_id: int) -> list[DispatchPlan]:
    return list(
        db.scalars(
            select(DispatchPlan)
            .where(DispatchPlan.simulation_run_id == run_id)
            .order_by(DispatchPlan.id)
        ).all()
    )


def _normalize_lower(value: float, values: list[float]) -> float:
    if not values:
        return 1.0
    minimum = min(values)
    maximum = max(values)
    if maximum == minimum:
        return 1.0
    return 1.0 - ((value - minimum) / (maximum - minimum))


def _bounded_ratio(value: float) -> float:
    return max(0.0, min(1.0, value))


def _attach_weighted_scores(rows: list[dict]) -> None:
    distances = [row["metrics"].get("total_distance", 0.0) for row in rows]
    responses = [row["metrics"].get("average_response_time", 0.0) for row in rows]
    runtimes = [row["metrics"].get("algorithm_runtime_ms", 0.0) for row in rows]
    weights = WEIGHTED_SCORE_MODEL["weights"]
    for row in rows:
        metrics = row["metrics"]
        normalized = {
            "completion_rate": _bounded_ratio(metrics.get("completion_rate", 0.0)),
            "priority_completion_rate": _bounded_ratio(metrics.get("priority_completion_rate", 0.0)),
            "normalized_response_time_score": _normalize_lower(metrics.get("average_response_time", 0.0), responses),
            "normalized_distance_score": _normalize_lower(metrics.get("total_distance", 0.0), distances),
            "normalized_runtime_score": _normalize_lower(metrics.get("algorithm_runtime_ms", 0.0), runtimes),
        }
        score = sum(float(weights[name]) * normalized[name] for name in weights)
        row["normalized_scores"] = {name: round(value, 4) for name, value in normalized.items()}
        row["weighted_score"] = round(score, 4)


def _best_by_metric(rows: list[dict]) -> dict[str, dict]:
    metric_names = sorted({name for row in rows for name in row["metrics"]})
    best_by: dict[str, dict] = {}
    for metric_name in metric_names:
        candidates = [row for row in rows if metric_name in row["metrics"]]
        if not candidates:
            continue
        direction = "min" if metric_name in LOWER_IS_BETTER_METRICS else "max"
        best = (
            min(candidates, key=lambda row: row["metrics"][metric_name])
            if direction == "min"
            else max(candidates, key=lambda row: row["metrics"][metric_name])
        )
        best_by[metric_name] = {
            "algorithm": best["algorithm"],
            "value": best["metrics"][metric_name],
            "direction": direction,
        }
    return best_by


def _bottleneck_notes(rows: list[dict]) -> list[str]:
    notes: list[str] = []
    if any(row["metrics"].get("unserved_demands", 0.0) > 0 for row in rows):
        notes.append("At least one algorithm left demands unserved; inspect capacity, blocked edges, and demand surge intensity.")
    if any(row["metrics"].get("delayed_demands", 0.0) > 0 for row in rows):
        notes.append("Delayed demands were observed; response-time constraints are tighter than the current route schedule.")
    if rows:
        runtimes = [row["metrics"].get("algorithm_runtime_ms", 0.0) for row in rows]
        if max(runtimes) > 3 * max(min(runtimes), 1.0):
            notes.append("Runtime differs materially across algorithms; solver quality should be weighed against latency.")
    if not notes:
        notes.append("No severe bottleneck is indicated by the current aggregate metrics.")
    return notes


def comparison_for_run(db: Session, run: SimulationRun) -> dict:
    metrics = get_metrics_for_run(db, run.id)
    routes = get_routes_for_run(db, run.id)
    plans = get_plans_for_run(db, run.id)
    plan_lookup = {plan.id: plan for plan in plans}
    route_counts: dict[int, int] = {}
    served_counts: dict[int, int] = {}
    for route in routes:
        route_counts[route.dispatch_plan_id] = route_counts.get(route.dispatch_plan_id, 0) + 1
        served_counts[route.dispatch_plan_id] = served_counts.get(route.dispatch_plan_id, 0) + len(route.demand_sequence)
    served_ids: dict[int, list[int]] = {}
    for route in routes:
        served_ids.setdefault(route.dispatch_plan_id, [])
        served_ids[route.dispatch_plan_id].extend(int(item["demand_id"]) for item in route.demand_sequence)

    rows: dict[int, dict] = {}
    for metric in metrics:
        plan = plan_lookup.get(metric.dispatch_plan_id)
        rows.setdefault(
            metric.dispatch_plan_id,
            {
                "dispatch_plan_id": metric.dispatch_plan_id,
                "algorithm": plan.algorithm if plan else "unknown",
                "objective_value": plan.objective_value if plan else 0.0,
                "runtime_ms": plan.runtime_ms if plan else 0.0,
                "route_count": route_counts.get(metric.dispatch_plan_id, 0),
                "served_demand_count": served_counts.get(metric.dispatch_plan_id, 0),
                "served_demand_ids": sorted(set(served_ids.get(metric.dispatch_plan_id, []))),
                "unserved_demand_ids": plan.unserved_demands if plan else [],
                "metrics": {},
            },
        )
        rows[metric.dispatch_plan_id]["metrics"][metric.metric_name] = metric.metric_value

    algorithm_rows = list(rows.values())
    _attach_weighted_scores(algorithm_rows)
    ranking = sorted(
        (
            {
                "algorithm": row["algorithm"],
                "dispatch_plan_id": row["dispatch_plan_id"],
                "score": row["weighted_score"],
                "normalized_scores": row["normalized_scores"],
            }
            for row in algorithm_rows
        ),
        key=lambda row: row["score"],
        reverse=True,
    )
    summary = {
        "metric_names": sorted({name for row in algorithm_rows for name in row["metrics"]}),
        "best_by": _best_by_metric(algorithm_rows),
        "ranking": ranking,
        "bottlenecks": _bottleneck_notes(algorithm_rows),
        "weighted_score_model": WEIGHTED_SCORE_MODEL,
        "metric_explanations": METRIC_EXPLANATIONS,
    }
    return {"run_id": run.id, "algorithms": algorithm_rows, "summary": summary}


def latest_comparison(db: Session, scenario_id: int) -> dict:
    run = db.scalar(
        select(SimulationRun)
        .where(SimulationRun.scenario_id == scenario_id)
        .order_by(SimulationRun.created_at.desc(), SimulationRun.id.desc())
    )
    if run is None:
        return {
            "run_id": None,
            "algorithms": [],
            "summary": {
                "metric_names": [],
                "best_by": {},
                "ranking": [],
                "bottlenecks": [],
                "weighted_score_model": WEIGHTED_SCORE_MODEL,
                "metric_explanations": METRIC_EXPLANATIONS,
            },
        }
    return comparison_for_run(db, run)
