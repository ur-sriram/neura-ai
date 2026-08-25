from __future__ import annotations

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Scenario
from app.services.scenario_service import scenario_summary
from app.services.simulation_service import comparison_for_run, get_routes_for_run, get_run


def _fallback_report(db: Session, run_id: int) -> str:
    run = get_run(db, run_id)
    if run is None:
        raise ValueError(f"Simulation run {run_id} does not exist")
    scenario = db.get(Scenario, run.scenario_id)
    routes = get_routes_for_run(db, run_id)
    comparison = comparison_for_run(db, run)
    best_by = comparison["summary"]["best_by"]
    summary = scenario_summary(db, scenario) if scenario else {}
    metric_names = [
        "total_distance",
        "average_response_time",
        "max_response_time",
        "completion_rate",
        "priority_completion_rate",
        "vehicle_utilization",
        "delayed_demands",
        "unserved_demands",
        "algorithm_runtime_ms",
    ]
    best_algorithm = comparison["summary"]["ranking"][0] if comparison["summary"]["ranking"] else None

    lines = [
        "# Emergency Scheduling Experiment Report",
        "",
        "## Scenario Description",
        f"- Scenario: {scenario.name if scenario else run.scenario_id}",
        f"- Description: {scenario.description if scenario else 'Unknown scenario'}",
        f"- Nodes: {summary.get('node_count', 0)}",
        f"- Edges: {summary.get('edge_count', 0)}",
        f"- Vehicles: {summary.get('vehicle_count', 0)}",
        f"- Demands: {summary.get('demand_count', 0)}",
        f"- Priority distribution: {summary.get('priority_distribution', {})}",
        f"- Congested edges: {summary.get('congested_edge_count', 0)}",
        f"- Blocked edges: {summary.get('blocked_edge_count', 0)}",
        f"- Expected challenge: {summary.get('expected_challenge', 'Custom experiment')}",
        "",
        "## Algorithm Configuration",
        f"- Algorithms: {', '.join(run.algorithms)}",
        "- Objective: weighted_multi_objective or user-selected API objective.",
        f"- Weighted score formula: {comparison['summary']['weighted_score_model']['formula']}",
        f"- Normalization: {comparison['summary']['weighted_score_model']['normalization']}",
        f"- Route records: {len(routes)}",
        "",
        "## Algorithm Comparison",
    ]
    for row in comparison["algorithms"]:
        lines.append(f"### {row['algorithm']} (Plan {row['dispatch_plan_id']})")
        lines.append(f"- Objective value: {row['objective_value']}")
        lines.append(f"- Routes: {row['route_count']}")
        lines.append(f"- Served demands: {row['served_demand_count']}")
        lines.append(f"- Unserved demand ids: {row['unserved_demand_ids']}")
        for metric_name, metric_value in sorted(row["metrics"].items()):
            lines.append(f"- {metric_name}: {metric_value}")
        lines.append(f"- Weighted score: {row['weighted_score']}")

    lines.append("")
    lines.append("## Metric Comparison Table")
    lines.append("| Algorithm | Weighted score | " + " | ".join(metric_names) + " |")
    lines.append("| --- | ---: | " + " | ".join(["---:"] * len(metric_names)) + " |")
    for row in comparison["algorithms"]:
        values = [str(row["metrics"].get(metric_name, "")) for metric_name in metric_names]
        lines.append(f"| {row['algorithm']} | {row['weighted_score']} | " + " | ".join(values) + " |")

    lines.append("")
    lines.append("## Best Algorithm Summary")
    if best_algorithm:
        lines.append(f"- Best weighted-score algorithm: {best_algorithm['algorithm']} ({best_algorithm['score']}).")
    for metric_name, item in sorted(best_by.items()):
        lines.append(
            f"- Best {metric_name}: {item['algorithm']} = {item['value']} ({item['direction']} is better)."
        )

    lines.append("")
    lines.append("## Best Metric Summary")
    for metric_name, item in sorted(best_by.items()):
        lines.append(
            f"- Best {metric_name}: {item['algorithm']} = {item['value']} ({item['direction']} is better)"
        )

    lines.append("")
    lines.append("## Composite Ranking")
    for index, item in enumerate(comparison["summary"]["ranking"], start=1):
        lines.append(f"- #{index}: {item['algorithm']} with score {item['score']}")

    lines += [
        "",
        "## Bottleneck Analysis",
        *[f"- {note}" for note in comparison["summary"]["bottlenecks"]],
        "",
        "## Engineering Recommendations",
        "- Use priority dispatch when life-cycle urgency matters more than total distance.",
        "- Use OR-Tools CVRP as the baseline for capacity-constrained routing, then compare heuristic runtime and quality.",
        "- Re-run the same scenario under congestion and demand surge to explain robustness.",
        "",
        "## Limitations",
        "- This MVP uses static demand snapshots; online re-optimization is planned as future work.",
        "- Traffic states are scenario parameters rather than live streaming data.",
        "",
        "## Future Work",
        "- Add rolling-horizon dispatch for dynamic incidents.",
        "- Add simplified VRPTW and stochastic travel-time simulation.",
        "- Export PDF reports and save experiment bundles for interviews.",
    ]
    return "\n".join(lines)


def generate_report(db: Session, run_id: int) -> tuple[str, str]:
    fallback = _fallback_report(db, run_id)
    settings = get_settings()
    if not settings.llm_api_key or not settings.llm_base_url:
        return fallback, "deterministic-template"

    base_url = settings.llm_base_url.rstrip("/")
    endpoint = base_url if base_url.endswith("/chat/completions") else f"{base_url}/v1/chat/completions"
    try:
        response = httpx.post(
            endpoint,
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={
                "model": settings.llm_model,
                "messages": [
                    {
                        "role": "system",
                        "content": "Write concise, technical English experiment reports for system engineering interviews.",
                    },
                    {
                        "role": "user",
                        "content": f"Rewrite and improve this markdown report without inventing data:\n\n{fallback}",
                    },
                ],
                "temperature": 0.2,
            },
            timeout=20.0,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return content, settings.llm_model
    except Exception:
        return fallback, "deterministic-template-after-llm-error"
