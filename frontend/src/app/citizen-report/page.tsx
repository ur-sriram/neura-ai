"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, MapPin, Radio, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPanel } from "@/components/ui/status";
import { getNetwork, submitRoadConditionReport } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Network, RoadConditionReport } from "@/types/api";

export default function CitizenReportPage() {
  const scenarioId = useAppStore((state) => state.selectedScenarioId);
  const [network, setNetwork] = useState<Network | null>(null);
  const [loadingNetwork, setLoadingNetwork] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [edgeId, setEdgeId] = useState<number | "">("");
  const [status, setStatus] = useState<RoadConditionReport["status"]>("SUSPECTED");
  const [severity, setSeverity] = useState<number>(3);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!scenarioId) return;
    setLoadingNetwork(true);
    getNetwork(scenarioId)
      .then(setNetwork)
      .catch(err => setError(err.message))
      .finally(() => setLoadingNetwork(false));
  }, [scenarioId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioId || edgeId === "") return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await submitRoadConditionReport(scenarioId, {
        edge_id: Number(edgeId),
        status,
        severity,
        description,
        source_type: "community",
      });
      setSuccess(true);
      // Reset form
      setEdgeId("");
      setStatus("SUSPECTED");
      setSeverity(3);
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (!scenarioId) {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <Card><CardContent className="p-6 text-center text-muted-foreground">The system is currently offline or no region is selected.</CardContent></Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <div className="text-center mb-8">
        <div className="mx-auto bg-rose-100 text-rose-600 w-16 h-16 flex items-center justify-center rounded-full mb-4">
          <Radio className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black">Community Road Report</h1>
        <p className="text-muted text-sm mt-2">
          Help emergency services by reporting live road conditions, blockages, or landslides.
        </p>
      </div>

      {error && <div className="mb-6"><StatusPanel title="Submission Failed" message={error} variant="error" /></div>}
      
      {success && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500 mb-4" />
            <h3 className="font-bold text-emerald-900 text-lg">Report Received</h3>
            <p className="text-emerald-700 text-sm mt-2">
              Your report has been securely transmitted to the District Disaster Management Authority. Thank you for keeping the community safe.
            </p>
            <Button variant="secondary" className="mt-6" onClick={() => setSuccess(false)}>Submit Another Report</Button>
          </CardContent>
        </Card>
      )}

      {!success && (
        <Card className="shadow-lg border-t-4 border-t-rose-500">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Location */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Select Road Segment
                </label>
                <select 
                  className="w-full p-3 bg-stone-50 border rounded-md text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  value={edgeId}
                  onChange={(e) => setEdgeId(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                  disabled={loadingNetwork}
                >
                  <option value="" disabled>-- Select a location --</option>
                  {network?.edges.map(edge => (
                    <option key={edge.id} value={edge.id}>
                      Road Segment #{edge.id} (between Node {edge.source_node_id} and Node {edge.target_node_id})
                    </option>
                  ))}
                </select>
                {loadingNetwork && <p className="text-xs text-muted-foreground animate-pulse">Loading active road network...</p>}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Condition Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button"
                    onClick={() => setStatus("OPEN")}
                    className={`p-3 rounded-md text-xs font-bold border transition-colors ${status === 'OPEN' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white text-muted-foreground hover:bg-stone-50'}`}
                  >
                    Clear / Open
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStatus("SUSPECTED")}
                    className={`p-3 rounded-md text-xs font-bold border transition-colors ${status === 'SUSPECTED' ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white text-muted-foreground hover:bg-stone-50'}`}
                  >
                    Partial Blockage
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStatus("CLOSED")}
                    className={`p-3 rounded-md text-xs font-bold border transition-colors ${status === 'CLOSED' ? 'bg-rose-100 border-rose-500 text-rose-800' : 'bg-white text-muted-foreground hover:bg-stone-50'}`}
                  >
                    Impassable
                  </button>
                </div>
              </div>

              {/* Severity */}
              {status !== "OPEN" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold">Severity Estimate</label>
                    <span className="text-xs font-bold bg-stone-100 px-2 py-1 rounded text-muted-foreground">{severity} / 5</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={severity}
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="w-full accent-rose-500" 
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minor debris</span>
                    <span>Complete washout</span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-bold">Details & Description (Optional)</label>
                <textarea 
                  className="w-full p-3 bg-stone-50 border rounded-md text-sm focus:ring-2 focus:ring-rose-500 outline-none min-h-[100px]"
                  placeholder="E.g. Large tree fallen across both lanes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={submitting || edgeId === ""} className="w-full h-12 text-base font-bold bg-rose-600 hover:bg-rose-700 text-white">
                {submitting ? "Transmitting..." : "Submit Emergency Report"}
              </Button>
              
              <div className="flex items-start gap-2 bg-rose-50/50 p-3 rounded-md text-rose-800/70 text-xs border border-rose-100">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p>False reports are punishable under the Disaster Management Act. Only submit verified, on-the-ground observations.</p>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
