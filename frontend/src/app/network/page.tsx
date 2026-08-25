"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPanel } from "@/components/ui/status";
import { getNetwork, listScenarios } from "@/lib/api";
import { NetworkMap } from "@/features/dashboard/NetworkMap";
import type { Network, Scenario } from "@/types/api";

function NetworkPageContent() {
  const params = useSearchParams();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioId, setScenarioId] = useState<number | null>(Number(params.get("scenarioId")) || null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listScenarios()
      .then((items) => {
        setScenarios(items);
        if (!scenarioId && items[0]) setScenarioId(items[0].id);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load scenarios"));
  }, []);

  useEffect(() => {
    if (!scenarioId) return;
    setNetwork(null);
    getNetwork(scenarioId)
      .then((data) => {
        setNetwork(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load network"));
  }, [scenarioId]);

  const selected = useMemo(() => scenarios.find((scenario) => scenario.id === scenarioId), [scenarioId, scenarios]);

  // Compute NE-SETU specific summary stats
  const nesetuStats = useMemo(() => {
    if (!network) return null;
    const blockedEdges = network.edges.filter((e) => e.is_blocked).length;
    const congestedEdges = network.edges.filter((e) => e.congestion_factor > 1.0).length;
    const gravelEdges = network.edges.filter((e) => e.surface_type === "gravel").length;
    const bridgeLimitedEdges = network.edges.filter((e) => e.bridge_tonnage_limit !== null).length;
    const highRiskEdges = network.edges.filter((e) => e.base_landslide_risk > 0.4 || e.base_flood_risk > 0.3).length;
    const fourByFourVehicles = network.vehicles.filter((v) => v.is_4x4).length;
    const accessVehicles = network.vehicles.filter((v) => v.accessibility_equipped).length;
    const personDemands = network.demands.filter((d) => d.cargo_type === "person").length;
    return { blockedEdges, congestedEdges, gravelEdges, bridgeLimitedEdges, highRiskEdges, fourByFourVehicles, accessVehicles, personDemands };
  }, [network]);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-accent">NE-SETU Corridor Network</p>
          <h1 className="mt-2 text-3xl font-black">{selected?.name ?? "Northeast India Road Network"}</h1>
        </div>
        <select
          value={scenarioId ?? ""}
          onChange={(event) => setScenarioId(Number(event.target.value))}
          className="h-10 rounded-[6px] border border-border bg-panel px-3"
        >
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
          ))}
        </select>
      </div>
      {error && <StatusPanel className="mt-6" title="Network data unavailable" message={error} variant="error" />}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_310px]">
        <Card>
          <CardContent className="p-3">
            {network ? <NetworkMap network={network} /> : <StatusPanel title="Loading network" message="Fetching NE-SETU corridor nodes, edges, vehicles, depots, and demands." />}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Road State Legend</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="mr-2 inline-block h-1 w-8 bg-green-500" /> Open (paved)</p>
              <p><span className="mr-2 inline-block h-1 w-8 bg-amber-500" /> Suspected / Congested</p>
              <p><span className="mr-2 inline-block h-1 w-8 border-t-4 border-dashed border-red-600" /> Blocked (landslide/flood)</p>
              <p><span className="mr-2 inline-block h-1 w-8 bg-slate-400" /> Gravel (4x4 only)</p>
              <p><span className="mr-2 inline-block h-1 w-8 bg-blue-400" /> Mixed surface</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Demand Priority</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="mr-2 inline-block h-3 w-3 rounded-full bg-red-600" /> Priority 5 (Critical)</p>
              <p><span className="mr-2 inline-block h-3 w-3 rounded-full bg-amber-500" /> Priority 4 (High)</p>
              <p><span className="mr-2 inline-block h-3 w-3 rounded-full bg-teal-600" /> Priority 3 (Medium)</p>
              <p><span className="mr-2 inline-block h-3 w-3 rounded-full bg-slate-400" /> Priority 2 (Low)</p>
            </CardContent>
          </Card>
          {nesetuStats && (
            <Card>
              <CardHeader><CardTitle>NE-SETU Network Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>🚧 <strong>{nesetuStats.blockedEdges}</strong> blocked edges</p>
                <p>⚠️ <strong>{nesetuStats.congestedEdges}</strong> congested edges</p>
                <p>🪨 <strong>{nesetuStats.gravelEdges}</strong> gravel roads (4x4 only)</p>
                <p>🌉 <strong>{nesetuStats.bridgeLimitedEdges}</strong> bridge weight-limited</p>
                <p>🏔️ <strong>{nesetuStats.highRiskEdges}</strong> high-risk (landslide/flood)</p>
                <p>🚙 <strong>{nesetuStats.fourByFourVehicles}</strong> 4x4 vehicles</p>
                <p>♿ <strong>{nesetuStats.accessVehicles}</strong> accessibility-equipped</p>
                <p>🧑 <strong>{nesetuStats.personDemands}</strong> person-as-cargo demands</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

export default function NetworkPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl px-5 py-8"><StatusPanel title="Loading network" message="Preparing NE-SETU corridor visualization." /></main>}>
      <NetworkPageContent />
    </Suspense>
  );
}
