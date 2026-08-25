from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.algorithms.types import DemandInput, DepotInput, EdgeInput, NodeInput, VehicleInput
from app.models import Demand, Depot, Edge, Node, Scenario, Vehicle
from app.schemas import ScenarioCreate
from app.seeds.seed_data import SCENARIO_PROFILES, populate_scenario


def create_scenario(db: Session, payload: ScenarioCreate) -> Scenario:
    scenario = Scenario(
        name=payload.name,
        description=payload.description,
        scenario_type=payload.scenario_type,
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


def get_scenario_or_none(db: Session, scenario_id: int) -> Scenario | None:
    return db.get(Scenario, scenario_id)


def scenario_summary(db: Session, scenario: Scenario) -> dict:
    priorities = db.execute(
        select(Demand.priority, func.count(Demand.id))
        .where(Demand.scenario_id == scenario.id)
        .group_by(Demand.priority)
        .order_by(Demand.priority.desc())
    ).all()
    profile = SCENARIO_PROFILES.get(scenario.scenario_type, {})
    return {
        "id": scenario.id,
        "name": scenario.name,
        "description": scenario.description,
        "scenario_type": scenario.scenario_type,
        "created_at": scenario.created_at,
        "updated_at": scenario.updated_at,
        "node_count": db.scalar(select(func.count(Node.id)).where(Node.scenario_id == scenario.id)) or 0,
        "edge_count": db.scalar(select(func.count(Edge.id)).where(Edge.scenario_id == scenario.id)) or 0,
        "vehicle_count": db.scalar(select(func.count(Vehicle.id)).where(Vehicle.scenario_id == scenario.id)) or 0,
        "demand_count": db.scalar(select(func.count(Demand.id)).where(Demand.scenario_id == scenario.id)) or 0,
        "priority_distribution": {str(priority): count for priority, count in priorities},
        "congested_edge_count": db.scalar(
            select(func.count(Edge.id)).where(Edge.scenario_id == scenario.id, Edge.congestion_factor > 1.0)
        )
        or 0,
        "blocked_edge_count": db.scalar(
            select(func.count(Edge.id)).where(Edge.scenario_id == scenario.id, Edge.is_blocked.is_(True))
        )
        or 0,
        "expected_challenge": profile.get("expected_challenge", "Custom scenario for ad-hoc experiment design."),
    }


def list_scenario_summaries(db: Session) -> list[dict]:
    scenarios = db.scalars(select(Scenario).order_by(Scenario.id)).all()
    return [scenario_summary(db, scenario) for scenario in scenarios]


def seed_scenario(db: Session, scenario_id: int) -> Scenario | None:
    scenario = db.get(Scenario, scenario_id)
    if scenario is None:
        return None
    populate_scenario(db, scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


def fork_scenario(db: Session, scenario_id: int) -> Scenario | None:
    original = db.get(Scenario, scenario_id)
    if original is None:
        return None

    # 1. Clone Scenario
    forked = Scenario(
        name=f"[What-If] {original.name}",
        description=f"Counterfactual fork of Scenario #{scenario_id}",
        scenario_type=original.scenario_type,
    )
    db.add(forked)
    db.flush()  # get forked.id

    # 2. Clone Nodes & maintain mapping
    node_mapping = {}
    nodes = db.scalars(select(Node).where(Node.scenario_id == scenario_id)).all()
    for n in nodes:
        new_node = Node(
            scenario_id=forked.id,
            latitude=n.latitude,
            longitude=n.longitude,
        )
        db.add(new_node)
        db.flush()
        node_mapping[n.id] = new_node.id

    # 3. Clone Edges
    edges = db.scalars(select(Edge).where(Edge.scenario_id == scenario_id)).all()
    for e in edges:
        new_edge = Edge(
            scenario_id=forked.id,
            source_node_id=node_mapping[e.source_node_id],
            target_node_id=node_mapping[e.target_node_id],
            distance_km=e.distance_km,
            speed_kmph=e.speed_kmph,
            congestion_factor=e.congestion_factor,
            is_blocked=e.is_blocked,
            surface_type=e.surface_type,
            bridge_tonnage_limit=e.bridge_tonnage_limit,
            base_landslide_risk=e.base_landslide_risk,
            base_flood_risk=e.base_flood_risk,
            accessibility_score=e.accessibility_score,
        )
        db.add(new_edge)

    # 4. Clone Depots (mapping nodes)
    depot_mapping = {}
    depots = db.scalars(select(Depot).where(Depot.scenario_id == scenario_id)).all()
    for d in depots:
        new_depot = Depot(
            scenario_id=forked.id,
            node_id=node_mapping[d.node_id],
            inventory_units=d.inventory_units,
        )
        db.add(new_depot)
        db.flush()
        depot_mapping[d.id] = new_depot.id

    # 5. Clone Vehicles (mapping depots and nodes)
    vehicles = db.scalars(select(Vehicle).where(Vehicle.scenario_id == scenario_id)).all()
    for v in vehicles:
        new_vehicle = Vehicle(
            scenario_id=forked.id,
            depot_id=depot_mapping[v.depot_id],
            current_node_id=node_mapping[v.current_node_id] if v.current_node_id else None,
            capacity=v.capacity,
            speed_kmph=v.speed_kmph,
            available=v.available,
            is_4x4=v.is_4x4,
            weight_tons=v.weight_tons,
            accessibility_equipped=v.accessibility_equipped,
        )
        db.add(new_vehicle)

    # 6. Clone Demands (mapping nodes)
    demands = db.scalars(select(Demand).where(Demand.scenario_id == scenario_id)).all()
    for d in demands:
        new_demand = Demand(
            scenario_id=forked.id,
            node_id=node_mapping[d.node_id],
            name=d.name,
            quantity=d.quantity,
            priority=d.priority,
            service_time_min=d.service_time_min,
            time_window_start_min=d.time_window_start_min,
            time_window_end_min=d.time_window_end_min,
            cargo_type=d.cargo_type,
            requires_accessibility=d.requires_accessibility,
            is_fulfilled=d.is_fulfilled,
        )
        db.add(new_demand)

    db.commit()
    db.refresh(forked)
    return forked


def load_network(db: Session, scenario_id: int) -> dict:
    return {
        "nodes": list(db.scalars(select(Node).where(Node.scenario_id == scenario_id).order_by(Node.id)).all()),
        "edges": list(db.scalars(select(Edge).where(Edge.scenario_id == scenario_id).order_by(Edge.id)).all()),
        "depots": list(db.scalars(select(Depot).where(Depot.scenario_id == scenario_id).order_by(Depot.id)).all()),
        "vehicles": list(db.scalars(select(Vehicle).where(Vehicle.scenario_id == scenario_id).order_by(Vehicle.id)).all()),
        "demands": list(db.scalars(select(Demand).where(Demand.scenario_id == scenario_id).order_by(Demand.id)).all()),
    }


def algorithm_inputs(db: Session, scenario_id: int) -> tuple[list[NodeInput], list[EdgeInput], list[DepotInput], list[VehicleInput], list[DemandInput]]:
    network = load_network(db, scenario_id)
    nodes = [NodeInput(n.id, n.latitude, n.longitude) for n in network["nodes"]]
    edges = [
        EdgeInput(
            e.id, e.source_node_id, e.target_node_id, e.distance_km, e.speed_kmph,
            e.congestion_factor, e.is_blocked,
            surface_type=e.surface_type,
            bridge_tonnage_limit=e.bridge_tonnage_limit,
            base_landslide_risk=e.base_landslide_risk,
            base_flood_risk=e.base_flood_risk,
            accessibility_score=e.accessibility_score,
        )
        for e in network["edges"]
    ]
    depots = [DepotInput(d.id, d.node_id, d.inventory_units) for d in network["depots"]]
    vehicles = [
        VehicleInput(
            v.id, v.depot_id, v.current_node_id, v.capacity, v.speed_kmph, v.available,
            is_4x4=v.is_4x4,
            weight_tons=v.weight_tons,
            accessibility_equipped=v.accessibility_equipped,
        )
        for v in network["vehicles"]
    ]
    demands = [
        DemandInput(
            d.id, d.node_id, d.quantity, d.priority, d.service_time_min,
            d.time_window_start_min, d.time_window_end_min,
            cargo_type=d.cargo_type,
            requires_accessibility=d.requires_accessibility,
        )
        for d in network["demands"]
    ]
    return nodes, edges, depots, vehicles, demands
