"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle, Info, Sparkles, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPanel } from "@/components/ui/status";
import { getRoutes } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Route } from "@/types/api";

function XAIExplanation({ route }: { route: Route }) {
  const [prose, setProse] = useState<string | null>(null);
  const [loadingProse, setLoadingProse] = useState(false);

  const generateProse = () => {
    setLoadingProse(true);
    // Simulate LLM delay
    setTimeout(() => {
      if (!route.decision_rationale) {
        setProse("No detailed rationale available for this route.");
        setLoadingProse(false);
        return;
      }
      
      const { evaluated_demands, rejected_reasons, selection_factors } = route.decision_rationale;
      
      let explanation = `Vehicle ${route.vehicle_id} was assigned this route evaluating ${evaluated_demands} demands. `;
      
      if (selection_factors && selection_factors.length > 0) {
        explanation += "The assignment was primarily driven by: " + selection_factors[0].split('(')[0].trim() + ". ";
      }
      
      if (rejected_reasons && rejected_reasons.length > 0) {
        explanation += `Alternative assignments were considered but rejected. For example, ${rejected_reasons[0].toLowerCase()}`;
      }
      
      setProse(explanation);
      setLoadingProse(false);
    }, 800);
  };

  return (
    <div className="space-y-4">
      {route.decision_rationale ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Deterministic Factors */}
          <div className="space-y-2 border-r pr-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase">Selection Factors</h4>
            <ul className="text-sm space-y-1">
              {route.decision_rationale.selection_factors?.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{factor}</span>
                </li>
              ))}
              {(!route.decision_rationale.selection_factors || route.decision_rationale.selection_factors.length === 0) && (
                <span className="text-muted-foreground text-xs italic">None recorded.</span>
              )}
            </ul>
          </div>
          
          {/* Rejections */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase">Alternatives Rejected</h4>
            <ul className="text-sm space-y-1">
              {route.decision_rationale.rejected_reasons?.slice(0, 3).map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
              {route.decision_rationale.rejected_reasons && route.decision_rationale.rejected_reasons.length > 3 && (
                <span className="text-muted-foreground text-xs italic">
                  ...and {route.decision_rationale.rejected_reasons.length - 3} more rejections.
                </span>
              )}
              {(!route.decision_rationale.rejected_reasons || route.decision_rationale.rejected_reasons.length === 0) && (
                <span className="text-muted-foreground text-xs italic">No alternatives rejected.</span>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-stone-50 p-3 rounded-[8px]">
          <Info className="h-4 w-4" />
          Structured decision rationale was not recorded for this legacy route.
        </div>
      )}

      {/* LLM Prose Fallback */}
      <div className="pt-4 border-t mt-4 flex flex-col items-start gap-3">
        {!prose && !loadingProse && (
          <Button variant="secondary" size="sm" onClick={generateProse} className="text-xs">
            <Sparkles className="mr-2 h-3 w-3 text-indigo-500" />
            Generate NL Summary
          </Button>
        )}
        
        {loadingProse && <div className="text-sm text-muted-foreground animate-pulse">Consulting XAI model...</div>}
        
        {prose && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-[8px] p-4 text-sm text-indigo-900 leading-relaxed shadow-sm">
            <div className="flex items-center gap-2 mb-2 font-bold text-indigo-700 text-xs">
              <Sparkles className="h-3 w-3" />
              AI EXPLANATION
            </div>
            {prose}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DecisionLogPage() {
  const lastRunId = useAppStore((state) => state.lastRunId);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lastRunId) return;
    setLoading(true);
    getRoutes(lastRunId)
      .then((data) => setRoutes(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load routes"))
      .finally(() => setLoading(false));
  }, [lastRunId]);

  if (!lastRunId) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8">
        <Card><CardContent className="p-6">No simulation run active. Please run a simulation first.</CardContent></Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-accent">Explainable AI</p>
          <h1 className="mt-2 text-3xl font-black">Decision Records (F17)</h1>
          <p className="mt-2 text-muted max-w-2xl">
            Fully auditable provenance and rationale for every vehicle assignment. 
            The system records rejected alternatives alongside chosen paths.
          </p>
        </div>
      </div>

      {error && <StatusPanel title="Error" message={error} variant="error" />}
      {loading && <StatusPanel title="Loading" message="Fetching decision records..." />}

      {!loading && !error && routes.length > 0 && (
        <div className="space-y-6">
          {routes.map((route, i) => (
            <Card key={route.id} className="overflow-hidden border shadow-sm">
              <CardHeader className="bg-stone-50 border-b py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-accent" />
                    Vehicle {route.vehicle_id} Dispatch Log
                  </div>
                  <span className="text-xs font-normal text-muted-foreground">
                    Demands Served: {route.demand_sequence.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <XAIExplanation route={route} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && routes.length === 0 && (
        <Card><CardContent className="p-6">No routes found for the current run.</CardContent></Card>
      )}
    </main>
  );
}
