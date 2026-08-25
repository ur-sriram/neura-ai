"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPanel } from "@/components/ui/status";
import { MetricCards } from "@/features/dashboard/MetricCards";
import { NetworkMap } from "@/features/dashboard/NetworkMap";
import { getComparison, getMetrics, getNetwork, getRoutes } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Comparison, Metric, Network, Route } from "@/types/api";

function ResultsPageContent() {
  const params = useSearchParams();
  const storedRunId = useAppStore((state) => state.lastRunId);
  const runId = Number(params.get("runId")) || storedRunId;
  const scenarioId = Number(params.get("scenarioId")) || null;
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [network, setNetwork] = useState<Network | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    Promise.all([getMetrics(runId), getRoutes(runId)])
      .then(([metricData, routeData]) => {
        setMetrics(metricData);
        setRoutes(routeData);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load simulation results"));
  }, [runId]);

  useEffect(() => {
    if (!scenarioId) return;
    Promise.all([getNetwork(scenarioId), getComparison(scenarioId)])
      .then(([networkData, comparisonData]) => {
        setNetwork(networkData);
        setComparison(comparisonData);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load scenario comparison"));
  }, [scenarioId]);

  const chartData = useMemo(() => {
    return comparison?.algorithms.map((item) => ({
      algorithm: item.algorithm,
      total_distance: item.metrics.total_distance ?? 0,
      average_response_time: item.metrics.average_response_time ?? 0,
      completion_rate: Math.round((item.metrics.completion_rate ?? 0) * 100),
      priority_completion_rate: Math.round((item.metrics.priority_completion_rate ?? 0) * 100),
      algorithm_runtime_ms: item.metrics.algorithm_runtime_ms ?? 0,
      weighted_score: Math.round((item.weighted_score ?? 0) * 100)
    })) ?? [];
  }, [comparison]);

  const metricExplanation = comparison?.summary?.metric_explanations ?? {};

  if (!runId) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8">
        <Card><CardContent className="flex items-center justify-between"><span>No simulation run selected.</span><Button asChild><Link href="/simulation">Run Simulation</Link></Button></CardContent></Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-accent">Results Dashboard</p>
          <h1 className="mt-2 text-3xl font-black">Simulation Run #{runId}</h1>
        </div>
        <Button asChild variant="secondary"><Link href={`/report?runId=${runId}`}>Generate Report</Link></Button>
      </div>
      {error && <StatusPanel className="mt-6" title="Results unavailable" message={error} variant="error" />}
      <div className="mt-6"><MetricCards metrics={metrics} /></div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Route Visualization</CardTitle></CardHeader>
          <CardContent className="p-3">
            {network ? <NetworkMap network={network} routes={routes} /> : <StatusPanel title="Loading routes" message="Fetching route geometry and vehicle assignments from the backend." />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Vehicle Route Detail</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {routes.length === 0 && <StatusPanel title="No routes yet" message="This run has no route records. Empty scenarios and fully infeasible plans are shown here without crashing." />}
            {routes.map((route) => (
              <div key={route.id} className="rounded-[8px] border border-border p-3 text-sm">
                <div className="flex justify-between gap-3 font-bold">
                  <span>Vehicle {route.vehicle_id}</span>
                  <span>{route.distance_km} km</span>
                </div>
                <p className="mt-2 text-muted">Load {route.load_units} / {route.travel_time_min} min</p>
                <p className="mt-2 break-words text-xs text-muted">Nodes: {route.node_path.join(" -> ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Total Distance Comparison</CardTitle></CardHeader>
          <CardContent className="h-72">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="4 4" />
                  <XAxis dataKey="algorithm" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_distance" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <StatusPanel title="No comparison data" message="Run Compare Algorithms to populate the chart." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Exception Lists</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {routes.flatMap((route) => route.demand_sequence.filter((item) => item.delayed)).length === 0 && (
              <StatusPanel title="No delayed demand records" message="Delayed and unserved demand records will appear here after a constrained run." />
            )}
            {routes.flatMap((route) => route.demand_sequence.filter((item) => item.delayed)).map((item, index) => (
              <div key={`delay-${item.demand_id}-${index}`} className="rounded-[8px] border border-amber-200 bg-amber-50 p-3">
                Demand {item.demand_id} delayed at {item.arrival_time_min} min
              </div>
            ))}
            {metrics.filter((metric) => metric.metric_name === "unserved_demands").map((metric) => (
              <div key={metric.id} className="rounded-[8px] border border-red-200 bg-red-50 p-3">
                Unserved count: {metric.metric_value}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {[
          ["Average Response Time", "average_response_time", "#f59e0b"],
          ["Completion Rate", "completion_rate", "#2563eb"],
          ["Priority Completion Rate", "priority_completion_rate", "#dc2626"],
          ["Runtime", "algorithm_runtime_ms", "#7c3aed"]
        ].map(([title, dataKey, color]) => (
          <Card key={dataKey}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <p className="mt-1 text-sm text-muted">{metricExplanation[dataKey] ?? "Metric comparison across algorithms."}</p>
            </CardHeader>
            <CardContent className="h-72">
              {chartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="4 4" />
                    <XAxis dataKey="algorithm" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey={dataKey} fill={color} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <StatusPanel title="No comparison data" message="Run Compare Algorithms to populate this chart." />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Weighted Score Ranking</CardTitle>
            <p className="mt-1 text-sm text-muted">{comparison?.summary?.weighted_score_model.formula ?? "Run a comparison to compute weighted scores."}</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted">
                <tr>
                  <th className="py-2">Rank</th>
                  <th className="py-2">Algorithm</th>
                  <th className="py-2">Score</th>
                  <th className="py-2">Completion</th>
                  <th className="py-2">Priority</th>
                  <th className="py-2">Response</th>
                  <th className="py-2">Distance</th>
                  <th className="py-2">Runtime</th>
                </tr>
              </thead>
              <tbody>
                {(comparison?.summary?.ranking ?? []).map((item, index) => (
                  <tr key={`${item.algorithm}-${item.dispatch_plan_id}`} className="border-b border-border/70">
                    <td className="py-2 font-bold">#{index + 1}</td>
                    <td className="py-2">{item.algorithm}</td>
                    <td className="py-2 font-bold text-accent">{item.score}</td>
                    <td className="py-2">{item.normalized_scores.completion_rate}</td>
                    <td className="py-2">{item.normalized_scores.priority_completion_rate}</td>
                    <td className="py-2">{item.normalized_scores.normalized_response_time_score}</td>
                    <td className="py-2">{item.normalized_scores.normalized_distance_score}</td>
                    <td className="py-2">{item.normalized_scores.normalized_runtime_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Score Model</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p>{comparison?.summary?.weighted_score_model.normalization ?? "Lower distance, response time, and runtime are normalized against the compared algorithms."}</p>
            {Object.entries(comparison?.summary?.weighted_score_model.weights ?? {}).map(([name, value]) => (
              <div key={name} className="flex items-center justify-between rounded-[8px] border border-border p-3">
                <span>{name}</span>
                <b className="text-foreground">{value}</b>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl px-5 py-8"><StatusPanel title="Loading results" message="Preparing route and metric dashboards." /></main>}>
      <ResultsPageContent />
    </Suspense>
  );
}
