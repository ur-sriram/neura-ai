"""Seed data for NE-SETU: Northeast India corridor scenarios.

Nodes represent real locations along the key corridors:
  - NH-6 Guwahati-Shillong National Highway
  - R-114 Umroi Alternate Hill Route
  - NH-6 Shillong-Jowai Ridge Road
  - Byrnihat-Shillong Back Road

Edges carry NE-SETU specific attributes: surface_type, bridge_tonnage_limit,
base_landslide_risk, base_flood_risk, and accessibility_score.
"""
from __future__ import annotations

import math
from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Demand, Depot, Edge, Node, Scenario, Vehicle


# ---------------------------------------------------------------------------
# Northeast India node locations (real approximate lat/lon)
# ---------------------------------------------------------------------------
NE_NODES = [
    # NH-6 Main Corridor
    {"name": "Guwahati-Hub", "lat": 26.1445, "lon": 91.7362, "type": "hub"},
    {"name": "Jorabat", "lat": 26.0860, "lon": 91.8220, "type": "junction"},
    {"name": "Byrnihat", "lat": 25.9870, "lon": 91.8960, "type": "junction"},
    {"name": "Nongpoh", "lat": 25.9020, "lon": 91.8730, "type": "town"},
    {"name": "Umroi", "lat": 25.7670, "lon": 91.8580, "type": "junction"},
    {"name": "Shillong", "lat": 25.5788, "lon": 91.8933, "type": "hub"},
    # Shillong-Jowai Ridge
    {"name": "Pynursla", "lat": 25.4350, "lon": 91.9510, "type": "town"},
    {"name": "Jowai", "lat": 25.4530, "lon": 92.2030, "type": "hub"},
    # Alternate / Back Routes
    {"name": "Mawlai", "lat": 25.5990, "lon": 91.8660, "type": "junction"},
    {"name": "Smit", "lat": 25.6280, "lon": 91.8410, "type": "village"},
    {"name": "Laitlyngkot", "lat": 25.6870, "lon": 91.8250, "type": "village"},
    # Southern access
    {"name": "Dawki", "lat": 25.1820, "lon": 92.0230, "type": "border_town"},
    {"name": "Cherrapunji", "lat": 25.2748, "lon": 91.7315, "type": "town"},
    # Eastern link
    {"name": "Mawsynram", "lat": 25.2970, "lon": 91.5830, "type": "village"},
    {"name": "Tura", "lat": 25.5130, "lon": 90.2170, "type": "hub"},
]

# ---------------------------------------------------------------------------
# Edges: (src_idx, tgt_idx, distance_km, speed_kmph, surface, bridge_tonnage,
#          landslide_risk, flood_risk, congestion_factor)
# ---------------------------------------------------------------------------
NE_EDGES = [
    # NH-6 Main: Guwahati -> Jorabat -> Byrnihat -> Nongpoh -> Umroi -> Shillong
    (0, 1, 12.5, 50.0, "paved", None, 0.05, 0.10, 1.0),
    (1, 2, 14.0, 45.0, "paved", 15.0, 0.10, 0.15, 1.0),
    (2, 3, 18.0, 40.0, "paved", 12.0, 0.25, 0.10, 1.0),
    (3, 4, 16.5, 35.0, "paved", 10.0, 0.35, 0.15, 1.0),
    (4, 5, 22.0, 30.0, "paved", 10.0, 0.40, 0.20, 1.0),
    # Shillong -> Jowai Ridge
    (5, 6, 28.0, 30.0, "mixed", 8.0, 0.50, 0.25, 1.0),
    (6, 7, 35.0, 35.0, "paved", 10.0, 0.30, 0.15, 1.0),
    # Back roads: Shillong -> Mawlai -> Smit -> Laitlyngkot -> Nongpoh
    (5, 8, 4.0, 25.0, "paved", None, 0.10, 0.05, 1.2),
    (8, 9, 6.5, 20.0, "mixed", 6.0, 0.20, 0.10, 1.0),
    (9, 10, 8.0, 20.0, "gravel", 5.0, 0.45, 0.20, 1.0),
    (10, 3, 22.0, 25.0, "gravel", 5.0, 0.55, 0.30, 1.0),
    # Southern access
    (5, 12, 55.0, 25.0, "mixed", 8.0, 0.60, 0.35, 1.0),
    (12, 11, 65.0, 20.0, "gravel", 5.0, 0.70, 0.40, 1.0),
    # Cherrapunji -> Mawsynram
    (12, 13, 38.0, 20.0, "gravel", None, 0.65, 0.50, 1.0),
    # Guwahati -> Tura (long western link)
    (0, 14, 220.0, 45.0, "paved", 15.0, 0.15, 0.20, 1.0),
]


SCENARIO_PROFILES = {
    "ne_normal": {
        "name": "NE-SETU Baseline",
        "description": "Normal monsoon conditions on the Guwahati-Shillong-Jowai corridor. All roads open, moderate risk.",
        "expected_challenge": "Control group for distance, response time, and risk score comparison across NE corridors.",
    },
    "ne_monsoon_landslide": {
        "name": "Monsoon Landslide (NH-6)",
        "description": "Heavy monsoon causes landslides blocking the Nongpoh-Umroi section of NH-6. Vehicles must re-route via back roads or wait.",
        "expected_challenge": "Tests two-stage routing: Stage A rejects blocked NH-6 segments, Stage B optimizes via risk-weighted back roads.",
    },
    "ne_flood_surge": {
        "name": "Flood Surge + Demand Spike",
        "description": "Flash floods in the Shillong basin increase demand for medical supplies and evacuation. Multiple roads degraded.",
        "expected_challenge": "Tests capacity under surge demand with flood-degraded roads and bridge weight constraints.",
    },
    "ne_medical_evacuation": {
        "name": "Priority Medical Evacuation",
        "description": "Urgent medical evacuation from Cherrapunji and Dawki via accessibility-equipped vehicles. High-priority assisted mobility.",
        "expected_challenge": "Tests accessibility-equipped vehicle assignment and priority completion for person-as-cargo demands.",
    },
    "ne_bridge_weight": {
        "name": "Bridge Weight Restriction",
        "description": "Multiple hill bridges on NH-6 and back roads have tonnage limits. Heavy supply trucks must find alternate routes.",
        "expected_challenge": "Tests Stage A bridge tonnage hard constraint filtering — heavy vehicles excluded from weak bridges.",
    },
    "ne_multi_hazard": {
        "name": "Multi-Hazard Compound Event",
        "description": "Combined landslide on NH-6, flooding near Cherrapunji, and a high-priority rescue in Dawki. All constraints active.",
        "expected_challenge": "Stress test: all NE-SETU features active simultaneously — blocked roads, flood risk, bridge limits, accessibility, priority.",
    },
}

DEFAULT_SCENARIOS = [
    (profile["name"], profile["description"], scenario_type)
    for scenario_type, profile in SCENARIO_PROFILES.items()
]


def _distance_km(a: Node, b: Node) -> float:
    lat_km = (a.latitude - b.latitude) * 111.0
    lon_km = (a.longitude - b.longitude) * 111.0 * math.cos(math.radians(a.latitude))
    return round(math.sqrt(lat_km * lat_km + lon_km * lon_km), 3)


def _reset_scenario_children(db: Session, scenario_id: int) -> None:
    for model in (Demand, Vehicle, Depot, Edge, Node):
        db.execute(delete(model).where(model.scenario_id == scenario_id))


def populate_scenario(db: Session, scenario: Scenario) -> Scenario:
    """Create nodes, edges, depots, vehicles, and demands for a NE-SETU scenario."""
    _reset_scenario_children(db, scenario.id)
    db.flush()

    # --- Create Nodes ---
    node_objs: list[Node] = []
    for info in NE_NODES:
        node = Node(
            scenario_id=scenario.id,
            name=info["name"],
            latitude=info["lat"],
            longitude=info["lon"],
            node_type=info["type"],
        )
        db.add(node)
        node_objs.append(node)
    db.flush()

    # --- Create Edges (bidirectional) ---
    stype = scenario.scenario_type

    for src_i, tgt_i, dist, speed, surface, bridge, lrisk, frisk, cong in NE_EDGES:
        src_node = node_objs[src_i]
        tgt_node = node_objs[tgt_i]

        # Scenario-specific overrides
        blocked = False
        adjusted_cong = cong
        adjusted_lrisk = lrisk
        adjusted_frisk = frisk

        if stype == "ne_monsoon_landslide":
            # Block Nongpoh-Umroi section (edge indices 3->4)
            if (src_i, tgt_i) in [(3, 4), (4, 3)]:
                blocked = True
            # Increase landslide risk on surrounding hill roads
            if lrisk > 0.3:
                adjusted_lrisk = min(lrisk * 1.8, 1.0)

        elif stype == "ne_flood_surge":
            # Increase flood risk basin-wide
            adjusted_frisk = min(frisk * 2.0, 1.0)
            # Congestion on NH-6
            if surface == "paved":
                adjusted_cong = max(cong, 1.5)

        elif stype == "ne_bridge_weight":
            pass  # Bridge limits are already in the edge data; no override needed

        elif stype == "ne_multi_hazard":
            # Block Nongpoh-Umroi
            if (src_i, tgt_i) in [(3, 4), (4, 3)]:
                blocked = True
            # Flood near Cherrapunji and Dawki
            if src_i in [11, 12, 13] or tgt_i in [11, 12, 13]:
                adjusted_frisk = min(frisk * 2.5, 1.0)
            adjusted_lrisk = min(lrisk * 1.5, 1.0)

        for s_id, t_id in [(src_node.id, tgt_node.id), (tgt_node.id, src_node.id)]:
            db.add(Edge(
                scenario_id=scenario.id,
                source_node_id=s_id,
                target_node_id=t_id,
                distance_km=dist,
                speed_kmph=speed,
                congestion_factor=adjusted_cong,
                is_blocked=blocked,
                surface_type=surface,
                bridge_tonnage_limit=bridge,
                base_landslide_risk=adjusted_lrisk,
                base_flood_risk=adjusted_frisk,
                accessibility_score=max(0.1, 1.0 - adjusted_lrisk - adjusted_frisk),
            ))

    db.flush()

    # --- Depots ---
    # Guwahati hub depot
    depot_guwahati = Depot(
        scenario_id=scenario.id,
        node_id=node_objs[0].id,  # Guwahati-Hub
        name="Guwahati Central Relief Depot",
        inventory_units=500 if stype != "ne_flood_surge" else 300,
    )
    # Shillong hub depot
    depot_shillong = Depot(
        scenario_id=scenario.id,
        node_id=node_objs[5].id,  # Shillong
        name="Shillong Medical & Supplies Depot",
        inventory_units=350 if stype != "ne_flood_surge" else 200,
    )
    db.add_all([depot_guwahati, depot_shillong])
    db.flush()

    # --- Vehicles ---
    vehicle_specs: list[dict] = [
        {"depot": depot_guwahati, "node": node_objs[0], "name": "Heavy Truck GW-01",
         "capacity": 60, "speed": 40.0, "is_4x4": False, "weight": 12.0, "access": False},
        {"depot": depot_guwahati, "node": node_objs[0], "name": "4x4 Rescue GW-02",
         "capacity": 25, "speed": 35.0, "is_4x4": True, "weight": 4.0, "access": True},
        {"depot": depot_shillong, "node": node_objs[5], "name": "Medical Van SH-01",
         "capacity": 30, "speed": 35.0, "is_4x4": False, "weight": 3.5, "access": True},
        {"depot": depot_shillong, "node": node_objs[5], "name": "4x4 Supply SH-02",
         "capacity": 35, "speed": 30.0, "is_4x4": True, "weight": 5.0, "access": False},
    ]

    if stype == "ne_flood_surge":
        # Add an extra vehicle from Guwahati
        vehicle_specs.append(
            {"depot": depot_guwahati, "node": node_objs[0], "name": "Emergency Boat GW-03",
             "capacity": 20, "speed": 15.0, "is_4x4": True, "weight": 2.0, "access": True}
        )

    for vspec in vehicle_specs:
        db.add(Vehicle(
            scenario_id=scenario.id,
            depot_id=vspec["depot"].id,
            current_node_id=vspec["node"].id,
            name=vspec["name"],
            capacity=vspec["capacity"],
            speed_kmph=vspec["speed"],
            available=True,
            is_4x4=vspec["is_4x4"],
            weight_tons=vspec["weight"],
            accessibility_equipped=vspec["access"],
        ))

    # --- Demands ---
    demand_specs: list[dict] = [
        {"node": node_objs[3], "name": "Nongpoh Medical Supplies", "qty": 20, "pri": 4,
         "due": 60.0, "cargo": "medical", "access": False},
        {"node": node_objs[7], "name": "Jowai Relief Supplies", "qty": 30, "pri": 3,
         "due": 120.0, "cargo": "supplies", "access": False},
        {"node": node_objs[12], "name": "Cherrapunji Food Aid", "qty": 25, "pri": 3,
         "due": 90.0, "cargo": "supplies", "access": False},
        {"node": node_objs[11], "name": "Dawki Border Supply", "qty": 15, "pri": 2,
         "due": 150.0, "cargo": "supplies", "access": False},
        {"node": node_objs[10], "name": "Laitlyngkot Village Aid", "qty": 10, "pri": 3,
         "due": 100.0, "cargo": "supplies", "access": False},
        {"node": node_objs[14], "name": "Tura District Supply", "qty": 40, "pri": 2,
         "due": 300.0, "cargo": "supplies", "access": False},
    ]

    if stype in ("ne_flood_surge", "ne_multi_hazard"):
        demand_specs.extend([
            {"node": node_objs[4], "name": "Umroi Emergency Medical", "qty": 15, "pri": 5,
             "due": 45.0, "cargo": "medical", "access": False},
            {"node": node_objs[13], "name": "Mawsynram Flood Rescue", "qty": 8, "pri": 5,
             "due": 40.0, "cargo": "person", "access": True},
            {"node": node_objs[6], "name": "Pynursla Evacuation", "qty": 12, "pri": 5,
             "due": 50.0, "cargo": "person", "access": True},
        ])

    if stype == "ne_medical_evacuation":
        demand_specs = [
            {"node": node_objs[12], "name": "Cherrapunji Patient Evac", "qty": 2, "pri": 5,
             "due": 40.0, "cargo": "person", "access": True},
            {"node": node_objs[11], "name": "Dawki Patient Evac", "qty": 3, "pri": 5,
             "due": 50.0, "cargo": "person", "access": True},
            {"node": node_objs[3], "name": "Nongpoh Medical Supplies", "qty": 20, "pri": 4,
             "due": 60.0, "cargo": "medical", "access": False},
            {"node": node_objs[7], "name": "Jowai Medical Resupply", "qty": 25, "pri": 3,
             "due": 90.0, "cargo": "medical", "access": False},
        ]

    for idx, dspec in enumerate(demand_specs, start=1):
        db.add(Demand(
            scenario_id=scenario.id,
            node_id=dspec["node"].id,
            name=dspec["name"],
            quantity=dspec["qty"],
            priority=dspec["pri"],
            time_window_start_min=0.0,
            time_window_end_min=dspec["due"],
            service_time_min=5.0 + dspec["pri"],
            cargo_type=dspec["cargo"],
            requires_accessibility=dspec["access"],
        ))

    _sync_postgis_columns(db, scenario.id)
    return scenario


def _sync_postgis_columns(db: Session, scenario_id: int) -> None:
    if db.bind is None or db.bind.dialect.name != "postgresql":
        return
    has_geom = db.scalar(
        text(
            """
            SELECT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'nodes' AND column_name = 'geom'
            )
            """
        )
    )
    if not has_geom:
        return
    db.execute(
        text(
            """
            UPDATE nodes
            SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
            WHERE scenario_id = :scenario_id
            """
        ),
        {"scenario_id": scenario_id},
    )
    db.execute(
        text(
            """
            UPDATE edges e
            SET geom = ST_MakeLine(s.geom, t.geom)
            FROM nodes s, nodes t
            WHERE e.source_node_id = s.id
              AND e.target_node_id = t.id
              AND e.scenario_id = :scenario_id
            """
        ),
        {"scenario_id": scenario_id},
    )


def seed_default_scenarios(db: Session) -> list[Scenario]:
    scenarios: list[Scenario] = []
    for name, description, scenario_type in DEFAULT_SCENARIOS:
        scenario = db.scalar(select(Scenario).where(Scenario.name == name))
        if scenario is None:
            scenario = Scenario(name=name, description=description, scenario_type=scenario_type)
            db.add(scenario)
            db.flush()
            populate_scenario(db, scenario)
        else:
            node_count = db.scalar(select(func.count(Node.id)).where(Node.scenario_id == scenario.id)) or 0
            edge_count = db.scalar(select(func.count(Edge.id)).where(Edge.scenario_id == scenario.id)) or 0
            vehicle_count = db.scalar(select(func.count(Vehicle.id)).where(Vehicle.scenario_id == scenario.id)) or 0
            demand_count = db.scalar(select(func.count(Demand.id)).where(Demand.scenario_id == scenario.id)) or 0
            if min(node_count, edge_count, vehicle_count, demand_count) == 0:
                populate_scenario(db, scenario)
        scenarios.append(scenario)
    db.commit()
    return scenarios


def main() -> None:
    with SessionLocal() as db:
        seed_default_scenarios(db)


if __name__ == "__main__":
    main()
