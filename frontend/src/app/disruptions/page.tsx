"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPanel } from "@/components/ui/status";
import { getNetwork, submitRoadConditionReport, runSimulation, getMetrics } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Network, Metric } from "@/types/api";

type EventLog = {
  id: string;
  time: string;
  edgeId: number;
  status: string;
  description: string;
};

function DisruptionsPageContent() {
  const params = useSearchParams();
  const storedScenarioId = useAppStore((state) => state.selectedScenarioId);
  const scenarioId = Number(params.get("scenarioId")) || storedScenarioId;
  const storedRunId = useAppStore((state) => state.lastRunId);

  const [network, setNetwork] = useState<Network | null>(null);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Replan state
  const [replanRunId, setReplanRunId] = useState<number | null>(null);
  const [baselineMetrics, setBaselineMetrics] = useState<Metric[]>([]);
  const [replanMetrics, setReplanMetrics] = useState<Metric[]>([]);
  
  const setLastRunId = useAppStore((state) => state.setLastRunId);

  useEffect(() => {
    if (!scenarioId) return;
    getNetwork(scenarioId)
      .then(setNetwork)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load network"));
  }, [scenarioId]);

  useEffect(() => {
    if (!storedRunId) return;
    getMetrics(storedRunId).then(setBaselineMetrics).catch(console.error);
  }, [storedRunId]);

  const handleInjectLandslide = async () => {
    if (!scenarioId || !network) return;
    
    // Find an edge that isn't already blocked to make the demo dynamic
    const unblockedEdges = network.edges.filter(e => !e.is_blocked);
    if (unblockedEdges.length === 0) {
      setError("No unblocked edges available to simulate a landslide.");
      return;
    }
    
    // Pick a random edge (or could be deterministic)
    const edge = unblockedEdges[Math.floor(Math.random() * unblockedEdges.length)];
    
    setLoading(true);
    setError(null);
    setReplanRunId(null);
    
    try {
      // 1. Ingest Event
      await submitRoadConditionReport(scenarioId, {
        edge_id: edge.id,
        status: "CLOSED",
        source_type: "sensor",
        severity: 5,
        description: "Catastrophic slope failure detected via satellite."
      });
      
      const newEvent: EventLog = {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString(),
        edgeId: edge.id,
        status: "CLOSED",
        description: `Landslide blocked edge #${edge.id} (between Node ${edge.source_node_id} and Node ${edge.target_node_id})`
      };
      
      setEvents(prev => [newEvent, ...prev]);
      
      // Update local network state so we don't pick it again
      setNetwork(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          edges: prev.edges.map(e => e.id === edge.id ? { ...e, is_blocked: true } : e)
        };
      });

      // 2. Trigger Replanning Cascade
      const newRun = await runSimulation(scenarioId, "priority", "minimize_total_distance", {});
      setReplanRunId(newRun.id);
      
      // 3. Fetch Impact
      const newMetrics = await getMetrics(newRun.id);
      setReplanMetrics(newMetrics);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to inject landslide");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (!replanRunId) return;
    setLastRunId(replanRunId);
    setReplanRunId(null);
    setEvents(prev => [
      {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString(),
        edgeId: 0,
        status: "RESOLVED",
        description: `New Dispatch Plan #${replanRunId} approved. Drivers notified.`
      },
      ...prev
    ]);
  };

  // Helper to safely get metric values
  const getMetricValue = (metrics: Metric[], name: string) => {
    return metrics.find(m => m.metric_name === name)?.metric_value ?? 0;
  };

  if (!scenarioId) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8">
        <Card><CardContent className="p-6">No scenario selected. Please load a scenario first.</CardContent></Card>
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
          <p className="text-sm font-bold uppercase text-accent">Control Room</p>
          <h1 className="mt-2 text-3xl font-black">Disruption Console (F22)</h1>
          <p className="mt-2 text-muted max-w-2xl">
            Live event stream and autonomous replanning gate. When hazards trigger road closures, 
            the system automatically computes the impact and proposes a new fleet assignment for your approval.
          </p>
        </div>
        <Button onClick={handleInjectLandslide} disabled={loading || !network} className="bg-red-600 hover:bg-red-700 text-white">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Inject Demo Landslide
        </Button>
      </div>

      {error && <StatusPanel title="Error" message={error} variant="error" />}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event Stream */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-accent" />
              Live Event Stream
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {events.length === 0 ? (
              <div className="flex h-40 items-center justify-center rounded-[8px] border border-dashed border-border bg-stone-50 text-sm text-muted">
                No recent disruptions. Network is operating normally.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map(event => (
                  <div key={event.id} className={`flex flex-col gap-1 rounded-[8px] border p-3 ${event.status === 'CLOSED' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={event.status === 'CLOSED' ? 'text-red-700' : 'text-green-700'}>{event.status}</span>
                      <span className="text-muted">{event.time}</span>
                    </div>
                    <p className="text-sm text-foreground">{event.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Impact & Approval Panel */}
        <Card className="flex flex-col h-full border-accent bg-stone-50/50 shadow-sm">
          <CardHeader>
            <CardTitle>Replanning Impact & Approval</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-6">
            {!replanRunId && !loading && (
              <div className="flex flex-1 items-center justify-center text-sm text-muted text-center">
                Awaiting disruption...<br/>When a closure occurs, the optimized replan impact will appear here.
              </div>
            )}

            {loading && (
              <div className="flex flex-1 items-center justify-center">
                <StatusPanel title="Computing Replan" message="Evaluating cascade across all vehicles..." />
              </div>
            )}

            {replanRunId && !loading && (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                <div className="rounded-[8px] border border-border bg-white p-4">
                  <h3 className="text-sm font-bold text-accent mb-4">Proposed Plan Diff (Run #{replanRunId})</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm font-medium">Unserved Demands</span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted">{baseUnserved}</span>
                        <ArrowRight className="h-4 w-4 text-muted" />
                        <span className={`font-bold ${unservedDiff > 0 ? 'text-red-600' : 'text-foreground'}`}>
                          {replanUnserved} 
                          {unservedDiff > 0 && ` (+${unservedDiff})`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-sm font-medium">Total Distance</span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted">{baseDistance.toFixed(1)} km</span>
                        <ArrowRight className="h-4 w-4 text-muted" />
                        <span className="font-bold">
                          {replanDistance.toFixed(1)} km 
                          {distanceDiff > 0 && <span className="text-amber-600 ml-1">(+{distanceDiff.toFixed(1)} km)</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[8px] bg-blue-50 border border-blue-200 p-4">
                  <p className="text-sm text-blue-900 font-medium">
                    The optimizer has found a new feasible assignment routing around the blockage.
                  </p>
                </div>

                <Button onClick={handleApprove} className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold text-lg">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Approve & Dispatch Reroute
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function DisruptionsPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl px-5 py-8"><StatusPanel title="Loading" message="Preparing Disruption Console..." /></main>}>
      <DisruptionsPageContent />
    </Suspense>
  );
}
