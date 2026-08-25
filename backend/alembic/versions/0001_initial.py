"""Initial schema with PostGIS spatial columns.

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        "scenarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("scenario_type", sa.String(length=80), nullable=False, server_default="normal"),
        *timestamps(),
    )
    op.create_table(
        "nodes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("node_type", sa.String(length=40), nullable=False, server_default="intersection"),
        *timestamps(),
    )
    op.execute("ALTER TABLE nodes ADD COLUMN geom geometry(Point, 4326)")
    op.execute("CREATE INDEX idx_nodes_geom ON nodes USING GIST (geom)")
    op.create_table(
        "edges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_node_id", sa.Integer(), sa.ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_node_id", sa.Integer(), sa.ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("distance_km", sa.Float(), nullable=False),
        sa.Column("speed_kmph", sa.Float(), nullable=False),
        sa.Column("congestion_factor", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        *timestamps(),
    )
    op.execute("ALTER TABLE edges ADD COLUMN geom geometry(LineString, 4326)")
    op.execute("CREATE INDEX idx_edges_geom ON edges USING GIST (geom)")
    op.create_table(
        "depots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("node_id", sa.Integer(), sa.ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("inventory_units", sa.Integer(), nullable=False, server_default="0"),
        *timestamps(),
    )
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("depot_id", sa.Integer(), sa.ForeignKey("depots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("current_node_id", sa.Integer(), sa.ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("speed_kmph", sa.Float(), nullable=False, server_default="35"),
        sa.Column("available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *timestamps(),
    )
    op.create_table(
        "demands",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("node_id", sa.Integer(), sa.ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("time_window_start_min", sa.Float(), nullable=True),
        sa.Column("time_window_end_min", sa.Float(), nullable=True),
        sa.Column("service_time_min", sa.Float(), nullable=False, server_default="5"),
        *timestamps(),
    )
    op.create_table(
        "algorithm_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("algorithm", sa.String(length=80), nullable=False),
        sa.Column("objective", sa.String(length=80), nullable=False, server_default="minimize_total_distance"),
        sa.Column("parameters", sa.JSON(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "simulation_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="pending"),
        sa.Column("algorithms", sa.JSON(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
    )
    op.create_table(
        "dispatch_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scenario_id", sa.Integer(), sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("simulation_run_id", sa.Integer(), sa.ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("algorithm_config_id", sa.Integer(), sa.ForeignKey("algorithm_configs.id"), nullable=True),
        sa.Column("algorithm", sa.String(length=80), nullable=False),
        sa.Column("objective_value", sa.Float(), nullable=False, server_default="0"),
        sa.Column("runtime_ms", sa.Float(), nullable=False, server_default="0"),
        sa.Column("unserved_demands", sa.JSON(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "routes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dispatch_plan_id", sa.Integer(), sa.ForeignKey("dispatch_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("node_path", sa.JSON(), nullable=False),
        sa.Column("demand_sequence", sa.JSON(), nullable=False),
        sa.Column("distance_km", sa.Float(), nullable=False, server_default="0"),
        sa.Column("travel_time_min", sa.Float(), nullable=False, server_default="0"),
        sa.Column("load_units", sa.Integer(), nullable=False, server_default="0"),
        *timestamps(),
    )
    op.create_table(
        "metric_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("simulation_run_id", sa.Integer(), sa.ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dispatch_plan_id", sa.Integer(), sa.ForeignKey("dispatch_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("metric_name", sa.String(length=120), nullable=False),
        sa.Column("metric_value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=40), nullable=False, server_default=""),
        *timestamps(),
    )


def downgrade() -> None:
    for table_name in (
        "metric_results",
        "routes",
        "dispatch_plans",
        "simulation_runs",
        "algorithm_configs",
        "demands",
        "vehicles",
        "depots",
        "edges",
        "nodes",
        "scenarios",
    ):
        op.drop_table(table_name)
