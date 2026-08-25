import { z } from "zod";
import { approveRoutePlan, getRoutePlanByKey, recordOperatorAction, saveRoutePlan, searchRoutePlans } from "../db";
import { DirectionsResult, makeRequest } from "../_core/map";
import { publicProcedure, router } from "../_core/trpc";

export type AssamPlace = { id: string; name: string; district: string; lat: number; lng: number };

export const ASSAM_PLACES: AssamPlace[] = [
  { id: "guwahati", name: "Guwahati", district: "Kamrup Metropolitan", lat: 26.1445, lng: 91.7362 },
  { id: "dispur", name: "Dispur", district: "Kamrup Metropolitan", lat: 26.1433, lng: 91.7898 },
  { id: "amingaon", name: "Amingaon", district: "Kamrup", lat: 26.2006, lng: 91.6847 },
  { id: "rangia", name: "Rangia", district: "Kamrup", lat: 26.4707, lng: 91.0306 },
  { id: "nalbari", name: "Nalbari", district: "Nalbari", lat: 26.4446, lng: 91.4411 },
  { id: "barpeta", name: "Barpeta", district: "Barpeta", lat: 26.3212, lng: 91.0067 },
  { id: "bongaigaon", name: "Bongaigaon", district: "Bongaigaon", lat: 26.4770, lng: 90.5582 },
  { id: "kokrajhar", name: "Kokrajhar", district: "Kokrajhar", lat: 26.4014, lng: 90.2667 },
  { id: "dhubri", name: "Dhubri", district: "Dhubri", lat: 26.0207, lng: 89.9743 },
  { id: "goalpara", name: "Goalpara", district: "Goalpara", lat: 26.1642, lng: 90.6180 },
  { id: "mangaldoi", name: "Mangaldoi", district: "Darrang", lat: 26.4420, lng: 92.0305 },
  { id: "tezpur", name: "Tezpur", district: "Sonitpur", lat: 26.6528, lng: 92.7926 },
  { id: "nagaon", name: "Nagaon", district: "Nagaon", lat: 26.3480, lng: 92.6840 },
  { id: "morigaon", name: "Morigaon", district: "Morigaon", lat: 26.2521, lng: 92.3403 },
  { id: "hojai", name: "Hojai", district: "Hojai", lat: 26.0025, lng: 92.8563 },
  { id: "lumding", name: "Lumding", district: "Hojai", lat: 25.7490, lng: 93.1710 },
  { id: "diphu", name: "Diphu", district: "Karbi Anglong", lat: 25.8437, lng: 93.4314 },
  { id: "haflong", name: "Haflong", district: "Dima Hasao", lat: 25.1648, lng: 93.0176 },
  { id: "golaghat", name: "Golaghat", district: "Golaghat", lat: 26.5130, lng: 93.9586 },
  { id: "bokakhat", name: "Bokakhat", district: "Golaghat", lat: 26.6408, lng: 93.6002 },
  { id: "jorhat", name: "Jorhat", district: "Jorhat", lat: 26.7509, lng: 94.2037 },
  { id: "sivasagar", name: "Sivasagar", district: "Sivasagar", lat: 26.9833, lng: 94.6333 },
  { id: "sonari", name: "Sonari", district: "Charaideo", lat: 27.0734, lng: 95.0272 },
  { id: "dibrugarh", name: "Dibrugarh", district: "Dibrugarh", lat: 27.4728, lng: 94.9120 },
  { id: "tinsukia", name: "Tinsukia", district: "Tinsukia", lat: 27.4891, lng: 95.3596 },
  { id: "margherita", name: "Margherita", district: "Tinsukia", lat: 27.2831, lng: 95.6751 },
  { id: "north_lakhimpur", name: "North Lakhimpur", district: "Lakhimpur", lat: 27.2352, lng: 94.1026 },
  { id: "dhemaji", name: "Dhemaji", district: "Dhemaji", lat: 27.4817, lng: 94.5856 },
  { id: "majuli", name: "Garamur, Majuli", district: "Majuli", lat: 26.9460, lng: 94.1726 },
  { id: "silchar", name: "Silchar", district: "Cachar", lat: 24.8333, lng: 92.7789 },
  { id: "badarpur", name: "Badarpur", district: "Karimganj", lat: 24.8684, lng: 92.5930 },
  { id: "karimganj", name: "Karimganj", district: "Karimganj", lat: 24.8690, lng: 92.3554 },
  { id: "hailakandi", name: "Hailakandi", district: "Hailakandi", lat: 24.6839, lng: 92.5602 },
];

function toRadians(value: number) { return (value * Math.PI) / 180; }

export function haversineMeters(origin: AssamPlace, destination: AssamPlace) {
  const earthRadius = 6_371_000;
  const latDelta = toRadians(destination.lat - origin.lat);
  const lngDelta = toRadians(destination.lng - origin.lng);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(toRadians(origin.lat)) * Math.cos(toRadians(destination.lat)) * Math.sin(lngDelta / 2) ** 2;
  return Math.round(earthRadius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
}

export function buildFallbackRoute(origin: AssamPlace, destination: AssamPlace) {
  const aerialMeters = haversineMeters(origin, destination);
  const distanceMeters = Math.round(aerialMeters * 1.27);
  const durationSeconds = Math.round((distanceMeters / 1000 / 38) * 3600);
  const midpoint = { lat: (origin.lat + destination.lat) / 2 + 0.12, lng: (origin.lng + destination.lng) / 2 - 0.08 };
  return {
    distanceMeters,
    durationSeconds,
    routeSummary: "Offline-safe Assam corridor estimate",
    sourceMode: "offline_fallback",
    points: [{ lat: origin.lat, lng: origin.lng }, midpoint, { lat: destination.lat, lng: destination.lng }],
  };
}

async function makeRoutePlan(origin: AssamPlace, destination: AssamPlace) {
  try {
    const response = await makeRequest<DirectionsResult>("/maps/api/directions/json", {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode: "driving",
      alternatives: true,
      region: "in",
    });
    const route = response.routes?.[0];
    const leg = route?.legs?.[0];
    if (!route || !leg || response.status !== "OK") throw new Error("No usable driving route returned");
    return {
      distanceMeters: leg.distance.value,
      durationSeconds: leg.duration.value,
      routeSummary: route.summary || "Google Maps driving route",
      sourceMode: "live_directions",
      encodedPolyline: route.overview_polyline?.points ?? "",
      points: [leg.start_location, leg.end_location],
    };
  } catch (error) {
    console.warn("[Operations] Live directions unavailable; using deterministic fallback", error);
    return buildFallbackRoute(origin, destination);
  }
}

const placeInput = z.object({ originId: z.string().min(1), destinationId: z.string().min(1) });

const searchableModules = [
  { id: "overview", title: "Overview dashboard", subtitle: "Live network and operator status", route: "/", type: "Module" },
  { id: "routes", title: "Route planner", subtitle: "Assam driving distance and approval workflow", route: "/routes", type: "Module" },
  { id: "terrain", title: "Terrain grid", subtitle: "Accessibility and terrain intelligence", route: "/terrain", type: "Module" },
  { id: "simulator", title: "Scenario lab", subtitle: "Rainfall, closure, demand, and vehicle-impact simulation", route: "/simulator", type: "Module" },
  { id: "emergency", title: "Emergency desk", subtitle: "Critical response acknowledgement and route context", route: "/emergency", type: "Module" },
  { id: "provenance", title: "Data provenance", subtitle: "Route, terrain, and fallback data lineage", route: "/provenance", type: "Module" },
];

const searchableIncidents = [
  { id: "e-204", title: "Emergency E-204", subtitle: "Medical supplies request in Silchar", route: "/emergency", type: "Incident" },
  { id: "sh-5", title: "SH-5 access review", subtitle: "Heavy-vehicle restriction near Rangia", route: "/terrain", type: "Incident" },
];

export function searchOperationsCatalog(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const places = ASSAM_PLACES.map(place => ({ id: place.id, title: place.name, subtitle: `${place.district} district`, route: "/routes", type: "Place" }));
  return [...searchableModules, ...searchableIncidents, ...places]
    .filter(item => `${item.title} ${item.subtitle} ${item.type}`.toLowerCase().includes(normalized))
    .slice(0, 8);
}

export const operationsRouter = router({
  places: publicProcedure.query(() => ASSAM_PLACES),
  search: publicProcedure.input(z.object({ query: z.string().max(80) })).query(async ({ input }) => {
    const catalogMatches = searchOperationsCatalog(input.query);
    const planMatches = await searchRoutePlans(input.query);
    const planResults = planMatches.map(plan => ({
      id: plan.planKey,
      title: `Route plan ${plan.planKey}`,
      subtitle: `${plan.originId} → ${plan.destinationId} · ${plan.routeSummary}`,
      route: `/routes?plan=${encodeURIComponent(plan.planKey)}`,
      type: "Plan",
    }));
    return [...planResults, ...catalogMatches].slice(0, 8);
  }),
  getRoutePlan: publicProcedure.input(z.object({ planKey: z.string().min(1).max(96) })).query(({ input }) => getRoutePlanByKey(input.planKey)),
  dashboard: publicProcedure.query(() => ({ activeVehicles: 12, pendingDeliveries: 8, emergencies: 2, accessibility: 86.4, systemStatus: "nominal" as const })),
  planRoute: publicProcedure.input(placeInput).mutation(async ({ input }) => {
    const origin = ASSAM_PLACES.find(place => place.id === input.originId);
    const destination = ASSAM_PLACES.find(place => place.id === input.destinationId);
    if (!origin || !destination) throw new Error("Select a valid Assam source and destination.");
    if (origin.id === destination.id) throw new Error("Source and destination must be different places.");
    const route = await makeRoutePlan(origin, destination);
    const planKey = `NR-${Date.now().toString(36).toUpperCase()}`;
    const persisted = await saveRoutePlan({ planKey, originId: origin.id, destinationId: destination.id, ...route });
    await recordOperatorAction({ planKey, actionType: "route_calculated", detail: `${origin.name} to ${destination.name}; ${route.sourceMode}` });
    return { planKey, origin, destination, persisted, status: "proposed" as const, ...route };
  }),
  approveRoute: publicProcedure.input(z.object({ planKey: z.string().min(1) })).mutation(async ({ input }) => {
    const persisted = await approveRoutePlan(input.planKey);
    await recordOperatorAction({ planKey: input.planKey, actionType: "route_approved", detail: "Operator approved route plan" });
    return { planKey: input.planKey, status: "approved" as const, persisted, approvedAt: Date.now() };
  }),
  simulate: publicProcedure.input(z.object({
    rainfallMm: z.number().min(0).max(250),
    closure: z.boolean(),
    demandPercent: z.number().min(0).max(100),
    vehicleBreakdown: z.enum(["none", "V-003", "V-008", "V-011"]),
  })).mutation(async ({ input }) => {
    const vehiclePenalty = input.vehicleBreakdown === "none" ? 0 : input.vehicleBreakdown === "V-003" ? 8 : 5;
    const accessibility = Math.max(25, Math.round(88 - input.rainfallMm * 0.14 - (input.closure ? 14 : 0) - vehiclePenalty));
    const affectedRoutes = Math.max(1, Math.round(input.rainfallMm / 22) + (input.closure ? 5 : 0) + Math.round(input.demandPercent / 18));
    const replanMinutes = Math.max(4, Math.round(6 + input.rainfallMm / 18 + (input.closure ? 8 : 0) + vehiclePenalty));
    const demandImpact = Math.round(input.demandPercent * 0.72 + (input.closure ? 18 : 0));
    const emergencyRisk = accessibility < 60 || input.demandPercent > 55 ? "high" : accessibility < 76 ? "moderate" : "low";
    await recordOperatorAction({ actionType: "scenario_run", detail: `Rainfall ${input.rainfallMm}mm, closure ${input.closure}, demand ${input.demandPercent}%, vehicle ${input.vehicleBreakdown}` });
    return { accessibility, affectedRoutes, replanMinutes, demandImpact, emergencyRisk, simulatedAt: Date.now() };
  }),
  acknowledgeEmergency: publicProcedure.input(z.object({ incidentId: z.string().min(1) })).mutation(async ({ input }) => {
    await recordOperatorAction({ actionType: "emergency_acknowledged", detail: `Incident ${input.incidentId} acknowledged` });
    return { incidentId: input.incidentId, status: "acknowledged" as const, acknowledgedAt: Date.now() };
  }),
});
