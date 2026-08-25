"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPanel } from "@/components/ui/status";
import { getNetwork, listScenarios, getPointToPointRoute } from "@/lib/api";
import { NetworkMap } from "@/features/dashboard/NetworkMap";
import type { Network, Scenario, PointToPointResponse, Route } from "@/types/api";

function RoutingPageContent() {
  const params = useSearchParams();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioId, setScenarioId] = useState<number | null>(Number(params.get("scenarioId")) || null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sourceNodeId, setSourceNodeId] = useState<number | "">("");
  const [targetNodeId, setTargetNodeId] = useState<number | "">("");
  const [vehicleWeightTons, setVehicleWeightTons] = useState<number>(2.0);
  const [is4x4, setIs4x4] = useState<boolean>(false);
  const [objective, setObjective] = useState<string>("travel_time_min");

  const [routeResult, setRouteResult] = useState<PointToPointResponse | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    listScenarios()
      .then((items) => {
        setScenarios(items);
        if (!scenarioId && items[0]) setScenarioId(items[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load scenarios"));
  }, []);

  useEffect(() => {
    if (!scenarioId) return;
    setNetwork(null);
    setRouteResult(null);
    getNetwork(scenarioId)
      .then((data) => {
        setNetwork(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load network"));
  }, [scenarioId]);

  const handleCalculate = async () => {
    if (!scenarioId || sourceNodeId === "" || targetNodeId === "") return;
    setCalculating(true);
    setRouteResult(null);
    setError(null);
    try {
      const result = await getPointToPointRoute(scenarioId, {
        source_node_id: Number(sourceNodeId),
        target_node_id: Number(targetNodeId),
        vehicle_weight_tons: vehicleWeightTons,
        is_4x4: is4x4,
        objective,
      });
      setRouteResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate route");
    } finally {
      setCalculating(false);
    }
  };

  const selected = useMemo(() => scenarios.find((scenario) => scenario.id === scenarioId), [scenarioId, scenarios]);

  const displayRoutes: Route[] = useMemo(() => {
    if (!routeResult || routeResult.path_nodes.length === 0) return [];
    return [{
      id: 1,
      dispatch_plan_id: 1,
      vehicle_id: 1,
      sequence_index: 0,
      node_path: routeResult.path_nodes,
      demand_sequence: [],
      distance_km: routeResult.distance_km,
      travel_time_min: routeResult.travel_time_min,
      load_units: 0,
    }];
  }, [routeResult]);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-accent">NE-SETU Corridor Routing</p>
          <h1 className="mt-2 text-3xl font-black">{selected?.name ?? "Point-to-Point Planner"}</h1>
        </div>
        <select
          value={scenarioId ?? ""}
          onChange={(event) => {
            setScenarioId(Number(event.target.value));
            setSourceNodeId("");
            setTargetNodeId("");
          }}
          className="h-10 rounded-[6px] border border-border bg-panel px-3"
        >
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
          ))}
        </select>
      </div>

      {error && <StatusPanel className="mt-6" title="Error" message={error} variant="error" />}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_310px]">
        <Card>
          <CardContent className="p-3">
            {network ? (
              <NetworkMap network={network} routes={displayRoutes} />
            ) : (
              <StatusPanel title="Loading network" message="Fetching NE-SETU corridor details." />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Route Constraints</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm flex flex-col">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-muted-foreground">Source Node</label>
                <select
                  className="h-9 rounded-[6px] border border-border bg-panel px-3"
                  value={sourceNodeId}
                  onChange={(e) => setSourceNodeId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Select source...</option>
                  {network?.nodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-muted-foreground">Target Node</label>
                <select
                  className="h-9 rounded-[6px] border border-border bg-panel px-3"
                  value={targetNodeId}
                  onChange={(e) => setTargetNodeId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Select target...</option>
                  {network?.nodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-muted-foreground">Vehicle Weight (tons)</label>
                <input
                  type="number"
                  step="0.5"
                  className="h-9 rounded-[6px] border border-border bg-panel px-3"
                  value={vehicleWeightTons}
                  onChange={(e) => setVehicleWeightTons(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="is4x4"
                  checked={is4x4}
                  onChange={(e) => setIs4x4(e.target.checked)}
                  className="rounded border-gray-300 h-4 w-4 text-teal-600 focus:ring-teal-600"
                />
                <label htmlFor="is4x4" className="font-semibold text-muted-foreground">Is 4x4 Capable?</label>
              </div>

              <div className="flex flex-col gap-1 mt-2">
                <label className="font-semibold text-muted-foreground">Objective</label>
                <select
                  className="h-9 rounded-[6px] border border-border bg-panel px-3"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                >
                  <option value="travel_time_min">Minimize Travel Time</option>
                  <option value="distance_km">Minimize Distance</option>
                  <option value="nesetu_cost">Minimize NE-SETU Cost</option>
                </select>
              </div>

              <button
                className="mt-4 w-full h-10 rounded-[6px] bg-teal-700 font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-50"
                onClick={handleCalculate}
                disabled={calculating || sourceNodeId === "" || targetNodeId === ""}
              >
                {calculating ? "Calculating..." : "Find Route"}
              </button>
            </CardContent>
          </Card>

          {routeResult && (
            <Card>
              <CardHeader><CardTitle>Route Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {routeResult.unreachable ? (
                  <p className="text-red-500 font-semibold">{routeResult.message}</p>
                ) : (
                  <>
                    <p className="text-green-600 font-semibold">{routeResult.message}</p>
                    <p>📏 <strong>{routeResult.distance_km.toFixed(2)}</strong> km</p>
                    <p>⏱️ <strong>{routeResult.travel_time_min.toFixed(2)}</strong> mins</p>
                    <p>⚠️ <strong>Risk Score:</strong> {routeResult.risk_score.toFixed(2)}</p>
                    <p>🎯 <strong>Objective Value:</strong> {routeResult.objective_value.toFixed(2)}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <strong>Path Nodes:</strong> {routeResult.path_nodes.join(" ➔ ")}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

export default function RoutingPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl px-5 py-8"><StatusPanel title="Loading planner" message="Preparing NE-SETU point-to-point planner." /></main>}>
      <RoutingPageContent />
    </Suspense>
  );
}
