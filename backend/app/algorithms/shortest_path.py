from __future__ import annotations

import networkx as nx

from app.algorithms.graph import euclidean_km


def dijkstra_path(graph: nx.DiGraph, source: int, target: int, weight: str = "travel_time_min") -> list[int]:
    return nx.shortest_path(graph, source=source, target=target, weight=weight, method="dijkstra")


def astar_path(graph: nx.DiGraph, source: int, target: int, weight: str = "travel_time_min") -> list[int]:
    # The heuristic is optimistic travel time with a high urban speed, so A* stays admissible enough for routing.
    def heuristic(node: int, goal: int) -> float:
        if weight == "distance_km":
            return euclidean_km(graph, node, goal)
        return euclidean_km(graph, node, goal) / 60.0 * 60.0

    return nx.astar_path(graph, source, target, heuristic=heuristic, weight=weight)


def find_path(graph: nx.DiGraph, source: int, target: int, method: str, weight: str) -> list[int]:
    if source == target:
        return [source]
    if method == "astar":
        return astar_path(graph, source, target, weight)
    return dijkstra_path(graph, source, target, weight)

