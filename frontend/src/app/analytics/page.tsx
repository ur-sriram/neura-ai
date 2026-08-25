"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPanel } from "@/components/ui/status";
import { getModelPerformance } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { ModelPerformanceMetrics } from "@/types/api";

function AnalyticsPageContent() {
  const params = useSearchParams();
  const storedScenarioId = useAppStore((state) => state.selectedScenarioId);
  const scenarioId = Number(params.get("scenarioId")) || storedScenarioId;

  const [metrics, setMetrics] = useState<ModelPerformanceMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scenarioId) return;
    getModelPerformance(scenarioId)
      .then((data) => {
        setMetrics(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load model performance"));
  }, [scenarioId]);

  if (!scenarioId) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <span>No scenario selected.</span>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 space-y-6">
      <div>
        <p className="text-sm font-bold uppercase text-accent">Monitoring & Prediction</p>
        <h1 className="mt-2 text-3xl font-black">Model Performance Dashboard (F30)</h1>
        <p className="mt-2 text-muted max-w-3xl">
          Live tracking of AI prediction accuracy versus realized outcomes. This panel tracks the health of the 
          underlying models driving the routing and pre-positioning decisions.
        </p>
      </div>

      {error && <StatusPanel title="Data Unavailable" message={error} variant="error" />}

      {metrics && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid gap-5 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted">ETA Mean Absolute Error</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.eta_mae} min</div>
                <p className="text-xs text-muted mt-1">Lower is better</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted">Closure Precision</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{(metrics.closure_precision * 100).toFixed(1)}%</div>
                <p className="text-xs text-muted mt-1">Hit rate of predicted closures</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted">Closure Recall</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{(metrics.closure_recall * 100).toFixed(1)}%</div>
                <p className="text-xs text-muted mt-1">% of actual closures predicted</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted">Closure F1 Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.closure_f1}</div>
                <p className="text-xs text-muted mt-1">Harmonic mean</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* ETA Calibration Chart */}
            <Card>
              <CardHeader>
                <CardTitle>ETA Calibration Tracking</CardTitle>
                <p className="text-sm text-muted">Predicted travel times versus actual consumption</p>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.eta_calibration_series} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#0f766e" name="Actual ETA" strokeWidth={2} />
                    <Line type="monotone" dataKey="predicted" stroke="#f59e0b" name="Predicted ETA" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Closure Accuracy Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Hazard Model Health</CardTitle>
                <p className="text-sm text-muted">Precision and Recall of road closure predictions over time</p>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={metrics.closure_accuracy_series} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 1]} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                    <Tooltip formatter={(val: number) => `${(val * 100).toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="f1_score" fill="#e2e8f0" name="F1 Score Base" />
                    <Line type="monotone" dataKey="precision" stroke="#2563eb" name="Precision" strokeWidth={2} />
                    <Line type="monotone" dataKey="recall" stroke="#dc2626" name="Recall" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-7xl px-5 py-8">
        <StatusPanel title="Loading" message="Preparing model performance metrics..." />
      </main>
    }>
      <AnalyticsPageContent />
    </Suspense>
  );
}
