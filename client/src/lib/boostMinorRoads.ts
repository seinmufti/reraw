import { ERBIL_MIN_ZOOM } from "@shared/types";
import type { Map } from "maplibre-gl";

/** Minor / service / track strokes visible from city-wide zoom (Bright defaults ~13.5+). */
const MINOR_LINE_WIDTH = [
  "interpolate",
  ["exponential", 1.2],
  ["zoom"],
  ERBIL_MIN_ZOOM,
  0.65,
  11,
  1,
  12.5,
  1.8,
  14,
  2.5,
  20,
  11.5,
] as const;

const MINOR_CASING_WIDTH = [
  "interpolate",
  ["exponential", 1.2],
  ["zoom"],
  ERBIL_MIN_ZOOM,
  1,
  11,
  1.4,
  13,
  2.5,
  14,
  4,
  20,
  15,
] as const;

const MINOR_CASING_OPACITY = [
  "interpolate",
  ["linear"],
  ["zoom"],
  ERBIL_MIN_ZOOM,
  0.85,
  11,
  1,
] as const;

function isMinorRoadLayerId(id: string): boolean {
  const lower = id.toLowerCase();
  if (lower.includes("link")) return false;
  if (lower.includes("minor") || lower.includes("service-track")) {
    return (
      lower.startsWith("highway-") ||
      lower.startsWith("tunnel-") ||
      lower.startsWith("bridge-")
    );
  }
  return (
    lower.includes("residential") ||
    lower.includes("living") ||
    lower.includes("alley") ||
    lower.includes("footway") ||
    (lower.includes("path") && lower.startsWith("highway-"))
  );
}

function boostMinorRoadPaint(map: Map, layerId: string) {
  const lower = layerId.toLowerCase();
  try {
    if (lower.includes("casing")) {
      map.setPaintProperty(layerId, "line-width", MINOR_CASING_WIDTH);
      map.setPaintProperty(layerId, "line-opacity", MINOR_CASING_OPACITY);
      return;
    }
    if (lower.includes("minor") || lower.includes("service-track")) {
      map.setPaintProperty(layerId, "line-width", MINOR_LINE_WIDTH);
    }
  } catch {
    /* paint not supported on this layer */
  }
}

/** Show residential / service / path layers from the city-wide zoom level upward. */
export function boostMinorRoadVisibility(map: Map) {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type !== "line") continue;
    if (!isMinorRoadLayerId(layer.id)) continue;
    try {
      map.setLayerZoomRange(layer.id, ERBIL_MIN_ZOOM, 24);
      boostMinorRoadPaint(map, layer.id);
    } catch {
      /* unsupported layer */
    }
  }
}
