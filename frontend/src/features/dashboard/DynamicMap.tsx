"use client";

import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { Demand, Network, Route } from "@/types/api";

// Fix for default leaflet icons not showing in Next.js
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";

type Props = {
  network: Network;
  routes?: Route[];
};

function priorityColor(priority: number) {
  if (priority >= 5) return "#dc2626"; // red
  if (priority >= 4) return "#f59e0b"; // amber
  if (priority >= 3) return "#0f766e"; // teal
  return "#64748b"; // slate
}

const ROUTE_COLORS = ["#0f766e", "#2563eb", "#d97706", "#7c3aed"];

export default function DynamicMap({ network, routes = [] }: Props) {
  if (!network.nodes.length) {
    return <div className="flex h-[520px] items-center justify-center text-sm text-muted">No network data</div>;
  }

  const minLat = Math.min(...network.nodes.map((node) => node.latitude));
  const maxLat = Math.max(...network.nodes.map((node) => node.latitude));
  const minLon = Math.min(...network.nodes.map((node) => node.longitude));
  const maxLon = Math.max(...network.nodes.map((node) => node.longitude));

  const bounds: [[number, number], [number, number]] = [
    [minLat - 0.05, minLon - 0.05],
    [maxLat + 0.05, maxLon + 0.05],
  ];

  const demandByNode = new Map<number, Demand>(network.demands.map((demand) => [demand.node_id, demand]));
  const depotNodes = new Set(network.depots.map((depot) => depot.node_id));
  const vehicleNodes = new Set(network.vehicles.map((vehicle) => vehicle.current_node_id));
  const nodeById = new Map(network.nodes.map((node) => [node.id, node]));

  return (
    <MapContainer
      bounds={bounds}
      className="h-[520px] w-full rounded-[8px] border border-border z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {network.edges.map((edge) => {
        const source = nodeById.get(edge.source_node_id);
        const target = nodeById.get(edge.target_node_id);
        if (!source || !target) return null;

        const congested = edge.congestion_factor > 1.4;
        let color = "#94a3b8"; // normal
        if (edge.is_blocked) color = "#dc2626";
        else if (congested) color = "#f59e0b";
        else if (edge.surface_type === "gravel") color = "#94a3b8";
        else if (edge.surface_type === "mixed") color = "#60a5fa"; // blue-400

        return (
          <Polyline
            key={edge.id}
            positions={[[source.latitude, source.longitude], [target.latitude, target.longitude]]}
            color={color}
            weight={edge.is_blocked ? 6 : congested ? 4 : 3}
            dashArray={edge.is_blocked ? "8 8" : undefined}
            opacity={edge.is_blocked ? 0.9 : 0.7}
          >
            <Tooltip>
              Edge {edge.source_node_id} to {edge.target_node_id} <br />
              {edge.distance_km} km | Congestion: {edge.congestion_factor}
            </Tooltip>
          </Polyline>
        );
      })}

      {routes.flatMap((route, routeIndex) =>
        route.node_path.slice(0, -1).map((nodeId, index) => {
          const source = nodeById.get(nodeId);
          const target = nodeById.get(route.node_path[index + 1]);
          if (!source || !target) return null;

          return (
            <Polyline
              key={`${route.id}-${index}`}
              positions={[[source.latitude, source.longitude], [target.latitude, target.longitude]]}
              color={ROUTE_COLORS[routeIndex % ROUTE_COLORS.length]}
              weight={5}
              opacity={0.8}
            />
          );
        })
      )}

      {network.nodes.map((node) => {
        const demand = demandByNode.get(node.id);
        const isDepot = depotNodes.has(node.id);
        const hasVehicle = vehicleNodes.has(node.id);

        const radius = isDepot ? 8 : demand ? 6 : 4;
        const fill = isDepot ? "#111827" : demand ? priorityColor(demand.priority) : "#475569";

        return (
          <CircleMarker
            key={node.id}
            center={[node.latitude, node.longitude]}
            radius={radius}
            fillColor={fill}
            fillOpacity={1}
            color="#fff"
            weight={2}
          >
            <Tooltip>
              {node.name} <br />
              {demand ? `Demand: ${demand.quantity} | Priority: ${demand.priority}` : ""}
              {isDepot ? " (Depot)" : ""}
              {hasVehicle ? " (Vehicle Start)" : ""}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
