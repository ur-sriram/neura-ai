"use client";

import { Gauge, Route, Timer, TriangleAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { Metric } from "@/types/api";

const labels: Record<string, string> = {
  total_distance: "Total Distance",
  average_response_time: "Avg Response",
  max_response_time: "Max Response",
  completion_rate: "Completion",
  priority_completion_rate: "Priority Completion",
  vehicle_utilization: "Utilization",
  delayed_demands: "Delayed",
  unserved_demands: "Unserved",
  algorithm_runtime_ms: "Runtime"
};

const iconByMetric = {
  total_distance: Route,
  average_response_time: Timer,
  completion_rate: Gauge,
  unserved_demands: TriangleAlert
};

export function MetricCards({ metrics }: { metrics: Metric[] }) {
  const firstPlanId = metrics[0]?.dispatch_plan_id;
  const visible = metrics.filter((metric) => metric.dispatch_plan_id === firstPlanId).slice(0, 9);

  if (!visible.length) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm font-semibold text-muted">No metrics yet. Run a simulation to populate the result dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {visible.map((metric) => {
        const Icon = iconByMetric[metric.metric_name as keyof typeof iconByMetric] ?? Gauge;
        const isRatio = metric.unit === "ratio";
        const value = isRatio ? `${Math.round(metric.metric_value * 100)}%` : `${metric.metric_value}${metric.unit ? ` ${metric.unit}` : ""}`;
        return (
          <Card key={metric.id}>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted">{labels[metric.metric_name] ?? metric.metric_name}</p>
                <p className="mt-2 text-2xl font-black">{value}</p>
              </div>
              <Icon className="h-7 w-7 text-accent" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
