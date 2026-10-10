import { ERBIL_MIN_ZOOM } from "@shared/types";
import type {
  DataDrivenPropertyValueSpecification,
  FilterSpecification,
  Map,
} from "maplibre-gl";
import { publicAssetPath } from "@/lib/router-basename";
import { ERBIL_M120_REGION } from "./erbilM120Region";

const SOURCE_ID = "reraw-neighborhood-places";
const LAYER_ID = "reraw-neighborhood-places-label";
/** Basemap layer whose text style these labels copy. */
const STYLE_TEMPLATE_LAYER = "label_other";
/** Drawn below the app's route lines so routes and stops stay on top. */
const BEFORE_LAYER = "routes-line";

let placesPromise: Promise<GeoJSON.FeatureCollection> | null = null;

function loadPlaces() {
  if (!placesPromise) {
    placesPromise = fetch(publicAssetPath("/neighborhood-places.geojson")).then((r) => {
      if (!r.ok) throw new Error(`neighborhood-places.geojson: ${r.status}`);
      return r.json() as Promise<GeoJSON.FeatureCollection>;
    });
  }
  return placesPromise;
}

function templateLayout<T>(map: Map, prop: "text-field" | "text-font") {
  if (!map.getLayer(STYLE_TEMPLATE_LAYER)) return undefined;
  return map.getLayoutProperty(STYLE_TEMPLATE_LAYER, prop) as T | undefined;
}

/** Neighbourhood names inside the M120 ring at every zoom (basemap tiles only carry them from z14). */
export function installNeighborhoodLabelsOverlay(map: Map) {
  if (map.getSource(SOURCE_ID)) return;

  void loadPlaces()
    .then((data) => {
      if (map.getSource(SOURCE_ID)) return;
      map.addSource(SOURCE_ID, { type: "geojson", data });

      map.addLayer(
        {
          id: LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          minzoom: ERBIL_MIN_ZOOM,
          filter: ["within", ERBIL_M120_REGION] as FilterSpecification,
          layout: {
            "text-field":
              templateLayout<DataDrivenPropertyValueSpecification<string>>(
                map,
                "text-field",
              ) ?? ["get", "name"],
            "text-font": templateLayout<
              DataDrivenPropertyValueSpecification<string[]>
            >(map, "text-font") ?? ["literal", ["Noto Sans Regular"]],
            "text-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              9,
              12,
              10,
              14,
              12,
            ] as DataDrivenPropertyValueSpecification<number>,
            "text-max-width": 7,
            "text-padding": 2,
            "text-allow-overlap": false,
            "text-optional": true,
            "symbol-sort-key": [
              "match",
              ["get", "class"],
              "suburb",
              0,
              "quarter",
              1,
              2,
            ],
          },
          paint: {
            "text-color": "#555",
            "text-halo-color": "rgba(255,255,255,0.85)",
            "text-halo-width": 1.4,
          },
        },
        map.getLayer(BEFORE_LAYER) ? BEFORE_LAYER : undefined,
      );
    })
    .catch(() => {
      /* run npm run build:neighborhoods */
    });
}
