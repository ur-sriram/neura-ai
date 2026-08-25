from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class Coordinate(BaseModel):
    lat: float
    lon: float

class Vehicle(BaseModel):
    id: str
    vclass: str
    capacity_kg: float
    status: str
    current_location: Optional[Coordinate] = None

class Delivery(BaseModel):
    id: str
    cargo_type: str
    weight_kg: float
    destination: Coordinate
    priority_score: Optional[float] = None
    status: str = "NEW"

class RouteCandidate(BaseModel):
    id: str
    distance_m: float
    eta_p50: float
    eta_p90: float
    risk: float
    cost: Dict[str, float]
    feasible: bool
    rejection_reason: Optional[str] = None
    chosen: bool = False

class Assignment(BaseModel):
    delivery_id: str
    vehicle_id: str
    route_candidate_id: str
    depart_time: float
    eta_p50: float

class Plan(BaseModel):
    id: str
    mode: str = "NORMAL"
    status: str = "PROPOSED"
    assignments: List[Assignment]
    unassigned_deliveries: List[str]
    deferred_deliveries: List[str]

class PlanRequest(BaseModel):
    deliveries: List[Delivery]
    vehicles: List[Vehicle]
    mode: str = "NORMAL"

class SimulationMutation(BaseModel):
    action: str # e.g. "close_segment", "demand_surge"
    target_id: str
    value: Any

class SimulationRequest(BaseModel):
    mutations: List[SimulationMutation]
    time_offset: float = 0.0
