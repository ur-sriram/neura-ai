from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Scenario(TimestampMixin, Base):
    __tablename__ = "scenarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    scenario_type: Mapped[str] = mapped_column(String(80), default="normal")

    nodes: Mapped[list[Node]] = relationship(back_populates="scenario", cascade="all, delete-orphan")
    edges: Mapped[list[Edge]] = relationship(back_populates="scenario", cascade="all, delete-orphan")
    depots: Mapped[list[Depot]] = relationship(back_populates="scenario", cascade="all, delete-orphan")
    vehicles: Mapped[list[Vehicle]] = relationship(back_populates="scenario", cascade="all, delete-orphan")
    demands: Mapped[list[Demand]] = relationship(back_populates="scenario", cascade="all, delete-orphan")
    condition_reports: Mapped[list[ConditionReport]] = relationship(back_populates="scenario", cascade="all, delete-orphan")


class Node(TimestampMixin, Base):
    __tablename__ = "nodes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    node_type: Mapped[str] = mapped_column(String(40), default="intersection")

    scenario: Mapped[Scenario] = relationship(back_populates="nodes")


class Edge(TimestampMixin, Base):
    __tablename__ = "edges"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    source_node_id: Mapped[int] = mapped_column(ForeignKey("nodes.id", ondelete="CASCADE"), index=True)
    target_node_id: Mapped[int] = mapped_column(ForeignKey("nodes.id", ondelete="CASCADE"), index=True)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    speed_kmph: Mapped[float] = mapped_column(Float, nullable=False)
    congestion_factor: Mapped[float] = mapped_column(Float, default=1.0)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    surface_type: Mapped[str] = mapped_column(String(40), default="paved")
    bridge_tonnage_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    base_landslide_risk: Mapped[float] = mapped_column(Float, default=0.0)
    base_flood_risk: Mapped[float] = mapped_column(Float, default=0.0)
    accessibility_score: Mapped[float] = mapped_column(Float, default=1.0)

    scenario: Mapped[Scenario] = relationship(back_populates="edges")


class Depot(TimestampMixin, Base):
    __tablename__ = "depots"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    node_id: Mapped[int] = mapped_column(ForeignKey("nodes.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    inventory_units: Mapped[int] = mapped_column(Integer, default=0)

    scenario: Mapped[Scenario] = relationship(back_populates="depots")


class Vehicle(TimestampMixin, Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    depot_id: Mapped[int] = mapped_column(ForeignKey("depots.id", ondelete="CASCADE"), index=True)
    current_node_id: Mapped[int] = mapped_column(ForeignKey("nodes.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    speed_kmph: Mapped[float] = mapped_column(Float, default=35.0)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    is_4x4: Mapped[bool] = mapped_column(Boolean, default=False)
    weight_tons: Mapped[float] = mapped_column(Float, default=2.0)
    accessibility_equipped: Mapped[bool] = mapped_column(Boolean, default=False)

    scenario: Mapped[Scenario] = relationship(back_populates="vehicles")


class Demand(TimestampMixin, Base):
    __tablename__ = "demands"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    node_id: Mapped[int] = mapped_column(ForeignKey("nodes.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=3)
    time_window_start_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    time_window_end_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    service_time_min: Mapped[float] = mapped_column(Float, default=5.0)
    cargo_type: Mapped[str] = mapped_column(String(40), default="supplies")
    requires_accessibility: Mapped[bool] = mapped_column(Boolean, default=False)

    scenario: Mapped[Scenario] = relationship(back_populates="demands")


class AlgorithmConfig(TimestampMixin, Base):
    __tablename__ = "algorithm_configs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    algorithm: Mapped[str] = mapped_column(String(80), nullable=False)
    objective: Mapped[str] = mapped_column(String(80), default="minimize_total_distance")
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)


class SimulationRun(TimestampMixin, Base):
    __tablename__ = "simulation_runs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="pending")
    algorithms: Mapped[list[str]] = mapped_column(JSON, default=list)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    plans: Mapped[list[DispatchPlan]] = relationship(back_populates="simulation_run", cascade="all, delete-orphan")


class DispatchPlan(TimestampMixin, Base):
    __tablename__ = "dispatch_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    simulation_run_id: Mapped[int] = mapped_column(ForeignKey("simulation_runs.id", ondelete="CASCADE"), index=True)
    algorithm_config_id: Mapped[int | None] = mapped_column(ForeignKey("algorithm_configs.id"), nullable=True)
    algorithm: Mapped[str] = mapped_column(String(80), nullable=False)
    objective_value: Mapped[float] = mapped_column(Float, default=0.0)
    runtime_ms: Mapped[float] = mapped_column(Float, default=0.0)
    unserved_demands: Mapped[list[int]] = mapped_column(JSON, default=list)

    simulation_run: Mapped[SimulationRun] = relationship(back_populates="plans")
    routes: Mapped[list[Route]] = relationship(back_populates="dispatch_plan", cascade="all, delete-orphan")


class Route(TimestampMixin, Base):
    __tablename__ = "routes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    dispatch_plan_id: Mapped[int] = mapped_column(ForeignKey("dispatch_plans.id", ondelete="CASCADE"), index=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id", ondelete="CASCADE"), index=True)
    sequence_index: Mapped[int] = mapped_column(Integer, default=0)
    node_path: Mapped[list[int]] = mapped_column(JSON, default=list)
    demand_sequence: Mapped[list[dict]] = mapped_column(JSON, default=list)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    travel_time_min: Mapped[float] = mapped_column(Float, default=0.0)
    load_units: Mapped[int] = mapped_column(Integer, default=0)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    decision_rationale: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    dispatch_plan: Mapped[DispatchPlan] = relationship(back_populates="routes")


class MetricResult(TimestampMixin, Base):
    __tablename__ = "metric_results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    simulation_run_id: Mapped[int] = mapped_column(ForeignKey("simulation_runs.id", ondelete="CASCADE"), index=True)
    dispatch_plan_id: Mapped[int] = mapped_column(ForeignKey("dispatch_plans.id", ondelete="CASCADE"), index=True)
    metric_name: Mapped[str] = mapped_column(String(120), nullable=False)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(40), default="")


class ConditionReport(TimestampMixin, Base):
    __tablename__ = "condition_reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    edge_id: Mapped[int] = mapped_column(ForeignKey("edges.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    trust_score: Mapped[float] = mapped_column(Float, nullable=False)
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    scenario: Mapped[Scenario] = relationship(back_populates="condition_reports")
