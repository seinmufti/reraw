/**
 * Build static road GeoJSON for Erbil from OpenFreeMap vector tiles (z13).
 * Low-zoom MVT tiles omit many classes; overlays keep them visible at z10+.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import simplify from "@turf/simplify";

const require = createRequire(import.meta.url);
const VectorTile = require("@mapbox/vector-tile").VectorTile;
const Pbf = require("pbf");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BBOX = { west: 43.82, south: 36.02, east: 44.18, north: 36.32 };
const TILE_Z = 13;
const TILE_URL =
  "https://tiles.openfreemap.org/planet/20261004_113936_pt/{z}/{x}/{y}.pbf";
const DETAIL_CLASSES = new Set([
  "minor",
  "service",
  "track",
  "path",
  "street",
  "pedestrian",
]);
const SECONDARY_CLASSES = new Set(["secondary", "tertiary"]);

function lonToTileX(lon, z) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function latToTileY(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z,
  );
}

function tileRange(bbox, z) {
  const xMin = lonToTileX(bbox.west, z);
  const xMax = lonToTileX(bbox.east, z);
  const yMin = latToTileY(bbox.north, z);
  const yMax = latToTileY(bbox.south, z);
  return { xMin, xMax, yMin, yMax };
}

function clipCoord(lng, lat) {
  return (
    lng >= BBOX.west &&
    lng <= BBOX.east &&
    lat >= BBOX.south &&
    lat <= BBOX.north
  );
}

function clipLine(coords) {
  const kept = coords.filter(([lng, lat]) => clipCoord(lng, lat));
  if (kept.length < 2) return null;
  return kept;
}

function pushLine(features, cls, coords) {
  const clipped = clipLine(coords);
  if (!clipped) return;
  features.push({
    type: "Feature",
    properties: { class: cls },
    geometry: { type: "LineString", coordinates: clipped },
  });
}

async function fetchTile(z, x, y) {
  const url = TILE_URL.replace("{z}", z).replace("{x}", x).replace("{y}", y);
  const res = await fetch(url, {
    headers: { "User-Agent": "reraw-erbil-map/1.0 (github.com/seinmufti/reraw)" },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function writeGeojson(features, filename, tolerance) {
  let collection = { type: "FeatureCollection", features };
  collection = simplify(collection, { tolerance, highQuality: true });
  const outPath = path.join(ROOT, "client", "public", filename);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(collection));
  const mb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(`wrote ${outPath} (${mb} MB, ${collection.features.length} features)`);
}

const { xMin, xMax, yMin, yMax } = tileRange(BBOX, TILE_Z);
const detailFeatures = [];
const secondaryFeatures = [];
let tiles = 0;

for (let x = xMin; x <= xMax; x++) {
  for (let y = yMin; y <= yMax; y++) {
    tiles++;
    let buf;
    try {
      buf = await fetchTile(TILE_Z, x, y);
    } catch (e) {
      console.warn("skip tile", TILE_Z, x, y, e.message);
      continue;
    }
    const tile = new VectorTile(new Pbf(buf));
    const layer = tile.layers.transportation;
    if (!layer) continue;

    for (let i = 0; i < layer.length; i++) {
      const feat = layer.feature(i);
      const cls = feat.properties.class;
      const isDetail = DETAIL_CLASSES.has(cls);
      const isSecondary = SECONDARY_CLASSES.has(cls);
      if (!isDetail && !isSecondary) continue;
      if (feat.properties.brunnel === "tunnel") continue;
      const target = isDetail ? detailFeatures : secondaryFeatures;
      const geom = feat.toGeoJSON(x, y, TILE_Z);
      if (geom.geometry.type === "LineString") {
        pushLine(target, cls, geom.geometry.coordinates);
      } else if (geom.geometry.type === "MultiLineString") {
        for (const line of geom.geometry.coordinates) {
          pushLine(target, cls, line);
        }
      }
    }
  }
}

console.log(`tiles ${tiles}, detail ${detailFeatures.length}, secondary ${secondaryFeatures.length}`);

writeGeojson(detailFeatures, "detail-roads.geojson", 0.00003);
writeGeojson(secondaryFeatures, "secondary-roads.geojson", 0.00002);
