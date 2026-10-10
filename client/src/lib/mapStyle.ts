import type { StyleSpecification } from "maplibre-gl";

/** Free vector style — OSM incl. residential/service roads (no API key). */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/bright";

/** Raster fallback if the vector style is unavailable. */
export const mapStyleFallback: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};
