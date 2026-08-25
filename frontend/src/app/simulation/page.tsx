"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, GitCompareArrows } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPanel } from "@/components/ui/status";
import { compareAlgorithms, listScenarios, runSimulation } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Scenario } from "@/types/api";

const algorithms = [
  { value: "greedy", label: "Greedy Dispatch" },
  { value: "priority", label: "Priority Dispatch" },
  { value: "dijkstra", label: "Dijkstra-based" },
  { value: "astar", label: "A*" },
  { value: "ortools_cvrp", label: "OR-Tools CVRP" }
];

const objectives = [
  "minimize_total_distance",
  "minimize_total_response_time",
  "maximize_priority_completion",
  "weighted_multi_objective"
];

function SimulationPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioId, setScenarioId] = useState<number | null>(Number(params.get("scenarioId")) || null);
  const [algorithm, setAlgorithm] = useState("greedy");
  const [objective, setObjective] = useState("minimize_total_distance");
  const [vehicleCount, setVehicleCount] = useState(3);
  const [demandScale, setDemandScale] = useState(1);
  const [congestionRatio, setCongestionRatio] = useState(0);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const setLastRunId = useAppStore((state) => state.setLastRunId);

  useEffect(() => {
    listScenarios()
      .then((items) => {
        setScenarios(items);
        if (!scenarioId && items[0]) setScenarioId(items[0].id);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load scenarios"));
  }, []);

  const run = async () => {
    if (!scenarioId) return;
    setStatus("running");
    setError(null);
    try {
      const result = await runSimulation(scenarioId, algorithm, objective, {
        weight_distance: 0.55,
        weight_response_time: 0.3,
        weight_priority: 0.15,
        vehicle_count: vehicleCount,
        demand_scale: demandScale,
        congestion_ratio: congestionRatio
      });
      setLastRunId(result.id);
      setStatus("completed");
      router.push(`/results?runId=${result.id}&scenarioId=${scenarioId}`);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Simulation failed");
    }
  };

  const compare = async () => {
    if (!scenarioId) return;
    setStatus("comparing");
    setError(null);
    try {
      const result = await compareAlgorithms(
        scenarioId,
        ["greedy", "priority", "dijkstra", "astar", "ortools_cvrp"],
        "weighted_multi_objective",
        {
          vehicle_count: vehicleCount,
          demand_scale: demandScale,
          congestion_ratio: congestionRatio
        }
      );
      setLastRunId(result.id);
      setStatus("completed");
      router.push(`/results?runId=${result.id}&scenarioId=${scenarioId}`);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Algorithm comparison failed");
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <p className="text-sm font-bold uppercase text-accent">Simulation Control</p>
      <h1 className="mt-2 text-3xl font-black">Run Dispatch Experiment</h1>
      {error && <StatusPanel className="mt-6" title="Simulation request failed" message={error} variant="error" />}
      <div className="mt-6 grid gap-5 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader><CardTitle>Experiment Setup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="block text-sm font-semibold">
              Scenario
              <select value={scenarioId ?? ""} onChange={(event) => setScenarioId(Number(event.target.value))} className="mt-2 h-10 w-full rounded-[6px] border border-border bg-panel px-3">
                {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Algorithm
              <select value={algorithm} onChange={(event) => setAlgorithm(event.target.value)} className="mt-2 h-10 w-full rounded-[6px] border border-border bg-panel px-3">
                {algorithms.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Objective
              <select value={objective} onChange={(event) => setObjective(event.target.value)} className="mt-2 h-10 w-full rounded-[6px] border border-border bg-panel px-3">
                {objectives.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-[8px] border border-border p-3"><b>0.55</b><span className="block text-xs text-muted">Distance</span></div>
              <div className="rounded-[8px] border border-border p-3"><b>0.30</b><span className="block text-xs text-muted">Response</span></div>
              <div className="rounded-[8px] border border-border p-3"><b>0.15</b><span className="block text-xs text-muted">Priority</span></div>
            </div>
            <label className="block text-sm font-semibold">
              Vehicles: {vehicleCount}
              <input type="range" min="1" max="5" value={vehicleCount} onChange={(event) => setVehicleCount(Number(event.target.value))} className="mt-2 w-full" />
            </label>
            <label className="block text-sm font-semibold">
              Demand Scale: {demandScale.toFixed(1)}x
              <input type="range" min="0.5" max="1.8" step="0.1" value={demandScale} onChange={(event) => setDemandScale(Number(event.target.value))} className="mt-2 w-full" />
            </label>
            <label className="block text-sm font-semibold">
              Extra Congestion: {Math.round(congestionRatio * 100)}%
              <input type="range" min="0" max="0.6" step="0.1" value={congestionRatio} onChange={(event) => setCongestionRatio(Number(event.target.value))} className="mt-2 w-full" />
            </label>
            <Button onClick={run} disabled={!scenarioId || status === "running" || status === "comparing"} className="w-full">
              <Play className="h-4 w-4" /> Run Simulation
            </Button>
            <Button onClick={compare} disabled={!scenarioId || status === "running" || status === "comparing"} variant="secondary" className="w-full">
              <GitCompareArrows className="h-4 w-4" /> Compare Algorithms
            </Button>
          </CardContent>
        </Card>
        <section className="rounded-[8px] border border-border bg-panel p-6 shadow-command">
          <h2 className="text-xl font-black">Execution State</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {["Scenario loaded", "Algorithm configured", status].map((item, index) => (
              <div key={item} className="rounded-[8px] border border-border bg-stone-50 p-4">
                <span className="text-xs font-bold uppercase text-muted">Step {index + 1}</span>
                <p className="mt-2 text-lg font-bold">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 h-3 rounded-[6px] bg-stone-200">
            <div className="h-3 rounded-[6px] bg-accent transition-all" style={{ width: status === "idle" ? "34%" : status === "completed" ? "100%" : "72%" }} />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl px-5 py-8"><StatusPanel title="Loading simulation controls" message="Preparing scenario and algorithm controls." /></main>}>
      <SimulationPageContent />
    </Suspense>
  );
}
