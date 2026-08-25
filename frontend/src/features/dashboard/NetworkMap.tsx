"use client";

import dynamic from "next/dynamic";
import type { Network, Route } from "@/types/api";

type Props = {
  network: Network;
  routes?: Route[];
};

// Dynamically import the map component with SSR disabled because Leaflet uses the window object
const MapComponent = dynamic(() => import("./DynamicMap"), {
  ssr: false,
  loading: () => <div className="flex h-[520px] items-center justify-center text-sm text-muted">Loading map...</div>,
});

export function NetworkMap({ network, routes = [] }: Props) {
  return <MapComponent network={network} routes={routes} />;
}


