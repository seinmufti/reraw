import { ERBIL_MIN_ZOOM } from "@shared/types";
import type { Map } from "maplibre-gl";

function isSecondaryTertiaryLine(id: string): boolean {
  if (id.includes("name") || id.includes("shield")) return false;
  return id.includes("secondary-tertiary");
}

/** Basemap secondary/tertiary hidden — `secondary-roads.geojson` draws them at every zoom. */
export function boostSecondaryRoadVisibility(map: Map) {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type !== "line" || !isSecondaryTertiaryLine(layer.id)) continue;
    try {
      map.setLayerZoomRange(layer.id, ERBIL_MIN_ZOOM, 24);
      map.setPaintProperty(layer.id, "line-opacity", 0);
    } catch {
      /* skip */
    }
  }
}

export function scheduleSecondaryRoadBoost(map: Map) {
  const run = () => boostSecondaryRoadVisibility(map);
  run();
  map.once("idle", run);
}
