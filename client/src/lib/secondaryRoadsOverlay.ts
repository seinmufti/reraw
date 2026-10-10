import { ERBIL_DEFAULT_ZOOM, ERBIL_MIN_ZOOM } from "@shared/types";
import type { DataDrivenPropertyValueSpecification, Map } from "maplibre-gl";

const asWidth = (expr: unknown) =>
  expr as DataDrivenPropertyValueSpecification<number>;

const SOURCE_ID = "reraw-secondary-roads";
const CASING_ID = "reraw-secondary-roads-casing";
const LINE_ID = "reraw-secondary-roads-line";

let secondaryRoadsPromise: Promise<GeoJSON.FeatureCollection> | null = null;

function loadSecondaryRoads() {
  if (!secondaryRoadsPromise) {
    secondaryRoadsPromise = fetch("/secondary-roads.geojson").then((r) => {
      if (!r.ok) throw new Error(`secondary-roads.geojson: ${r.status}`);
      return r.json() as Promise<GeoJSON.FeatureCollection>;
    });
  }
  return secondaryRoadsPromise;
}

function insertBeforeHighways(map: Map): string | undefined {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type !== "line") continue;
    if (!layer.id.startsWith("highway-")) continue;
    if (layer.id.includes("name")) continue;
    return layer.id;
  }
  return map.getStyle()?.layers?.[0]?.id;
}

const WIDTH = [
  "interpolate",
  ["exponential", 1.2],
  ["zoom"],
  ERBIL_MIN_ZOOM,
  1.05,
  ERBIL_DEFAULT_ZOOM,
  1.25,
  12,
  1.75,
  14,
  3,
  18,
  6,
  20,
  10,
];

const CASING_WIDTH = [
  "interpolate",
  ["exponential", 1.2],
  ["zoom"],
  ERBIL_MIN_ZOOM,
  1.45,
  ERBIL_DEFAULT_ZOOM,
  1.7,
  12,
  2.35,
  14,
  4,
  18,
  8,
  20,
  14,
];

/** Secondary/tertiary (#fea) at every zoom — same yellow as Bright when zoomed in. */
export function installSecondaryRoadsOverlay(map: Map) {
  if (map.getSource(SOURCE_ID)) return;

  void loadSecondaryRoads()
    .then((data) => {
      if (map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, { type: "geojson", data });
      const before = insertBeforeHighways(map);

      map.addLayer(
        {
          id: CASING_ID,
          type: "line",
          source: SOURCE_ID,
          minzoom: ERBIL_MIN_ZOOM,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#e9ac77",
            "line-opacity": 1,
            "line-width": asWidth(CASING_WIDTH),
          },
        },
        before,
      );

      map.addLayer(
        {
          id: LINE_ID,
          type: "line",
          source: SOURCE_ID,
          minzoom: ERBIL_MIN_ZOOM,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#fea",
            "line-opacity": 1,
            "line-width": asWidth(WIDTH),
          },
        },
        before,
      );
    })
    .catch(() => {
      /* run npm run build:detail-roads */
    });
}
