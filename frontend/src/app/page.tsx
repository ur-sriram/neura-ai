import Link from "next/link";
import { ArrowRight, Mountain, Route, Shield, Accessibility, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const featureCards: Array<{ title: string; body: string; Icon: LucideIcon }> = [
    { title: "Terrain-Aware Routing", body: "Two-stage routing: hard constraint filtering + multi-criteria risk-weighted cost optimization.", Icon: Mountain },
    { title: "Living Network State", body: "Real-time road condition reports mutate network state. Landslides, floods, bridge limits — all live.", Icon: Route },
    { title: "Accessibility ≠ Distance", body: "Best feasible route ≠ shortest route. Risk, surface, weather, and bridge capacity all factor in.", Icon: Shield },
    { title: "Assisted Mobility", body: "Person-as-cargo demands flow through the same optimizer, requiring accessibility-equipped vehicles.", Icon: Accessibility }
  ];

  return (
    <main>
      <section className="relative min-h-[calc(100vh-65px)] overflow-hidden border-b border-border">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 680" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="road" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity="0.46" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          {/* NH-6 corridor representation */}
          <path d="M60 520 C260 400 300 180 540 250 S830 510 1140 160" fill="none" stroke="url(#road)" strokeWidth="18" />
          {/* Back roads */}
          <path d="M120 180 C330 230 470 420 700 360 S920 210 1120 420" fill="none" stroke="#1f2937" strokeOpacity="0.16" strokeWidth="10" />
          {/* Location markers: Guwahati, Nongpoh, Shillong, Jowai, Cherrapunji, Dawki */}
          {[
            { x: 140, y: 420, r: 14, color: "#0f766e", label: "Guwahati" },
            { x: 380, y: 290, r: 10, color: "#0f766e", label: "Nongpoh" },
            { x: 540, y: 250, r: 16, color: "#0f766e", label: "Shillong" },
            { x: 730, y: 360, r: 12, color: "#0f766e", label: "Jowai" },
            { x: 910, y: 220, r: 10, color: "#dc2626", label: "Cherrapunji" },
            { x: 1060, y: 420, r: 10, color: "#f59e0b", label: "Dawki" },
          ].map((loc) => (
            <g key={loc.label}>
              <circle cx={loc.x} cy={loc.y} r={loc.r} fill={loc.color} opacity="0.9" />
              <text x={loc.x} y={loc.y - loc.r - 6} textAnchor="middle" fill="#374151" fontSize="11" fontWeight="600">{loc.label}</text>
            </g>
          ))}
        </svg>
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="max-w-3xl">
            <Badge className="border-accent/30 bg-teal-50 text-accent">SIH26002 — AI Smart Logistics Platform</Badge>
            <h1 className="mt-6 text-4xl font-black leading-tight text-foreground md:text-6xl">
              NE-SETU: AI-Powered Adaptive Logistics for Difficult Terrain
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              A full-stack platform for Northeast India&apos;s challenging corridors: terrain-aware routing, real-time hazard ingestion,
              two-stage constraint optimization, and accessibility-first emergency logistics.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/simulation">
                  Run Demo <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/network">Inspect Network</Link>
              </Button>
            </div>
          </div>
          <div className="grid content-end gap-3 sm:grid-cols-2 lg:pb-8">
            {featureCards.map(({ title, body, Icon }) => (
              <div key={title} className="rounded-[8px] border border-border bg-panel/90 p-5 shadow-command">
                <Icon className="h-6 w-6 text-accent" />
                <h2 className="mt-4 text-base font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
