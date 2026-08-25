from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class Coordinates(BaseModel):
    lat: float = Field(..., description="Latitude in degrees")
    lon: float = Field(..., description="Longitude in degrees")


class CityInfo(BaseModel):
    name: str
    state: str
    lat: float
    lon: float
    population: int
    airport: bool
    railhead: bool


class StateInfo(BaseModel):
    name: str
    capital: str
    population_millions: float
    languages: List[str]
    highways: List[str]
    airports: List[str]
    terrain: str
    disaster_risk: List[str]


class RouteOptimizeRequest(BaseModel):
    source: str = Field(..., description="Source city name", examples=["Guwahati"])
    destination: str = Field(..., description="Destination city name", examples=["Shillong"])
    vehicle_type: Literal["truck", "car", "bus", "bike", "ev_truck"] = Field(default="truck")
    avoid_zones: List[str] = Field(default=[], description="City or zone names to avoid")
    priority: Literal["fastest", "shortest", "safest", "scenic"] = Field(default="fastest")
    consider_weather: bool = Field(default=True, description="Factor in current NER weather/landslide risk")
    weight_kg: Optional[float] = Field(default=None, description="Cargo weight in kg (for cost/ETA)")


class RouteSegment(BaseModel):
    from_city: str
    to_city: str
    distance_km: float
    highway: str
    terrain_factor: float
    accessibility_rating: int
    condition: str
    est_time_min: float
    warnings: List[str] = []


class RouteOptimizeResponse(BaseModel):
    source: str
    destination: str
    total_distance_km: float
    total_eta_minutes: float
    total_cost_inr: float
    segments: List[RouteSegment]
    weather_warnings: List[str] = []
    alternative_routes: List["RouteOptimizeResponse"] = []
    advisories: List[str] = []
    score_breakdown: Optional["ScoreBreakdown"] = None
    decision_log: Optional["DecisionLogEntry"] = None


class ShipmentCreate(BaseModel):
    shipment_id: Optional[str] = None
    source: str
    destination: str
    weight_kg: float = Field(..., gt=0)
    vehicle_type: str = "truck"
    consignee: str
    contents: str
    priority: Literal["standard", "express", "emergency"] = "standard"
    pickup_date: Optional[str] = None


class Shipment(ShipmentCreate):
    status: Literal["created", "picked_up", "in_transit", "delivered", "delayed", "cancelled"] = "created"
    current_location: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    progress_pct: int = 0
    checkpoints: List[Dict[str, Any]] = []


class ShipmentListResponse(BaseModel):
    total: int
    items: List[Shipment]


class TrackResponse(BaseModel):
    shipment_id: str
    status: str
    progress_pct: int
    current_location: Optional[str]
    last_updated: datetime
    eta_to_destination_min: Optional[float]
    history: List[Dict[str, Any]]
    alerts: List[str] = []


class AccessibilityScoreRequest(BaseModel):
    city: Optional[str] = Field(default=None, description="City to score overall accessibility")
    poi_id: Optional[str] = None
    route_source: Optional[str] = None
    route_destination: Optional[str] = None


class AccessibilityDimension(BaseModel):
    name: str
    score: float = Field(..., ge=0, le=10)
    notes: str


class AccessibilityScoreResponse(BaseModel):
    location: str
    overall_score: float = Field(..., ge=0, le=10)
    rating: Literal["A+", "A", "B", "C", "D", "F"]
    dimensions: List[AccessibilityDimension]
    wheelchair_accessible: bool
    recommendations: List[str]
    nearby_accessible_pois: List[Dict[str, Any]] = []
    score_100_detail: Optional["AccessibilityScore100"] = None


class AccessibleRouteRequest(BaseModel):
    source: str
    destination: str
    mobility_type: Literal["wheelchair", "walker", "stroller", "none"] = "wheelchair"
    min_rating: int = Field(default=2, ge=1, le=5)


class AccessibleRoute(BaseModel):
    waypoints: List[str]
    total_distance_km: float
    accessibility_score: float
    steep_segments: List[str]
    pitstops: List[Dict[str, Any]]
    eta_min: float


class AccessibleRouteResponse(BaseModel):
    source: str
    destination: str
    best_route: Optional[AccessibleRoute]
    alternatives: List[AccessibleRoute] = []
    warnings: List[str] = []


class POIFilterRequest(BaseModel):
    city: Optional[str] = None
    state: Optional[str] = None
    type: Optional[Literal["airport", "railway", "bus_terminal", "hospital", "market", "all"]] = "all"
    wheelchair_only: bool = False
    min_rating: int = 0


class POIItem(BaseModel):
    name: str
    type: str
    city: str
    state: str
    lat: float
    lon: float
    wheelchair: bool
    rating: int
    services: List[str]


class POIListResponse(BaseModel):
    count: int
    items: List[POIItem]


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    user_id: Optional[str] = None
    agent: Optional[Literal["auto", "logistics", "accessibility", "emergency", "community"]] = "auto"
    history: List[Dict[str, str]] = Field(default=[], description="Previous turn history, [{role, content}]")


class AgentTrace(BaseModel):
    agent: str
    intent_detected: str
    confidence: float
    actions: List[str] = []


class ChatResponse(BaseModel):
    reply: str
    sources: List[str] = []
    agent_trace: Optional[AgentTrace] = None
    suggested_followups: List[str] = []


class ImageAnalysisRequest(BaseModel):
    image_b64: Optional[str] = Field(default=None, description="Base64 encoded image (optional)")
    image_url: Optional[str] = Field(default=None, description="Image URL (optional)")
    context_location: Optional[str] = Field(default=None, description="Where the photo was taken, e.g., Shillong")


class RoadCondition(BaseModel):
    surface: Literal["asphalt_good", "asphalt_poor", "gravel", "mud", "blocked", "under_construction"]
    pothole_severity: Literal["none", "low", "medium", "high"]
    accessibility_score: int
    safe_for_wheelchair: bool
    safe_for_truck: bool
    landslide_risk: Literal["none", "low", "medium", "high"]
    flood_risk: Literal["none", "low", "medium", "high"]


class ImageAnalysisResponse(BaseModel):
    summary: str
    road_condition: RoadCondition
    advisories: List[str]
    alternate_routes_suggested: List[str] = []
    landmarks_detected: List[str] = []


class PlanRequest(BaseModel):
    trip_type: Literal["logistics", "personal", "accessibility", "evacuation"]
    source: str
    destination: str
    start_date: Optional[str] = None
    constraints: List[str] = Field(default=[], description="e.g. wheelchair, no_tolls, EV_charging, avoid_landslide")
    vehicle_type: str = "car"


class PlanItem(BaseModel):
    day: int
    title: str
    description: str
    location: Optional[str] = None
    timing: Optional[str] = None
    warnings: List[str] = []


class PlanResponse(BaseModel):
    title: str
    overall_risk: Literal["low", "medium", "high"]
    overview: str
    itinerary: List[PlanItem]
    packing_list: List[str] = []
    contacts: List[Dict[str, str]] = []


class EmergencyAlertFilter(BaseModel):
    state: Optional[str] = None
    severity: Optional[Literal["low", "medium", "high", "critical"]] = None
    type: Optional[Literal["flood", "landslide", "earthquake", "cyclone", "avalanche", "road_block"]] = None
    active_only: bool = True


class EmergencyAlert(BaseModel):
    alert_id: str
    type: Literal["flood", "landslide", "earthquake", "cyclone", "avalanche", "road_block"]
    severity: Literal["low", "medium", "high", "critical"]
    state: str
    cities_affected: List[str]
    headline: str
    description: str
    issued_at: datetime
    expires_at: Optional[datetime] = None
    active: bool = True
    advice: List[str] = []


class EmergencyAlertListResponse(BaseModel):
    count: int
    items: List[EmergencyAlert]


class EvacuateRequest(BaseModel):
    from_city: str
    to_city: Optional[str] = None
    num_people: int = Field(..., ge=1, le=10000)
    special_needs: List[Literal["wheelchair", "elderly", "children", "medical", "pets"]] = []
    urgency: Literal["routine", "urgent", "immediate"] = "urgent"


class EvacuationRoute(BaseModel):
    route: List[str]
    distance_km: float
    eta_min: float
    capacity: int
    shelters: List[Dict[str, Any]]
    accessible: bool
    block_risk: str


class EvacuateResponse(BaseModel):
    from_city: str
    recommended_city: str
    primary_route: Optional[EvacuationRoute]
    backup_routes: List[EvacuationRoute] = []
    shelter_list: List[Dict[str, Any]] = []
    emergency_contacts: List[Dict[str, str]]
    checklists: List[str] = []


class CommunityHubFilter(BaseModel):
    state: Optional[str] = None
    city: Optional[str] = None
    partner_type: Optional[str] = None
    service: Optional[str] = None


class CommunityHub(BaseModel):
    name: str
    city: str
    state: str
    lat: float
    lon: float
    partner_type: str
    services: List[str]
    contact: str


class CommunityHubListResponse(BaseModel):
    count: int
    items: List[CommunityHub]


class FeedbackSubmission(BaseModel):
    name: Optional[str] = None
    city: str
    state: Optional[str] = None
    category: Literal["road_condition", "accessibility", "emergency_response", "logistics_service", "community", "other"]
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=5, max_length=2000)
    contact: Optional[str] = None
    image_url: Optional[str] = None


class FeedbackItem(FeedbackSubmission):
    feedback_id: str
    submitted_at: datetime
    sentiment: Optional[Literal["positive", "neutral", "negative"]] = None
    summary: Optional[str] = None
    status: Literal["new", "reviewed", "actioned"] = "new"
    assignee_agent: Optional[str] = None


class FeedbackListResponse(BaseModel):
    total: int
    items: List[FeedbackItem]
    summary_stats: Dict[str, Any]


class WeatherInfo(BaseModel):
    city: str
    temp_c: float
    humidity: int
    condition: str
    wind_kmh: float
    flood_warning: bool
    landslide_warning: bool
    updated: str
    rain_probability_percent: Optional[int] = None
    precipitation_mm: Optional[float] = None
    source: Optional[str] = None
    zone_name: Optional[str] = None
    zone: Optional[Dict[str, Any]] = None


class EventIngestRequest(BaseModel):
    type: Literal["landslide", "flood", "road_block", "earthquake", "cyclone", "avalanche", "accident", "construction"]
    road_segment_id: Optional[str] = None
    from_city: Optional[str] = None
    to_city: Optional[str] = None
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    confidence: float = Field(0.85, ge=0.0, le=1.0)
    source: Literal["admin_panel", "driver_report", "district_control_room", "police", "news", "satellite", "sensor_iot", "simulated"] = "simulated"
    headline: Optional[str] = None
    description: Optional[str] = None
    blocked: bool = True
    duration_hours: Optional[int] = Field(24, ge=1, le=720)
    reported_by: Optional[str] = None
    affected_cities: List[str] = []


class EventRecord(BaseModel):
    event_id: str
    type: str
    road_segment_id: Optional[str] = None
    from_city: Optional[str] = None
    to_city: Optional[str] = None
    severity: str
    confidence: float
    source: str
    headline: Optional[str] = None
    description: Optional[str] = None
    blocked: bool
    duration_hours: Optional[int] = None
    reported_by: Optional[str] = None
    affected_cities: List[str] = []
    created_at: datetime
    expires_at: Optional[datetime] = None
    active: bool = True


class EventListResponse(BaseModel):
    total: int
    active: int
    items: List[EventRecord]


class VehicleProfile(BaseModel):
    vehicle_id: str
    vehicle_type: Literal["mini_truck", "heavy_truck", "4x4", "ambulance", "car", "bus", "bike", "ev_truck"]
    capacity_ton: float = Field(..., ge=0.1, le=50)
    terrain_capability: Literal["poor", "medium", "excellent"]
    max_speed_kmh: int
    cost_per_km: float
    features: List[str] = []


class CargoMatchRequest(BaseModel):
    cargo_type: Literal["medicine", "food", "water", "emergency_kit", "normal_parcel", "fuel", "construction", "livestock"]
    weight_kg: float = Field(..., gt=0)
    volume_cbm: Optional[float] = None
    delivery_priority: Literal["standard", "express", "emergency"] = "standard"
    origin: str
    destination: str
    urgency: Optional[str] = None
    special_requirements: List[str] = []


class VehicleRecommendation(BaseModel):
    recommended_vehicle: str
    vehicle_type: str
    capacity_ton: float
    terrain_capability: str
    suitability_score: float = Field(..., ge=0.0, le=1.0)
    reason: str
    alternatives: List[Dict[str, Any]] = []
    estimated_cost_inr: Optional[float] = None
    cargo_compatible: bool = True


class DeliveryPrioritizeRequest(BaseModel):
    delivery_id: Optional[str] = None
    cargo_type: Literal["medicine", "food", "water", "emergency_kit", "normal_parcel", "fuel", "construction", "livestock"]
    destination: str
    delivery_type: Literal["routine", "scheduled", "urgent"] = "routine"
    emergency_active: bool = False
    affected_population_estimate: Optional[int] = None
    medical_urgency: Optional[Literal["none", "low", "medium", "high", "critical"]] = "none"
    flood_affected: bool = False
    landslide_affected: bool = False


class DeliveryPriority(BaseModel):
    delivery_id: Optional[str] = None
    priority_score: int = Field(..., ge=0, le=100)
    priority_tier: Literal["critical", "high", "medium", "standard", "low"]
    reason: str
    factors: Dict[str, float]
    should_bump_normal_deliveries: bool
    human_approval_recommended: bool


class WhatIfScenarioRequest(BaseModel):
    scenario_type: Literal["road_block", "landslide", "flood", "weather_deterioration"]
    blocked_road_from: Optional[str] = None
    blocked_road_to: Optional[str] = None
    blocked_cities: List[str] = []
    weather_downgrade: bool = False
    simulate_vehicles: Optional[int] = 5
    simulate_deliveries: Optional[int] = 20


class WhatIfScenarioResponse(BaseModel):
    scenario: str
    severity: str
    affected_vehicles: int
    affected_deliveries: int
    emergency_deliveries_affected: int
    expected_additional_delay_minutes: int
    reroutes: List[Dict[str, Any]]
    summary: str
    recommendations: List[str] = []


class DecisionLogEntry(BaseModel):
    decision_id: str
    trigger_event: str
    timestamp: datetime
    inputs_summary: Dict[str, Any]
    scores_calculated: Dict[str, Any]
    routes_considered: List[str] = []
    final_route_selected: Optional[str] = None
    final_vehicle: Optional[str] = None
    reason: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    human_in_loop_required: bool = False
    alternative_option: Optional[str] = None


class ScoreBreakdown(BaseModel):
    travel_time_norm: float
    risk_score_norm: float
    road_condition_penalty_norm: float
    weather_penalty_norm: float
    terrain_penalty_norm: float
    vehicle_mismatch_penalty_norm: float
    emergency_priority_bonus_norm: float
    final_composite_score: float
    weights: Dict[str, float]
    interpretation: str


class AccessibilityScore100(BaseModel):
    location: str
    score_100: int = Field(..., ge=0, le=100)
    tier: Literal["Highly Accessible", "Moderate", "Difficult", "Critical"]
    weather_risk_component: int
    landslide_component: int
    road_condition_component: int
    traffic_component: int
    terrain_component: int
    vehicle_suitability: Dict[str, int]
    factors: Dict[str, Any]


AccessibilityScoreResponse.model_rebuild()
RouteOptimizeResponse.model_rebuild()


class DeliveryLocation(BaseModel):
    id: str
    lat: float
    lon: float
    demand_kg: Optional[int] = 100


class VehicleSpec(BaseModel):
    id: str
    capacity_kg: Optional[int] = 5000


class FleetOptimizeRequest(BaseModel):
    depot_lat: float = Field(26.1445, description="Depot latitude, e.g. Guwahati")
    depot_lon: float = Field(91.7362, description="Depot longitude")
    deliveries: List[DeliveryLocation]
    vehicles: List[VehicleSpec]


class FleetOptimizeResponse(BaseModel):
    assignments: Dict[str, List[str]]
    solver: str
    cost: Optional[float] = None

