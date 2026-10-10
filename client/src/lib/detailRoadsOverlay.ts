import { ERBIL_DEFAULT_ZOOM, ERBIL_MIN_ZOOM } from "@shared/types";
import type { Map } from "maplibre-gl";

const SOURCE_ID = "reraw-detail-roads";
const LAYER_ID = "reraw-detail-roads-line";

let detailRoadsPromise: Promise<GeoJSON.FeatureCollection> | null = null;

function loadDetailRoads() {
  if (!detailRoadsPromise) {
    detailRoadsPromise = fetch("/detail-roads.geojson").then((r) => {
      if (!r.ok) throw new Error(`detail-roads.geojson: ${r.status}`);
      return r.json() as Promise<GeoJSON.FeatureCollection>;
    });
  }
  return detailRoadsPromise;
}

/** Layer below Bright highways so alleys do not paint over ring roads. */
function detailRoadsInsertBefore(map: Map): string | undefined {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type !== "line") continue;
    if (!layer.id.startsWith("highway-")) continue;
    if (layer.id.includes("name")) continue;
    return layer.id;
  }
  return map.getStyle()?.layers?.[0]?.id;
}

/** Minor/service roads at every zoom (MVT omits them until ~z13). */
export function installDetailRoadsOverlay(map: Map) {
  if (map.getSource(SOURCE_ID)) return;

  void loadDetailRoads()
    .then((data) => {
      if (map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, { type: "geojson", data });

      map.addLayer(
        {
          id: LAYER_ID,
          type: "line",
          source: SOURCE_ID,
          minzoom: ERBIL_MIN_ZOOM,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#fff",
            "line-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              ERBIL_MIN_ZOOM,
              1,
              12.25,
              1,
              12.75,
              0.35,
              13.25,
              0,
            ],
            "line-width": [
              "interpolate",
              ["exponential", 1.2],
              ["zoom"],
              ERBIL_MIN_ZOOM,
              1,
              ERBIL_DEFAULT_ZOOM,
              1.15,
              12,
              1.4,
              13.25,
              1.5,
            ],
          },
        },
        detailRoadsInsertBefore(map),
      );
    })
    .catch(() => {
      /* missing file in dev until npm run build:detail-roads */
    });
}
