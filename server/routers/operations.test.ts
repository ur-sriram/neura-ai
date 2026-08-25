import { describe, expect, it } from "vitest";
import { ASSAM_PLACES, buildFallbackRoute, haversineMeters, searchOperationsCatalog } from "./operations";

describe("NEURA AI Assam route engine", () => {
  it("returns a non-zero deterministic distance between Guwahati and Dibrugarh", () => {
    const guwahati = ASSAM_PLACES.find(place => place.id === "guwahati")!;
    const dibrugarh = ASSAM_PLACES.find(place => place.id === "dibrugarh")!;
    expect(haversineMeters(guwahati, dibrugarh)).toBeGreaterThan(300_000);
  });

  it("builds a conservative offline-safe route when live directions are unavailable", () => {
    const origin = ASSAM_PLACES.find(place => place.id === "silchar")!;
    const destination = ASSAM_PLACES.find(place => place.id === "tezpur")!;
    const route = buildFallbackRoute(origin, destination);
    expect(route.sourceMode).toBe("offline_fallback");
    expect(route.durationSeconds).toBeGreaterThan(0);
    expect(route.points).toHaveLength(3);
  });

  it("finds Assam places and operational modules through global search", () => {
    expect(searchOperationsCatalog("Silchar").some(item => item.type === "Place")).toBe(true);
    expect(searchOperationsCatalog("scenario").some(item => item.route === "/simulator")).toBe(true);
  });
});
