import networkx as nx

from app.algorithms.dispatch_greedy import greedy_dispatch
from app.algorithms.graph import build_graph
from app.algorithms.metrics import compute_metrics
from app.algorithms.shortest_path import astar_path, dijkstra_path
from app.algorithms.types import DemandInput, EdgeInput, NodeInput, VehicleInput


def sample_graph():
    nodes = [
        NodeInput(1, 39.0, 116.0),
        NodeInput(2, 39.0, 116.01),
        NodeInput(3, 39.0, 116.02),
    ]
    edges = [
        EdgeInput(1, 1, 2, 1.0, 30.0, 1.0, False),
        EdgeInput(2, 2, 3, 1.0, 30.0, 1.0, False),
        EdgeInput(3, 1, 3, 5.0, 30.0, 1.0, False),
    ]
    return build_graph(nodes, edges)


def test_dijkstra_and_astar_return_shortest_node_sequence():
    graph = sample_graph()

    assert dijkstra_path(graph, 1, 3, "distance_km") == [1, 2, 3]
    assert astar_path(graph, 1, 3, "distance_km") == [1, 2, 3]


def test_blocked_edges_are_removed_from_graph():
    graph = build_graph(
        [NodeInput(1, 39.0, 116.0), NodeInput(2, 39.0, 116.01)],
        [EdgeInput(1, 1, 2, 1.0, 30.0, 1.0, True)],
    )

    assert not graph.has_edge(1, 2)
    try:
        dijkstra_path(graph, 1, 2)
    except nx.NetworkXNoPath:
        return
    raise AssertionError("blocked edge should not be traversable")


def test_greedy_dispatch_serves_feasible_demands_and_computes_metrics():
    graph = sample_graph()
    vehicles = [VehicleInput(1, 1, 1, capacity=10, speed_kmph=30.0)]
    demands = [
        DemandInput(1, 2, quantity=4, priority=3, service_time_min=5.0),
        DemandInput(2, 3, quantity=4, priority=5, service_time_min=5.0),
    ]

    result = greedy_dispatch(graph, vehicles, demands)
    metrics = compute_metrics(result, vehicles, demands)

    assert result.unserved_demands == []
    assert result.routes[0].node_path == [1, 2, 3]
    assert metrics["completion_rate"] == 1.0
    assert metrics["total_distance"] == 2.0


def test_metrics_capture_delayed_unserved_and_priority_completion():
    graph = sample_graph()
    vehicles = [VehicleInput(1, 1, 1, capacity=5, speed_kmph=30.0)]
    demands = [
        DemandInput(1, 2, quantity=4, priority=5, service_time_min=5.0, time_window_end_min=1.0),
        DemandInput(2, 3, quantity=4, priority=1, service_time_min=5.0),
    ]

    result = greedy_dispatch(graph, vehicles, demands, objective="maximize_priority_completion")
    metrics = compute_metrics(result, vehicles, demands)

    assert result.unserved_demands == [2]
    assert metrics["delayed_demands"] == 1.0
    assert metrics["unserved_demands"] == 1.0
    assert metrics["priority_completion_rate"] == round(5 / 6, 4)


def test_congestion_changes_travel_time_cost_without_changing_distance():
    normal = build_graph(
        [NodeInput(1, 39.0, 116.0), NodeInput(2, 39.0, 116.01)],
        [EdgeInput(1, 1, 2, 3.0, 30.0, 1.0, False)],
    )
    congested = build_graph(
        [NodeInput(1, 39.0, 116.0), NodeInput(2, 39.0, 116.01)],
        [EdgeInput(1, 1, 2, 3.0, 30.0, 2.0, False)],
    )

    normal_edge = normal[1][2]
    congested_edge = congested[1][2]

    assert normal_edge["distance_km"] == congested_edge["distance_km"]
    assert congested_edge["travel_time_min"] == normal_edge["travel_time_min"] * 2
