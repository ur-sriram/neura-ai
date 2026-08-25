from __future__ import annotations

import math
import networkx as nx

from app.algorithms.types import EdgeInput, NodeInput, VehicleInput


def travel_time_min(distance_km: float, speed_kmph: float, congestion_factor: float) -> float:
    effective_speed = max(speed_kmph, 1.0)
    return (distance_km / effective_speed) * 60.0 * max(congestion_factor, 1.0)


def nesetu_edge_cost(
    distance_km: float,
    speed_kmph: float,
    congestion_factor: float,
    landslide_risk: float,
    flood_risk: float,
    surface_type: str,
) -> float:
    """Multi-criteria cost from MASTER_PROJECT_OVERVIEW Section on Stage B routing.

    Cost = base_travel_time * (1 + risk_penalties + surface_penalty)
    This is the composite cost balancing distance, landslide risk, flood risk,
    and road surface factors.
    """
    base_time = travel_time_min(distance_km, speed_kmph, congestion_factor)
    risk_penalty = 0.4 * landslide_risk + 0.3 * flood_risk
    surface_penalty = {"paved": 0.0, "mixed": 0.15, "gravel": 0.35}.get(surface_type, 0.2)
    return base_time * (1.0 + risk_penalty + surface_penalty)


def build_graph(nodes: list[NodeInput], edges: list[EdgeInput]) -> nx.DiGraph:
    """Build a basic graph skipping blocked edges."""
    graph = nx.DiGraph()
    for node in nodes:
        graph.add_node(node.id, latitude=node.latitude, longitude=node.longitude)

    for edge in edges:
        if edge.is_blocked:
            continue
        graph.add_edge(
            edge.source_node_id,
            edge.target_node_id,
            distance_km=edge.distance_km,
            travel_time_min=travel_time_min(edge.distance_km, edge.speed_kmph, edge.congestion_factor),
            congestion_factor=edge.congestion_factor,
            surface_type=edge.surface_type,
            bridge_tonnage_limit=edge.bridge_tonnage_limit,
            base_landslide_risk=edge.base_landslide_risk,
            base_flood_risk=edge.base_flood_risk,
            accessibility_score=edge.accessibility_score,
            nesetu_cost=nesetu_edge_cost(
                edge.distance_km,
                edge.speed_kmph,
                edge.congestion_factor,
                edge.base_landslide_risk,
                edge.base_flood_risk,
                edge.surface_type,
            ),
        )
    return graph


def build_constrained_graph(
    nodes: list[NodeInput],
    edges: list[EdgeInput],
    vehicle: VehicleInput,
) -> nx.DiGraph:
    """Stage A: Hard Physical Constraints Filter from MASTER_PROJECT_OVERVIEW.

    Rejects segments based on:
    - Road closure (is_blocked) — unless the vehicle is an emergency type
    - Vehicle capability (4x4-only terrain: surface_type == 'gravel' requires is_4x4)
    - Bridge weight limits (bridge_tonnage_limit exceeded by vehicle weight_tons)
    """
    graph = nx.DiGraph()
    for node in nodes:
        graph.add_node(node.id, latitude=node.latitude, longitude=node.longitude)

    for edge in edges:
        # Stage A - Hard constraint: blocked roads
        if edge.is_blocked:
            continue

        # Stage A - Hard constraint: gravel/unpaved requires 4x4
        if edge.surface_type == "gravel" and not vehicle.is_4x4:
            continue

        # Stage A - Hard constraint: bridge weight limit
        if edge.bridge_tonnage_limit is not None and vehicle.weight_tons > edge.bridge_tonnage_limit:
            continue

        # Stage B - Multi-criteria cost optimization
        graph.add_edge(
            edge.source_node_id,
            edge.target_node_id,
            distance_km=edge.distance_km,
            travel_time_min=travel_time_min(edge.distance_km, edge.speed_kmph, edge.congestion_factor),
            congestion_factor=edge.congestion_factor,
            surface_type=edge.surface_type,
            bridge_tonnage_limit=edge.bridge_tonnage_limit,
            base_landslide_risk=edge.base_landslide_risk,
            base_flood_risk=edge.base_flood_risk,
            accessibility_score=edge.accessibility_score,
            nesetu_cost=nesetu_edge_cost(
                edge.distance_km,
                edge.speed_kmph,
                edge.congestion_factor,
                edge.base_landslide_risk,
                edge.base_flood_risk,
                edge.surface_type,
            ),
        )
    return graph


def euclidean_km(graph: nx.DiGraph, source: int, target: int) -> float:
    s = graph.nodes[source]
    t = graph.nodes[target]
    lat_km = (s["latitude"] - t["latitude"]) * 111.0
    lon_km = (s["longitude"] - t["longitude"]) * 111.0 * math.cos(math.radians(s["latitude"]))
    return math.sqrt(lat_km * lat_km + lon_km * lon_km)


def path_cost(graph: nx.DiGraph, path: list[int]) -> tuple[float, float]:
    distance = 0.0
    minutes = 0.0
    for source, target in zip(path, path[1:]):
        edge = graph[source][target]
        distance += float(edge["distance_km"])
        minutes += float(edge["travel_time_min"])
    return distance, minutes


def path_risk(graph: nx.DiGraph, path: list[int]) -> float:
    """Compute cumulative risk score along a path."""
    risk = 0.0
    for source, target in zip(path, path[1:]):
        edge = graph[source][target]
        risk += float(edge.get("base_landslide_risk", 0.0)) + float(edge.get("base_flood_risk", 0.0))
    return risk


def append_path(base_path: list[int], segment: list[int]) -> list[int]:
    if not segment:
        return base_path
    if not base_path:
        return list(segment)
    return base_path + segment[1:] if base_path[-1] == segment[0] else base_path + segment
