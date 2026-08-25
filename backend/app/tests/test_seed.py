from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import Demand, Edge, Scenario, Vehicle
from app.seeds.seed_data import seed_default_scenarios


def test_seed_default_scenarios_creates_research_benchmarks():
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    with Session() as db:
        scenarios = seed_default_scenarios(db)
        names = {scenario.name for scenario in scenarios}

        assert names == {
            "Normal Scenario",
            "Congestion Scenario",
            "Demand Surge Scenario",
            "Resource Shortage Scenario",
            "Blocked Road Scenario",
            "High Priority Rescue Scenario",
        }
        assert db.scalar(select(Scenario).where(Scenario.name == "Normal Scenario")) is not None
        assert db.scalar(select(Edge.id).limit(1)) is not None
        assert db.scalar(select(Vehicle.id).limit(1)) is not None
        assert db.scalar(select(Demand.id).limit(1)) is not None
        assert len(scenarios) == 6


def test_seed_default_scenarios_repairs_existing_empty_default_scenarios():
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    with Session() as db:
        db.add_all(
            [
                Scenario(name="Normal Scenario", description="", scenario_type="normal"),
                Scenario(name="Congestion Scenario", description="", scenario_type="congestion"),
                Scenario(name="Demand Surge Scenario", description="", scenario_type="surge"),
                Scenario(name="Resource Shortage Scenario", description="", scenario_type="shortage"),
                Scenario(name="Blocked Road Scenario", description="", scenario_type="blocked"),
                Scenario(name="High Priority Rescue Scenario", description="", scenario_type="high_priority"),
            ]
        )
        db.commit()

        seed_default_scenarios(db)

        assert db.scalar(select(Edge.id).limit(1)) is not None
        assert db.scalar(select(Vehicle.id).limit(1)) is not None
        assert db.scalar(select(Demand.id).limit(1)) is not None


def test_research_scenarios_encode_distinct_experimental_challenges():
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    with Session() as db:
        seed_default_scenarios(db)
        blocked = db.scalar(select(Scenario).where(Scenario.scenario_type == "blocked"))
        shortage = db.scalar(select(Scenario).where(Scenario.scenario_type == "shortage"))
        high_priority = db.scalar(select(Scenario).where(Scenario.scenario_type == "high_priority"))

        assert db.scalar(select(Edge.id).where(Edge.scenario_id == blocked.id, Edge.is_blocked.is_(True))) is not None
        assert len(db.scalars(select(Vehicle).where(Vehicle.scenario_id == shortage.id)).all()) == 2
        high_priority_demands = db.scalars(
            select(Demand).where(Demand.scenario_id == high_priority.id, Demand.priority == 5)
        ).all()
        assert len(high_priority_demands) >= 4
