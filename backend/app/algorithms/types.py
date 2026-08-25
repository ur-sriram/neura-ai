from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class NodeInput:
    id: int
    latitude: float
    longitude: float


@dataclass(frozen=True)
class EdgeInput:
    id: int
    source_node_id: int
    target_node_id: int
    distance_km: float
    speed_kmph: float
    congestion_factor: float
    is_blocked: bool
    surface_type: str = "paved"
    bridge_tonnage_limit: float | None = None
    base_landslide_risk: float = 0.0
    base_flood_risk: float = 0.0
    accessibility_score: float = 1.0


@dataclass(frozen=True)
class DepotInput:
    id: int
    node_id: int
    inventory_units: int


@dataclass(frozen=True)
class VehicleInput:
    id: int
    depot_id: int
    current_node_id: int
    capacity: int
    speed_kmph: float
    available: bool = True
    is_4x4: bool = False
    weight_tons: float = 2.0
    accessibility_equipped: bool = False


@dataclass(frozen=True)
class DemandInput:
    id: int
    node_id: int
    quantity: int
    priority: int
    service_time_min: float
    time_window_start_min: float | None = None
    time_window_end_min: float | None = None
    cargo_type: str = "supplies"
    requires_accessibility: bool = False


@dataclass
class RouteResult:
    vehicle_id: int
    node_path: list[int] = field(default_factory=list)
    demand_sequence: list[dict] = field(default_factory=list)
    distance_km: float = 0.0
    travel_time_min: float = 0.0
    load_units: int = 0
    risk_score: float = 0.0
    decision_rationale: dict | None = None


@dataclass
class DispatchResult:
    algorithm: str
    routes: list[RouteResult]
    unserved_demands: list[int]
    objective_value: float
    runtime_ms: float
    constraint_violations: list[str] = field(default_factory=list)
