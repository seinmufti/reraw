import { ERBIL_DEFAULT_ZOOM, ERBIL_MIN_ZOOM } from "@shared/types";
import type { DataDrivenPropertyValueSpecification, Map } from "maplibre-gl";

const Z0 = ERBIL_MIN_ZOOM;
const ZDEF = ERBIL_DEFAULT_ZOOM;
const Z_HANDOFF = 12.75;
const Z_FULL = 13.25;

const asWidth = (expr: unknown) =>
  expr as DataDrivenPropertyValueSpecification<number>;

const MVT_MINOR_OPACITY = [
  "interpolate",
  ["linear"],
  ["zoom"],
  Z0,
  0,
  Z_HANDOFF,
  0,
  Z_FULL,
  1,
] as DataDrivenPropertyValueSpecification<number>;

const MINOR_LINE_WIDTH = [
  "interpolate",
  ["exponential", 1.2],
  ["zoom"],
  Z0,
  1.6,
  ZDEF,
  2.6,
  12,
  2.4,
  14,
  3,
  20,
  12,
];

const MINOR_CASING_WIDTH = [
  "interpolate",
  ["exponential", 1.2],
  ["zoom"],
  Z0,
  2.2,
  ZDEF,
  3.2,
  13,
  3.5,
  14,
  4,
  20,
  16,
];

const PATH_LINE_WIDTH = [
  "interpolate",
  ["exponential", 1.2],
  ["zoom"],
  Z0,
  1.1,
  ZDEF,
  1.5,
  13,
  1.8,
  15,
  2.5,
  20,
  4,
];

function isDetailRoadLayerId(id: string): boolean {
  const lower = id.toLowerCase();
  if (
    lower.includes("name") ||
    lower.includes("label") ||
    lower.includes("rail") ||
    lower.includes("motorway")
  ) {
    return false;
  }
  const isRoadLayer =
    lower.startsWith("highway-") ||
    lower.startsWith("road_") ||
    lower.startsWith("tunnel_") ||
    lower.startsWith("tunnel-") ||
    lower.startsWith("bridge_") ||
    lower.startsWith("bridge-");
  if (!isRoadLayer) return false;

  return (
    lower.includes("minor") ||
    lower.includes("service") ||
    lower.includes("track") ||
    lower.includes("path") ||
    lower.includes("street") ||
    lower.includes("pedestrian")
  );
}

function boostDetailRoadPaint(map: Map, layerId: string) {
  const lower = layerId.toLowerCase();
  try {
    if (lower.includes("casing")) {
      if (
        !lower.includes("minor") &&
        !lower.includes("service") &&
        !lower.includes("street")
      ) {
        return;
      }
      map.setPaintProperty(layerId, "line-width", asWidth(MINOR_CASING_WIDTH));
      map.setPaintProperty(layerId, "line-opacity", MVT_MINOR_OPACITY);
      return;
    }

    if (lower.includes("path") || lower.includes("pedestrian")) {
      map.setPaintProperty(layerId, "line-width", asWidth(PATH_LINE_WIDTH));
      map.setPaintProperty(layerId, "line-opacity", MVT_MINOR_OPACITY);
      return;
    }

    if (
      lower.includes("minor") ||
      lower.includes("service") ||
      lower.includes("street")
    ) {
      map.setPaintProperty(layerId, "line-width", asWidth(MINOR_LINE_WIDTH));
      map.setPaintProperty(layerId, "line-color", "#fff");
      map.setPaintProperty(layerId, "line-opacity", MVT_MINOR_OPACITY);
    }
  } catch {
    /* layer may not support property */
  }
}

export function boostMinorRoadVisibility(map: Map) {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type !== "line") continue;
    if (!isDetailRoadLayerId(layer.id)) continue;
    try {
      map.setLayerZoomRange(layer.id, ERBIL_MIN_ZOOM, 24);
      boostDetailRoadPaint(map, layer.id);
    } catch {
      /* unsupported layer */
    }
  }
}

export function scheduleMinorRoadBoost(map: Map) {
  const run = () => boostMinorRoadVisibility(map);
  run();
  map.once("idle", run);
}
