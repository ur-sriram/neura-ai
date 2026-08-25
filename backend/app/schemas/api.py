from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


SUPPORTED_ALGORITHMS = {"greedy", "priority", "dijkstra", "astar", "ortools_cvrp", "vrptw"}


class ApiResponse(BaseModel):
    success: bool = True
    message: str = "ok"
    data: object | None = None


class ScenarioCreate(BaseModel):
    name: str = Field(min_length=3, max_length=160)
    description: str = ""
    scenario_type: str = "custom"


class ScenarioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    scenario_type: str
    created_at: datetime
    updated_at: datetime
    node_count: int = 0
    edge_count: int = 0
    vehicle_count: int = 0
    demand_count: int = 0
    priority_distribution: dict[str, int] = Field(default_factory=dict)
    congested_edge_count: int = 0
    blocked_edge_count: int = 0
    expected_challenge: str = ""


class NodeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    latitude: float
    longitude: float
    node_type: str


class EdgeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class DepotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    node_id: int
    name: str
    inventory_units: int


class VehicleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    depot_id: int
    current_node_id: int
    name: str
    capacity: int
    speed_kmph: float
    available: bool
    is_4x4: bool = False
    weight_tons: float = 2.0
    accessibility_equipped: bool = False


class DemandRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    node_id: int
    name: str
    quantity: int
    priority: int
    time_window_start_min: float | None
    time_window_end_min: float | None
    service_time_min: float
    cargo_type: str = "supplies"
    requires_accessibility: bool = False


class NetworkRead(BaseModel):
    nodes: list[NodeRead]
    edges: list[EdgeRead]
    depots: list[DepotRead]
    vehicles: list[VehicleRead]
    demands: list[DemandRead]


# --- NE-SETU: Event Ingestion Schemas ---


class RoadConditionReport(BaseModel):
    """Community / operator road condition report (SCN-01 style event)."""
    edge_id: int
    status: str = Field(pattern="^(OPEN|SUSPECTED|CLOSED)$")
    source_type: str = Field(default="operator", pattern="^(operator|community|sensor)$")
    severity: int = Field(default=3, ge=1, le=5)
    description: str = ""


class ConditionReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scenario_id: int
    edge_id: int
    status: str
    source_type: str
    severity: int
    description: str | None = None
    trust_score: float
    reported_at: datetime


class AssistedMobilityRequest(BaseModel):
    """A demand where the cargo is a person requiring accessibility-equipped vehicle."""
    scenario_id: int
    node_id: int
    name: str = "Assisted Mobility Request"
    priority: int = Field(default=5, ge=1, le=5)
    description: str = ""


# --- Standard run/compare schemas ---

class PointToPointRequest(BaseModel):
    source_node_id: int
    target_node_id: int
    vehicle_weight_tons: float = 2.0
    is_4x4: bool = False
    objective: str = Field(default="distance_km", pattern="^(distance_km|travel_time_min|nesetu_cost)$")

class PointToPointResponse(BaseModel):
    path_nodes: list[int]
    distance_km: float
    travel_time_min: float
    risk_score: float
    objective_value: float
    unreachable: bool = False
    message: str = ""



class RunRequest(BaseModel):
    algorithm: str = Field(default="greedy", pattern="^(greedy|priority|dijkstra|astar|ortools_cvrp|vrptw)$")
    objective: str = "minimize_total_distance"
    parameters: dict = Field(default_factory=dict)


class CompareRequest(BaseModel):
    algorithms: list[str] = Field(default_factory=lambda: ["greedy", "priority", "ortools_cvrp"])
    objective: str = "weighted_multi_objective"
    parameters: dict = Field(default_factory=dict)

    @field_validator("algorithms")
    @classmethod
    def validate_algorithms(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("At least one algorithm is required")
        unsupported = sorted(set(value) - SUPPORTED_ALGORITHMS)
        if unsupported:
            raise ValueError(f"Unsupported algorithms: {', '.join(unsupported)}")
        return value


class SimulationRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scenario_id: int
    status: str
    algorithms: list[str]
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime


class RouteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dispatch_plan_id: int
    vehicle_id: int
    sequence_index: int
    node_path: list[int]
    demand_sequence: list[dict]
    distance_km: float
    travel_time_min: float
    load_units: int
    risk_score: float = 0.0
    decision_rationale: dict | None = None


class MetricRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    simulation_run_id: int
    dispatch_plan_id: int
    metric_name: str
    metric_value: float
    unit: str


class ReportRead(BaseModel):
    run_id: int
    markdown: str
    generated_by: str

class DataPoint(BaseModel):
    time: str
    predicted: float
    actual: float

class ClosureDataPoint(BaseModel):
    time: str
    precision: float
    recall: float
    f1_score: float

class ModelPerformanceMetrics(BaseModel):
    eta_mae: float
    eta_rmse: float
    closure_precision: float
    closure_recall: float
    closure_f1: float
    eta_calibration_series: list[DataPoint]
    closure_accuracy_series: list[ClosureDataPoint]

