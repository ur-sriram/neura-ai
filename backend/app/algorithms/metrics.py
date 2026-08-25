from __future__ import annotations

from app.algorithms.types import DemandInput, DispatchResult, VehicleInput


def compute_metrics(result: DispatchResult, vehicles: list[VehicleInput], demands: list[DemandInput]) -> dict[str, float]:
    served_items = [item for route in result.routes for item in route.demand_sequence]
    served_ids = {int(item["demand_id"]) for item in served_items}
    total_priority = sum(max(d.priority, 1) for d in demands) or 1
    served_priority = sum(max(d.priority, 1) for d in demands if d.id in served_ids)
    total_capacity = sum(v.capacity for v in vehicles if v.available) or 1
    used_capacity = sum(route.load_units for route in result.routes)
    response_times = [float(item["arrival_time_min"]) for item in served_items]

    return {
        "total_distance": round(sum(route.distance_km for route in result.routes), 3),
        "average_response_time": round(sum(response_times) / len(response_times), 3) if response_times else 0.0,
        "max_response_time": round(max(response_times), 3) if response_times else 0.0,
        "completion_rate": round(len(served_ids) / len(demands), 4) if demands else 1.0,
        "priority_completion_rate": round(served_priority / total_priority, 4),
        "vehicle_utilization": round(used_capacity / total_capacity, 4),
        "delayed_demands": float(sum(1 for item in served_items if item.get("delayed"))),
        "unserved_demands": float(len(result.unserved_demands)),
        "algorithm_runtime_ms": round(result.runtime_ms, 3),
    }

