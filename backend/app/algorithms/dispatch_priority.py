from __future__ import annotations

from app.algorithms.dispatch_greedy import _route_demands
from app.algorithms.types import DemandInput, DispatchResult, EdgeInput, NodeInput, VehicleInput


def priority_dispatch(
    nodes: list[NodeInput],
    edges: list[EdgeInput],
    vehicles: list[VehicleInput],
    demands: list[DemandInput],
    objective: str = "maximize_priority_completion",
) -> DispatchResult:
    ordered_demands = sorted(
        demands,
        key=lambda demand: (-demand.priority, demand.time_window_end_min or 10_000.0, demand.id),
    )
    return _route_demands(
        nodes=nodes,
        edges=edges,
        vehicles=vehicles,
        demands=ordered_demands,
        algorithm="priority",
        objective=objective,
        path_method="dijkstra",
    )
