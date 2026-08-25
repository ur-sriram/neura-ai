from __future__ import annotations

import time
import networkx as nx

from app.algorithms.dispatch_priority import priority_dispatch
from app.algorithms.graph import append_path, build_graph, path_cost
from app.algorithms.shortest_path import dijkstra_path
from app.algorithms.types import DemandInput, DispatchResult, EdgeInput, NodeInput, RouteResult, VehicleInput


def ortools_cvrp_dispatch(
    nodes: list[NodeInput],
    edges: list[EdgeInput],
    vehicles: list[VehicleInput],
    demands: list[DemandInput],
    objective: str = "minimize_total_distance",
) -> DispatchResult:
    try:
        from ortools.constraint_solver import pywrapcp, routing_enums_pb2
    except ImportError:
        fallback = priority_dispatch(nodes, edges, vehicles, demands, objective)
        fallback.algorithm = "ortools_cvrp_unavailable_priority_fallback"
        return fallback

    started = time.perf_counter()
    active_vehicles = [vehicle for vehicle in vehicles if vehicle.available]
    if not active_vehicles or not demands:
        return DispatchResult("ortools_cvrp", [], [d.id for d in demands], 0.0, 0.0)

    # Build a general graph for distance matrix computation
    graph = build_graph(nodes, edges)

    location_node_ids = list(dict.fromkeys([v.current_node_id for v in active_vehicles] + [d.node_id for d in demands]))
    location_index = {node_id: idx for idx, node_id in enumerate(location_node_ids)}
    starts = [location_index[v.current_node_id] for v in active_vehicles]
    ends = starts[:]

    matrix: list[list[int]] = []
    for source_node in location_node_ids:
        row: list[int] = []
        for target_node in location_node_ids:
            if source_node == target_node:
                row.append(0)
                continue
            try:
                path = dijkstra_path(graph, source_node, target_node, "distance_km")
                distance_km, _ = path_cost(graph, path)
                row.append(max(1, int(distance_km * 1000)))
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                row.append(10_000_000)
        matrix.append(row)

    demand_by_location = [0] * len(location_node_ids)
    demand_lookup = {d.node_id: d for d in demands}
    for demand in demands:
        demand_by_location[location_index[demand.node_id]] += demand.quantity

    manager = pywrapcp.RoutingIndexManager(len(location_node_ids), len(active_vehicles), starts, ends)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        return matrix[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_callback(from_index: int) -> int:
        return demand_by_location[manager.IndexToNode(from_index)]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,
        [vehicle.capacity for vehicle in active_vehicles],
        True,
        "Capacity",
    )

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_parameters.time_limit.FromSeconds(2)
    solution = routing.SolveWithParameters(search_parameters)

    if solution is None:
        fallback = priority_dispatch(nodes, edges, vehicles, demands, objective)
        fallback.algorithm = "ortools_cvrp_no_solution_priority_fallback"
        return fallback

    served: set[int] = set()
    routes: list[RouteResult] = []
    for vehicle_pos, vehicle in enumerate(active_vehicles):
        index = routing.Start(vehicle_pos)
        route = RouteResult(vehicle_id=vehicle.id, node_path=[vehicle.current_node_id])
        current_node_id = vehicle.current_node_id
        elapsed_min = 0.0
        while not routing.IsEnd(index):
            next_index = solution.Value(routing.NextVar(index))
            next_node_id = location_node_ids[manager.IndexToNode(next_index)]
            if next_node_id != current_node_id:
                try:
                    path = dijkstra_path(graph, current_node_id, next_node_id, "distance_km")
                except (nx.NetworkXNoPath, nx.NodeNotFound):
                    break
                distance_km, travel_min = path_cost(graph, path)
                elapsed_min += travel_min
                route.node_path = append_path(route.node_path, path)
                route.distance_km += distance_km
                demand = demand_lookup.get(next_node_id)
                if demand and demand.id not in served:
                    route.load_units += demand.quantity
                    route.demand_sequence.append(
                        {
                            "demand_id": demand.id,
                            "node_id": demand.node_id,
                            "quantity": demand.quantity,
                            "priority": demand.priority,
                            "arrival_time_min": round(elapsed_min, 2),
                            "service_time_min": demand.service_time_min,
                            "delayed": demand.time_window_end_min is not None and elapsed_min > demand.time_window_end_min,
                            "cargo_type": demand.cargo_type,
                            "requires_accessibility": demand.requires_accessibility,
                        }
                    )
                    elapsed_min += demand.service_time_min
                    served.add(demand.id)
                current_node_id = next_node_id
            index = next_index
        route.travel_time_min = elapsed_min
        if route.demand_sequence:
            routes.append(route)

    unserved = [d.id for d in demands if d.id not in served]
    objective_value = sum(route.distance_km for route in routes) + 10 * len(unserved)
    return DispatchResult(
        algorithm="ortools_cvrp",
        routes=routes,
        unserved_demands=unserved,
        objective_value=round(objective_value, 3),
        runtime_ms=round((time.perf_counter() - started) * 1000.0, 3),
    )
