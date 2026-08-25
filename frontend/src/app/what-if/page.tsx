"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GitBranch, ShieldAlert, ArrowRight, Activity, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPanel } from "@/components/ui/status";
import { getNetwork, submitRoadConditionReport, runSimulation, getMetrics, forkScenario } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Network, Metric, Scenario } from "@/types/api";

function WhatIfPageContent() {
  const params = useSearchParams();
  const storedScenarioId = useAppStore((state) => state.selectedScenarioId);
  const scenarioId = Number(params.get("scenarioId")) || storedScenarioId;
  const storedRunId = useAppStore((state) => state.lastRunId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fork state
  const [forkedScenario, setForkedScenario] = useState<Scenario | null>(null);
  const [forkedNetwork, setForkedNetwork] = useState<Network | null>(null);
  
  // Replan state
  const [replanRunId, setReplanRunId] = useState<number | null>(null);
  const [baselineMetrics, setBaselineMetrics] = useState<Metric[]>([]);
  const [replanMetrics, setReplanMetrics] = useState<Metric[]>([]);
  
  useEffect(() => {
    if (!storedRunId) return;
    getMetrics(storedRunId).then(setBaselineMetrics).catch(console.error);
  }, [storedRunId]);

  const handleFork = async () => {
    if (!scenarioId) return;
    setLoading(true);
    setError(null);
    try {
      const newScenario = await forkScenario(scenarioId);
      setForkedScenario(newScenario);
      const network = await getNetwork(newScenario.id);
      setForkedNetwork(network);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fork scenario");
    } finally {
      setLoading(false);
    }
  };

  const handleInjectCounterfactual = async () => {
    if (!forkedScenario || !forkedNetwork) return;
    
    // Find an edge to block (e.g., a long edge or one with a bridge)
    const unblockedEdges = forkedNetwork.edges.filter(e => !e.is_blocked);
    if (unblockedEdges.length === 0) {
      setError("No unblocked edges available in forked scenario.");
      return;
    }
    
    // Pick the longest edge to simulate a major bridge/highway failure
    const edge = unblockedEdges.reduce((prev, current) => (prev.distance_km > current.distance_km) ? prev : current);
    
    setLoading(true);
    setError(null);
    setReplanRunId(null);
    
    try {
      // 1. Ingest Event into FORKED scenario
      await submitRoadConditionReport(forkedScenario.id, {
        edge_id: edge.id,
        status: "CLOSED",
        source_type: "sensor",
        severity: 5,
        description: "Hypothetical bridge collapse simulation."
      });
      
      // Update local network state
      setForkedNetwork(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          edges: prev.edges.map(e => e.id === edge.id ? { ...e, is_blocked: true } : e)
        };
      });

      // 2. Trigger Replanning Cascade on FORKED scenario
      const newRun = await runSimulation(forkedScenario.id, "priority", "minimize_total_distance", {});
      setReplanRunId(newRun.id);
      
      // 3. Fetch Impact
      const newMetrics = await getMetrics(newRun.id);
      setReplanMetrics(newMetrics);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to inject counterfactual");
    } finally {
      setLoading(false);
    }
  };

  // Helper to safely get metric values
  const getMetricValue = (metrics: Metric[], name: string) => {
    return metrics.find(m => m.metric_name === name)?.metric_value ?? 0;
  };

  if (!scenarioId) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8">
        <Card><CardContent className="p-6">No baseline scenario selected. Please load a scenario first.</CardContent></Card>
      </main>
    );
  }

  const baseUnserved = getMetricValue(baselineMetrics, "unserved_demands");
  const replanUnserved = getMetricValue(replanMetrics, "unserved_demands");
  const unservedDiff = replanUnserved - baseUnserved;

  const baseDistance = getMetricValue(baselineMetrics, "total_distance");
  const replanDistance = getMetricValue(replanMetrics, "total_distance");
  const distanceDiff = replanDistance - baseDistance;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-accent">Counterfactual Testing</p>
          <h1 className="mt-2 text-3xl font-black">What-If Simulator (F16)</h1>
          <p className="mt-2 text-muted max-w-2xl">
            Fork the current state to run destructive testing and interactive scenario planning without 
            affecting active fleet operations.
          </p>
        </div>
      </div>

      {error && <StatusPanel title="Error" message={error} variant="error" />}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sandbox Controls */}
        <Card className="flex flex-col h-full border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-accent" />
              Sandbox Environment
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            {!forkedScenario ? (
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  Create a detached snapshot of the current network state, active fleet assignments, and undelivered demands.
                </p>
                <Button onClick={handleFork} disabled={loading} className="w-full h-12">
                  <GitBranch className="mr-2 h-4 w-4" />
                  Fork Current Scenario
                </Button>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in">
                <div className="rounded-[8px] border bg-accent/10 p-4 border-accent/20">
                  <p className="text-sm font-bold text-accent">Active Sandbox: {forkedScenario.name}</p>
                  <p className="text-xs text-muted mt-1">Changes here will not affect live operations.</p>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-bold">Inject Counterfactuals</h3>
                  <Button onClick={handleInjectCounterfactual} disabled={loading} variant="danger" className="w-full h-10">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Simulate Major Bridge Failure
                  </Button>
                  <p className="text-xs text-muted">
                    This will block the most critical edge in the forked network and automatically trigger the CP-SAT engine to reroute the fleet.
                  </p>
                </div>
              </div>
            )}
            
            {loading && (
              <div className="flex justify-center py-4">
                <StatusPanel title="Processing" message="Executing operation..." />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Counterfactual Impact */}
        <Card className="flex flex-col h-full bg-stone-50/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Counterfactual Impact Diff
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center space-y-6">
            {!replanRunId && !loading && (
              <div className="flex flex-1 items-center justify-center text-sm text-muted text-center border border-dashed rounded-[8px] bg-white">
                Awaiting counterfactual simulation...<br/>Run a test in the sandbox to see the comparative impact here.
              </div>
            )}

            {replanRunId && !loading && (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                <div className="rounded-[8px] border border-border bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-accent mb-6">Proposed Plan Diff (Sandbox Run #{replanRunId})</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-4">
                      <span className="text-sm font-medium">Unserved Demands</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted">{baseUnserved}</span>
                        <ArrowRight className="h-4 w-4 text-muted" />
                        <span className={`font-bold text-lg ${unservedDiff > 0 ? 'text-red-600' : 'text-foreground'}`}>
                          {replanUnserved} 
                          {unservedDiff > 0 && ` (+${unservedDiff})`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-sm font-medium">Total Fleet Distance</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted">{baseDistance.toFixed(1)} km</span>
                        <ArrowRight className="h-4 w-4 text-muted" />
                        <span className="font-bold text-lg">
                          {replanDistance.toFixed(1)} km 
                          {distanceDiff > 0 && <span className="text-amber-600 ml-2 text-sm">(+{distanceDiff.toFixed(1)} km)</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[8px] bg-blue-50 border border-blue-200 p-4">
                  <p className="text-sm text-blue-900 font-medium">
                    This demonstrates system resilience. By identifying choke points ahead of time, we can pre-position assets using the Demand Forecast (F26).
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function WhatIfPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl px-5 py-8"><StatusPanel title="Loading" message="Preparing Sandbox..." /></main>}>
      <WhatIfPageContent />
    </Suspense>
  );
}
