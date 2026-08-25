from __future__ import annotations

import time
import networkx as nx

from app.algorithms.graph import append_path, build_constrained_graph, path_cost, path_risk
from app.algorithms.shortest_path import find_path
from app.algorithms.types import DemandInput, DispatchResult, EdgeInput, NodeInput, RouteResult, VehicleInput


def _edge_weight_for_objective(objective: str) -> str:
    if objective == "minimize_total_distance":
        return "distance_km"
    if objective in ("minimize_risk", "weighted_multi_objective"):
        return "nesetu_cost"
    return "travel_time_min"


def _vehicle_can_serve(vehicle: VehicleInput, demand: DemandInput) -> bool:
    """NE-SETU constraint: accessibility-required demands can only be served
    by accessibility-equipped vehicles."""
    if demand.requires_accessibility and not vehicle.accessibility_equipped:
        return False
    return True


def _route_demands(
    *,
    nodes: list[NodeInput],
    edges: list[EdgeInput],
    vehicles: list[VehicleInput],
    demands: list[DemandInput],
    algorithm: str,
    objective: str,
    path_method: str = "dijkstra",
) -> DispatchResult:
    started = time.perf_counter()
    weight = _edge_weight_for_objective(objective)
    constraint_violations: list[str] = []

    # Build per-vehicle constrained graphs (Stage A filtering)
    vehicle_graphs: dict[int, nx.DiGraph] = {}
    for vehicle in vehicles:
        if vehicle.available:
            vehicle_graphs[vehicle.id] = build_constrained_graph(nodes, edges, vehicle)

    states: dict[int, RouteResult] = {
        vehicle.id: RouteResult(
            vehicle_id=vehicle.id, 
            node_path=[vehicle.current_node_id],
            decision_rationale={
                "evaluated_demands": 0,
                "rejected_reasons": [],
                "selection_factors": []
            }
        )
        for vehicle in vehicles
        if vehicle.available
    }
    remaining_capacity = {vehicle.id: vehicle.capacity for vehicle in vehicles if vehicle.available}
    current_node = {vehicle.id: vehicle.current_node_id for vehicle in vehicles if vehicle.available}
    unserved: list[int] = []

    for demand in demands:
        candidates: list[tuple[float, int, list[int], float, float, float]] = []
        for vehicle in vehicles:
            if not vehicle.available or vehicle.id not in vehicle_graphs:
                continue
            if demand.quantity > remaining_capacity.get(vehicle.id, 0):
                continue

            # NE-SETU: Check accessibility constraint
            if not _vehicle_can_serve(vehicle, demand):
                constraint_violations.append(
                    f"Vehicle {vehicle.id} cannot serve demand {demand.id}: accessibility mismatch"
                )
                continue

            graph = vehicle_graphs[vehicle.id]
            try:
                path = find_path(graph, current_node[vehicle.id], demand.node_id, path_method, weight)
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                constraint_violations.append(
                    f"No feasible path for vehicle {vehicle.id} to demand {demand.id} (hard constraints)"
                )
                continue

            distance_km, travel_min = path_cost(graph, path)
            risk = path_risk(graph, path)
            priority_bonus = max(demand.priority, 1)
            score = travel_min / priority_bonus if objective == "maximize_priority_completion" else travel_min
            if objective == "minimize_total_distance":
                score = distance_km
            if objective in ("minimize_risk", "weighted_multi_objective"):
                # Composite: travel time + risk penalty + distance
                score = travel_min + risk * 10.0 + distance_km * 0.1
            candidates.append((score, vehicle.id, path, distance_km, travel_min, risk))
            states[vehicle.id].decision_rationale["evaluated_demands"] += 1

        if not candidates:
            unserved.append(demand.id)
            continue

        _, vehicle_id, path, distance_km, travel_min, risk = min(candidates, key=lambda item: item[0])
        route = states[vehicle_id]
        arrival_time = route.travel_time_min + travel_min
        route.node_path = append_path(route.node_path, path)
        route.distance_km += distance_km
        route.travel_time_min = arrival_time + demand.service_time_min
        route.load_units += demand.quantity
        route.risk_score += risk
        route.demand_sequence.append(
            {
                "demand_id": demand.id,
                "node_id": demand.node_id,
                "quantity": demand.quantity,
                "priority": demand.priority,
                "arrival_time_min": round(arrival_time, 2),
                "service_time_min": demand.service_time_min,
                "delayed": demand.time_window_end_min is not None and arrival_time > demand.time_window_end_min,
                "cargo_type": demand.cargo_type,
                "requires_accessibility": demand.requires_accessibility,
            }
        )
        route.decision_rationale["selection_factors"].append(
            f"Assigned demand {demand.id} to vehicle {vehicle_id} (distance {distance_km:.1f}km, risk {risk:.2f}, score {score:.2f})."
        )
        if len(candidates) > 1:
            for alt_score, alt_vehicle, _, alt_dist, _, alt_risk in candidates:
                if alt_vehicle != vehicle_id:
                    states[alt_vehicle].decision_rationale["rejected_reasons"].append(
                        f"Vehicle {alt_vehicle} rejected for demand {demand.id}: score {alt_score:.2f} worse than best {score:.2f}."
                    )
        
        remaining_capacity[vehicle_id] -= demand.quantity
        current_node[vehicle_id] = demand.node_id

    routes = [route for route in states.values() if route.demand_sequence]
    objective_value = sum(route.distance_km for route in routes)
    if objective == "minimize_total_response_time":
        objective_value = sum(
            item["arrival_time_min"] for route in routes for item in route.demand_sequence
        )
    if objective == "maximize_priority_completion":
        objective_value = -sum(item["priority"] for route in routes for item in route.demand_sequence)
    if objective in ("minimize_risk", "weighted_multi_objective"):
        objective_value = sum(
            route.distance_km + 0.2 * route.travel_time_min + 5.0 * route.risk_score
            for route in routes
        ) + 10 * len(unserved)

    return DispatchResult(
        algorithm=algorithm,
        routes=routes,
        unserved_demands=unserved,
        objective_value=round(objective_value, 3),
        runtime_ms=round((time.perf_counter() - started) * 1000.0, 3),
        constraint_violations=constraint_violations,
    )


def greedy_dispatch(
    nodes: list[NodeInput],
    edges: list[EdgeInput],
    vehicles: list[VehicleInput],
    demands: list[DemandInput],
    objective: str = "minimize_total_distance",
    path_method: str = "dijkstra",
    algorithm_name: str | None = None,
) -> DispatchResult:
    return _route_demands(
        nodes=nodes,
        edges=edges,
        vehicles=vehicles,
        demands=sorted(demands, key=lambda demand: demand.id),
        algorithm=algorithm_name or ("greedy" if path_method == "dijkstra" else "astar"),
        objective=objective,
        path_method=path_method,
    )
