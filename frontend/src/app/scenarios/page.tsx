"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Database, Plus, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createScenario, listScenarios, seedScenario } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Scenario } from "@/types/api";

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const setSelectedScenarioId = useAppStore((state) => state.setSelectedScenarioId);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listScenarios();
      setScenarios(data);
      if (data[0]) setSelectedScenarioId(data[0].id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scenarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createScenario({
      name: String(form.get("name")),
      description: String(form.get("description")),
      scenario_type: "custom"
    });
    event.currentTarget.reset();
    await load();
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-accent">Scenario Management</p>
          <h1 className="mt-2 text-3xl font-black">Benchmark Scenarios</h1>
          <p className="mt-2 max-w-2xl text-muted">Seeded civil emergency logistics scenarios for routing, dispatch, and algorithm comparison.</p>
        </div>
        <Button onClick={load} variant="secondary">
          <RotateCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && <div className="mt-6 rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 md:grid-cols-2">
          {loading ? (
            <Card><CardContent>Loading scenarios...</CardContent></Card>
          ) : (
            scenarios.map((scenario) => (
              <Card key={scenario.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-accent" /> {scenario.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="min-h-12 text-sm leading-6 text-muted">{scenario.description}</p>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
                    <div><b>{scenario.node_count}</b><span className="block text-xs text-muted">Nodes</span></div>
                    <div><b>{scenario.edge_count}</b><span className="block text-xs text-muted">Edges</span></div>
                    <div><b>{scenario.vehicle_count}</b><span className="block text-xs text-muted">Vehicles</span></div>
                    <div><b>{scenario.demand_count}</b><span className="block text-xs text-muted">Demands</span></div>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-3">
                    <div className="rounded-[8px] border border-border p-2">
                      <b className="block text-foreground">{scenario.congested_edge_count ?? 0}</b>
                      Congested edges
                    </div>
                    <div className="rounded-[8px] border border-border p-2">
                      <b className="block text-foreground">{scenario.blocked_edge_count ?? 0}</b>
                      Blocked edges
                    </div>
                    <div className="rounded-[8px] border border-border p-2">
                      <b className="block text-foreground">{Object.entries(scenario.priority_distribution ?? {}).map(([p, c]) => `P${p}:${c}`).join(" ") || "None"}</b>
                      Priority mix
                    </div>
                  </div>
                  <p className="mt-3 rounded-[8px] bg-stone-50 p-3 text-xs leading-5 text-muted">
                    {scenario.expected_challenge ?? "Custom experiment scenario."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/network?scenarioId=${scenario.id}`}>Open Network</Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/simulation?scenarioId=${scenario.id}`}>Run</Link>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => seedScenario(scenario.id).then(load)}>
                      Seed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-accent" /> Create Scenario</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onCreate}>
              <input name="name" required minLength={3} placeholder="Scenario name" className="h-10 w-full rounded-[6px] border border-border px-3" />
              <textarea name="description" placeholder="Description" className="min-h-28 w-full rounded-[6px] border border-border px-3 py-2" />
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
