/**
 * CesiumMap — 3D terrain visualization for Assam using CesiumJS + ESRI imagery.
 * No API key required for basic usage (EllipsoidTerrainProvider + ESRI tiles).
 */

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

const CESIUM_VER = "1.117";
const CESIUM_BASE = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VER}/Build/Cesium`;

const ASSAM_HUBS = [
  { name: "Guwahati",   detail: "14 active dispatches · network normal", lat: 26.1445, lng: 91.7362, hex: "#168263" },
  { name: "Tezpur",     detail: "Weather watch · 42 mm / 24 h",           lat: 26.6528, lng: 92.7926, hex: "#b97820" },
  { name: "Dibrugarh",  detail: "3 pending deliveries · capacity OK",      lat: 27.4728, lng: 94.9120, hex: "#168263" },
  { name: "Silchar",    detail: "Emergency E-204 · acknowledged",           lat: 24.8333, lng: 92.7789, hex: "#bf3e4a" },
];

function ensureCesiumCSS() {
  if (document.getElementById("cesium-css")) return;
  const link = document.createElement("link");
  link.id = "cesium-css";
  link.rel = "stylesheet";
  link.href = `${CESIUM_BASE}/Widgets/widgets.css`;
  document.head.appendChild(link);
}

function loadCesiumJS(): Promise<any> {
  if ((window as any).Cesium) return Promise.resolve((window as any).Cesium);
  // Must set base URL before loading Cesium
  (window as any).CESIUM_BASE_URL = `${CESIUM_BASE}/`;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${CESIUM_BASE}/Cesium.js`;
    s.onload = () => resolve((window as any).Cesium);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function makeHubCanvas(hex: string): string {
  const c = document.createElement("canvas");
  c.width = 28; c.height = 28;
  const ctx = c.getContext("2d")!;
  ctx.beginPath();
  ctx.arc(14, 14, 11, 0, Math.PI * 2);
  ctx.fillStyle = hex;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Pulse ring
  ctx.beginPath();
  ctx.arc(14, 14, 13, 0, Math.PI * 2);
  ctx.strokeStyle = hex + "88";
  ctx.lineWidth = 1;
  ctx.stroke();
  return c.toDataURL();
}

interface CesiumMapProps {
  className?: string;
}

export function CesiumMap({ className }: CesiumMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const init = usePersistFn(async () => {
    if (viewerRef.current || !container.current) return;
    try {
      ensureCesiumCSS();
      const Cesium = await loadCesiumJS();
      setLoading(false);

      const viewer = new Cesium.Viewer(container.current, {
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        imageryProvider: new Cesium.UrlTemplateImageryProvider({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          credit: "Esri World Imagery",
        }),
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: true,
        sceneModePicker: true,
        navigationHelpButton: false,
        fullscreenButton: true,
        infoBox: true,
        selectionIndicator: false,
        creditContainer: document.createElement("div"), // hide credit bar
      });

      viewerRef.current = viewer;

      // Style the viewer
      viewer.scene.globe.enableLighting = true;
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#0d0d1a");

      // ── Hub markers ──
      ASSAM_HUBS.forEach(hub => {
        const img = makeHubCanvas(hub.hex);
        viewer.entities.add({
          name: hub.name,
          position: Cesium.Cartesian3.fromDegrees(hub.lng, hub.lat, 500),
          billboard: {
            image: img,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            scale: 1.4,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: hub.name,
            font: "bold 14px 'Segoe UI', Arial",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromCssColorString("#0d0d1a"),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -26),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          description: `<div style="font-family:Arial;font-size:13px;padding:8px;color:#2d2d2d"><b>${hub.name}</b><br/><span style="color:#666">${hub.detail}</span></div>`,
        });
      });

      // ── Main logistics corridor polyline ──
      viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            91.7362, 26.1445,  // Guwahati
            92.7926, 26.6528,  // Tezpur
            94.9120, 27.4728,  // Dibrugarh
          ]),
          width: 5,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.25,
            color: Cesium.Color.fromCssColorString("#b84b76"),
          }),
          clampToGround: true,
        },
      });

      // ── Emergency corridor (Silchar → Guwahati) ──
      viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            92.7789, 24.8333,  // Silchar
            91.7362, 26.1445,  // Guwahati
          ]),
          width: 3,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.35,
            color: Cesium.Color.fromCssColorString("#bf3e4a"),
          }),
          clampToGround: true,
        },
      });

      // ── Weather-watch risk zone (Rangia) ──
      viewer.entities.add({
        name: "Weather Watch Zone — Rangia",
        position: Cesium.Cartesian3.fromDegrees(91.0306, 26.4707, 0),
        ellipse: {
          semiMajorAxis: 31000,
          semiMinorAxis: 28000,
          material: Cesium.Color.fromCssColorString("#b97820").withAlpha(0.18),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#b97820").withAlpha(0.7),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });

      // ── Fly to Assam ──
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(92.85, 26.1, 380000),
        orientation: {
          heading: Cesium.Math.toRadians(5),
          pitch:   Cesium.Math.toRadians(-38),
          roll:    0,
        },
        duration: 3.5,
      });

    } catch (e: any) {
      console.error("Cesium load error:", e);
      setError("3D viewer unavailable — check internet connection.");
      setLoading(false);
    }
  });

  useEffect(() => {
    init();
    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  return (
    <div className={cn("relative w-full h-[500px]", className)}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d1a] z-10 gap-4">
          <div className="w-10 h-10 border-4 border-[#b84b76] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#b84b76] font-mono tracking-widest">LOADING 3D TERRAIN…</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d1a] z-10 gap-3 text-center px-8">
          <p className="text-[#bf3e4a] font-semibold text-sm">{error}</p>
          <p className="text-xs text-gray-500">Ensure you are connected to the internet to load CesiumJS.</p>
        </div>
      )}
      <div ref={container} className="w-full h-full" />
    </div>
  );
}
