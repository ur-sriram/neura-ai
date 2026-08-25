"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Activity, Users, Radio, AlertTriangle, CheckCircle, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPanel } from "@/components/ui/status";
import { getConditionReports } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { ConditionReportRead } from "@/types/api";

export default function ProvenancePage() {
  const scenarioId = useAppStore((state) => state.selectedScenarioId);
  const [reports, setReports] = useState<ConditionReportRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scenarioId) return;
    setLoading(true);
    getConditionReports(scenarioId)
      .then(setReports)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scenarioId]);

  if (!scenarioId) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8">
        <Card><CardContent className="p-6">No scenario selected. Please select a scenario in the Scenarios tab.</CardContent></Card>
      </main>
    );
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "sensor": return <Radio className="h-4 w-4 text-emerald-500" />;
      case "operator": return <Activity className="h-4 w-4 text-indigo-500" />;
      case "community": return <Users className="h-4 w-4 text-amber-500" />;
      default: return <ShieldCheck className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CLOSED": return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> IMPASSABLE</span>;
      case "SUSPECTED": return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> PARTIAL BLOCKAGE</span>;
      case "OPEN": return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><CheckCircle className="h-3 w-3" /> OPEN</span>;
      default: return null;
    }
  };

  const formatScore = (score: number) => `${Math.round(score * 100)}%`;

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-accent">LNS Integrity</p>
          <h1 className="mt-2 text-3xl font-black">Data Provenance (F19)</h1>
          <p className="mt-2 text-muted max-w-2xl">
            Audit log of all incoming reports that influence the Living Network State. 
            Demonstrates source tracking and dynamic trust score weighting.
          </p>
        </div>
      </div>

      {error && <StatusPanel title="Error" message={error} variant="error" />}
      {loading && <StatusPanel title="Loading" message="Fetching network intelligence logs..." />}

      {!loading && !error && reports.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="bg-stone-50 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Intelligence Ingestion Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {reports.map((report) => (
                <div key={report.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-colors hover:bg-stone-50/50">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-bold bg-stone-100 px-2 py-1 rounded border">
                        Edge #{report.edge_id}
                      </span>
                      {getStatusBadge(report.status)}
                      {report.severity > 0 && report.status !== "OPEN" && (
                        <span className="text-xs font-bold text-muted-foreground border px-2 py-0.5 rounded">
                          Severity: {report.severity}/5
                        </span>
                      )}
                    </div>
                    {report.description && (
                      <p className="text-sm text-stone-700 italic border-l-2 border-stone-200 pl-3">
                        &quot;{report.description}&quot;
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(report.reported_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex md:flex-col items-center md:items-end gap-3 md:min-w-[180px] bg-stone-50 p-3 rounded border">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(report.source_type)}
                      <span className="text-sm font-bold uppercase tracking-wider">{report.source_type}</span>
                    </div>
                    <div className="flex flex-col items-center md:items-end w-full">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Trust Score</span>
                      <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${report.trust_score >= 0.9 ? 'bg-emerald-500' : report.trust_score >= 0.6 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                          style={{ width: formatScore(report.trust_score) }}
                        />
                      </div>
                      <span className="text-sm font-black mt-1">{formatScore(report.trust_score)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && reports.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No reports found for this scenario. Submit a report from the Citizen Report tab to see it appear here.</CardContent></Card>
      )}
    </main>
  );
}
