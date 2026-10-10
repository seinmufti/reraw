import { ERBIL_MIN_ZOOM } from "@shared/types";
import type { Map } from "maplibre-gl";
import { ERBIL_M120_REGION } from "./erbilM120Region";

const INNER_PLACE_LAYERS = new Set(["label_other", "label_village"]);

/** Neighbourhood names inside the M120 ring from OSM (vector tiles), with collision. */
export function boostPlaceLabelVisibility(map: Map) {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type !== "symbol") continue;
    const sourceLayer =
      "source-layer" in layer ? layer["source-layer"] : undefined;
    if (sourceLayer !== "place") continue;

    const { id } = layer;
    try {
      map.setLayerZoomRange(id, ERBIL_MIN_ZOOM, 24);

      if (!INNER_PLACE_LAYERS.has(id)) continue;

      const baseFilter = map.getFilter(id) ?? true;
      map.setFilter(id, [
        "all",
        baseFilter,
        ["within", ERBIL_M120_REGION],
      ]);

      map.setLayoutProperty(id, "text-allow-overlap", false);
      map.setLayoutProperty(id, "text-optional", true);
      map.setLayoutProperty(id, "text-padding", 6);
      map.setLayoutProperty(id, "text-size", [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        9,
        11,
        10,
        13,
        11,
      ]);
    } catch {
      /* unsupported layer */
    }
  }
}
