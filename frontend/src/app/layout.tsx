import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Boxes, Map, Navigation, PlayCircle, ScrollText, LineChart, ShieldAlert, GitBranch, BookOpen, Smartphone, ShieldCheck } from "lucide-react";

import "./globals.css";

export const metadata: Metadata = {
  title: "NE-SETU — AI Adaptive Logistics for Difficult Terrain",
  description: "AI-Powered Adaptive Logistics & Accessibility Intelligence Platform for Northeast India's difficult terrain corridors."
};

const navItems = [
  { href: "/scenarios", label: "Scenarios", icon: Boxes },
  { href: "/network", label: "Network", icon: Map },
  { href: "/simulation", label: "Simulation", icon: PlayCircle },
  { href: "/what-if", label: "What-If", icon: GitBranch },
  { href: "/results", label: "Results", icon: Activity },
  { href: "/routing", label: "Routing", icon: Navigation },
  { href: "/disruptions", label: "Disruptions", icon: ShieldAlert },
  { href: "/decision-log", label: "Decision Log", icon: BookOpen },
  { href: "/provenance", label: "Provenance", icon: ShieldCheck },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/citizen-report", label: "Citizen Report", icon: Smartphone },
  { href: "/report", label: "Report", icon: ScrollText }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-40 border-b border-border bg-panel/92 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
            <Link href="/" className="flex items-center gap-3 font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-teal-700 text-white">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <span>NE-SETU</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm font-semibold text-muted hover:bg-stone-100 hover:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
