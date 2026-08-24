import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, BigInteger,
    ForeignKey, CheckConstraint, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    role = Column(Text, nullable=False)  # manager, officer, driver
    pass_hash = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("role IN ('manager', 'officer', 'driver')", name="check_user_role"),
    )

class RoadSegment(Base):
    __tablename__ = 'road_segments'

    id = Column(BigInteger, primary_key=True)  # OSM way id
    osm_id = Column(BigInteger, nullable=False)
    geom = Column(Geometry('LINESTRING', srid=4326), nullable=False)
    highway_class = Column(Text)
    surface = Column(Text)
    oneway = Column(Boolean, default=False)
    bridge = Column(Boolean, default=False)
    maxweight = Column(Float, nullable=True)  # tonnes
    maxwidth = Column(Float, nullable=True)   # metres
    lanes = Column(Integer, default=1)
    access = Column(Text, default='yes')
    length_m = Column(Float, nullable=False)
    mean_grade = Column(Float, default=0.0)
    max_grade = Column(Float, default=0.0)
    h3_index = Column(Text, index=True)
    suscept_landslide = Column(Float, default=0.0)
    suscept_flood = Column(Float, default=0.0)
    provenance = Column(Text, default='real')

class SegmentStaticFactor(Base):
    __tablename__ = 'segment_static_factors'

    segment_id = Column(BigInteger, ForeignKey('road_segments.id'), primary_key=True)
    slope_class = Column(Text)
    aspect_class = Column(Text)
    elevation_m = Column(Float)
    near_river = Column(Boolean, default=False)
    historical_inundation_class = Column(Text)

class H3Cell(Base):
    __tablename__ = 'h3_cells'

    h3_index = Column(Text, primary_key=True)
    geom = Column(Geometry('POLYGON', srid=4326))
    population_class = Column(Text)
    mean_a_heavy = Column(Float)
    mean_a_mini = Column(Float)
    mean_a_4x4 = Column(Float)
    mean_a_special = Column(Float)
    band_heavy = Column(Text)
    band_mini = Column(Text)
    band_4x4 = Column(Text)
    band_special = Column(Text)

    __table_args__ = (
        CheckConstraint("population_class IN ('low','medium','high','urban')", name="check_h3_pop_class"),
    )

class Location(Base):
    __tablename__ = 'locations'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    kind = Column(Text, nullable=False)  # depot, village, health
    geom = Column(Geometry('POINT', srid=4326), nullable=False)
    population_class = Column(Text)
    cold_chain = Column(Boolean, default=False)
    accessible_entry = Column(Boolean, default=True)

    __table_args__ = (
        CheckConstraint("kind IN ('depot', 'village', 'health')", name="check_location_kind"),
    )

class Vehicle(Base):
    __tablename__ = 'vehicles'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label = Column(Text, nullable=False)
    vclass = Column('class', Text, nullable=False)  # heavy, mini, 4x4, ambulance, accessible_van
    capacity_kg = Column(Float, nullable=False)
    volume_m3 = Column(Float, nullable=False)
    width_m = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    cold_chain = Column(Boolean, default=False)
    accessible = Column(Boolean, default=False)
    home_depot = Column(UUID(as_uuid=True), ForeignKey('locations.id'), nullable=True)
    range_km = Column(Float, default=500.0)

    __table_args__ = (
        CheckConstraint("class IN ('heavy', 'mini', '4x4', 'ambulance', 'accessible_van')", name="check_vehicle_class"),
    )

class CargoType(Base):
    __tablename__ = 'cargo_types'

    code = Column(Text, primary_key=True)
    base_priority = Column(Integer, nullable=False)
    risk_tolerance = Column(Float, nullable=False)
    needs_cold_chain = Column(Boolean, default=False)
    is_passenger = Column(Boolean, default=False)

class WeatherTimeline(Base):
    __tablename__ = 'weather_timeline'

    sim_hour = Column(Integer, primary_key=True)
    zone = Column(Text, primary_key=True)  # brahmaputra_plain, khasi_hills
    rain_mm_h = Column(Float, default=0.0)
    wind_kph = Column(Float, default=0.0)
    visibility_km = Column(Float, default=10.0)
    source = Column(Text, default='open_meteo_archive')

class SegmentOverlay(Base):
    __tablename__ = 'segment_overlays'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    segment_id = Column(BigInteger, ForeignKey('road_segments.id'), nullable=False, index=True)
    lns_version = Column(Integer, nullable=False, index=True)
    valid_at_sim = Column(Integer, nullable=False, index=True)
    status = Column(Text, nullable=False)  # OPEN, SUSPECTED, CLOSED
    status_source = Column(Text)
    status_confidence = Column(Float, default=1.0)
    
    a_score_heavy = Column(Float)
    a_score_mini = Column(Float)
    a_score_4x4 = Column(Float)
    a_score_special = Column(Float)

    p_landslide_6h = Column(Float)
    p_landslide_12h = Column(Float)
    p_landslide_24h = Column(Float)
    p_landslide_48h = Column(Float)
    p_landslide_72h = Column(Float)

    p_flood_6h = Column(Float)
    p_flood_12h = Column(Float)
    p_flood_24h = Column(Float)
    p_flood_48h = Column(Float)
    p_flood_72h = Column(Float)

    eff_speed_kph = Column(Float)
    confidence = Column(Float, default=1.0)
    contributing_factors = Column(JSONB)
    computed_at_wall = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("status IN ('OPEN', 'SUSPECTED', 'CLOSED')", name="check_overlay_status"),
    )

class RoadStatusHistory(Base):
    __tablename__ = 'road_status_history'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    segment_id = Column(BigInteger, ForeignKey('road_segments.id'))
    from_status = Column(Text)
    to_status = Column(Text)
    event_id = Column(UUID(as_uuid=True))
    reason = Column(Text)
    at_sim = Column(Integer)

class HazardForecast(Base):
    __tablename__ = 'hazard_forecasts'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    segment_id = Column(BigInteger, ForeignKey('road_segments.id'))
    horizon_h = Column(Integer)
    p_landslide = Column(Float)
    p_flood = Column(Float)
    computed_at_sim = Column(Integer)
    model_version = Column(Text, default='v1')

class VehicleState(Base):
    __tablename__ = 'vehicle_states'

    vehicle_id = Column(UUID(as_uuid=True), ForeignKey('vehicles.id'), primary_key=True)
    current_geom = Column(Geometry('POINT', srid=4326))
    heading = Column(Float)
    assignment_id = Column(UUID(as_uuid=True), nullable=True)
    updated_sim = Column(Integer)

class Driver(Base):
    __tablename__ = 'drivers'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey('vehicles.id'))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    duty_status = Column(Text, default='available')

class Delivery(Base):
    __tablename__ = 'deliveries'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cargo_code = Column(Text, ForeignKey('cargo_types.code'))
    weight_kg = Column(Float, nullable=False)
    volume_m3 = Column(Float, nullable=False)
    dest_id = Column(UUID(as_uuid=True), ForeignKey('locations.id'))
    requested_by = Column(Text)
    deadline_sim = Column(Integer)
    priority_score = Column(Float, default=50.0)
    status = Column(Text, default='NEW')  # NEW, PLANNED, IN_TRANSIT, DELIVERED, DEFERRED, FAILED
    is_emergency = Column(Boolean, default=False)
    created_sim = Column(Integer, default=0)

    __table_args__ = (
        CheckConstraint("status IN ('NEW','PLANNED','IN_TRANSIT','DELIVERED','DEFERRED','FAILED')", name="check_delivery_status"),
    )

class Plan(Base):
    __tablename__ = 'plans'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version = Column(Integer, default=1)
    mode = Column(Text, default='NORMAL')  # NORMAL, EMERGENCY
    status = Column(Text, default='DRAFT') # DRAFT, PROPOSED, APPROVED, ACTIVE, SUPERSEDED
    objective_value = Column(Float)
    created_sim = Column(Integer)
    approved_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    approved_at_sim = Column(Integer)

    __table_args__ = (
        CheckConstraint("mode IN ('NORMAL','EMERGENCY')", name="check_plan_mode"),
        CheckConstraint("status IN ('DRAFT','PROPOSED','APPROVED','ACTIVE','SUPERSEDED')", name="check_plan_status"),
    )

class Assignment(Base):
    __tablename__ = 'assignments'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('plans.id'))
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey('vehicles.id'))
    depart_sim = Column(Integer)
    eta_p50 = Column(Integer)
    eta_p90 = Column(Integer)
    risk_score = Column(Float)
    status = Column(Text, default='PLANNED')

class Stop(Base):
    __tablename__ = 'stops'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey('assignments.id'))
    delivery_id = Column(UUID(as_uuid=True), ForeignKey('deliveries.id'))
    seq = Column(Integer, nullable=False)
    planned_arrival_sim = Column(Integer)
    actual_arrival_sim = Column(Integer)

class RouteCandidate(Base):
    __tablename__ = 'route_candidates'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey('assignments.id'), nullable=True)
    delivery_id = Column(UUID(as_uuid=True), ForeignKey('deliveries.id'), nullable=True)
    vehicle_class = Column(Text, nullable=False)
    geometry = Column(Geometry('LINESTRING', srid=4326))
    segment_ids = Column(ARRAY(BigInteger))
    distance_m = Column(Float)
    eta_p50 = Column(Integer)
    eta_p90 = Column(Integer)
    cost_total = Column(Float)
    cost_breakdown = Column(JSONB)
    feasible = Column(Boolean, default=True)
    rejection_reason = Column(Text)
    chosen = Column(Boolean, default=False)

class Event(Base):
    __tablename__ = 'events'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(Text, nullable=False)  # landslide, flood, report, weather, breakdown, surge, scenario
    payload = Column(JSONB, nullable=False)
    source_type = Column(Text)  # control_room, driver, citizen, weather, system
    source_trust = Column(Float, default=0.5)
    received_sim = Column(Integer)
    dedup_key = Column(Text, unique=True)
    corroboration_count = Column(Integer, default=1)
    resolved = Column(Boolean, default=False)

class EventSegmentImpact(Base):
    __tablename__ = 'event_segment_impacts'

    event_id = Column(UUID(as_uuid=True), ForeignKey('events.id'), primary_key=True)
    segment_id = Column(BigInteger, ForeignKey('road_segments.id'), primary_key=True)
    applied_status = Column(Text)
    confidence = Column(Float)

class DecisionRecord(Base):
    __tablename__ = 'decision_records'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trigger_event_id = Column(UUID(as_uuid=True), ForeignKey('events.id'), nullable=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('plans.id'), nullable=True)
    decision_type = Column(Text)
    inputs_snapshot = Column(JSONB)
    candidates = Column(JSONB, nullable=False)
    selection = Column(JSONB)
    rationale_template = Column(Text)
    confidence = Column(Float)
    created_sim = Column(Integer)

class ApprovalEvent(Base):
    __tablename__ = 'approval_events'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    decision_id = Column(UUID(as_uuid=True), ForeignKey('decision_records.id'))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    action = Column(Text)
    at_wall = Column(DateTime(timezone=True), default=datetime.utcnow)
    note = Column(Text)

    __table_args__ = (
        CheckConstraint("action IN ('approve','reject','modify')", name="check_approval_action"),
    )

class SimulationRun(Base):
    __tablename__ = 'simulation_runs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    fork_lns_version = Column(Integer)
    mutations = Column(JSONB)
    diff_result = Column(JSONB)
    status = Column(Text, default='pending')
    created_wall = Column(DateTime(timezone=True), default=datetime.utcnow)

class DemandForecast(Base):
    __tablename__ = 'demand_forecasts'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    h3_index = Column(Text, ForeignKey('h3_cells.h3_index'), nullable=True)
    commodity = Column(Text)
    horizon_h = Column(Integer)
    expected_uplift = Column(Float)
    confidence = Column(Float)
    model = Column(Text, default='elasticity_v1')

class AuditLog(Base):
    __tablename__ = 'audit_log'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    wall_time = Column(DateTime(timezone=True), default=datetime.utcnow)
    sim_time = Column(Integer)
    actor_id = Column(UUID(as_uuid=True), nullable=True)
    entity_type = Column(Text)
    entity_id = Column(Text)
    action = Column(Text)
    detail = Column(JSONB)

class ModelRun(Base):
    __tablename__ = 'model_runs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    artifact = Column(Text)  # hazard_model, eta_model
    metrics = Column(JSONB)
    trained_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    notes = Column(Text)
