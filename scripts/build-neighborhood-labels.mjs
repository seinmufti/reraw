/**
 * Build neighbourhood/suburb label points for Erbil from OpenFreeMap vector tiles (z14).
 * The basemap only carries neighbourhood places from z14, so the overlay shows them when zoomed out.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const VectorTile = require("@mapbox/vector-tile").VectorTile;
const Pbf = require("pbf");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BBOX = { west: 43.82, south: 36.02, east: 44.18, north: 36.32 };
const TILE_Z = 14;
const TILE_URL =
  "https://tiles.openfreemap.org/planet/20261004_113936_pt/{z}/{x}/{y}.pbf";
const PLACE_CLASSES = new Set(["suburb", "quarter", "neighbourhood"]);
const CONCURRENCY = 8;

function lonToTileX(lon, z) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function latToTileY(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z,
  );
}

async function fetchTile(z, x, y) {
  const url = TILE_URL.replace("{z}", z).replace("{x}", x).replace("{y}", y);
  const res = await fetch(url, {
    headers: { "User-Agent": "reraw-erbil-map/1.0 (github.com/seinmufti/reraw)" },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

const tiles = [];
for (let x = lonToTileX(BBOX.west, TILE_Z); x <= lonToTileX(BBOX.east, TILE_Z); x++) {
  for (let y = latToTileY(BBOX.north, TILE_Z); y <= latToTileY(BBOX.south, TILE_Z); y++) {
    tiles.push([x, y]);
  }
}

const byKey = new Map();

async function processTile([x, y]) {
  let buf;
  try {
    buf = await fetchTile(TILE_Z, x, y);
  } catch (e) {
    console.warn("skip tile", TILE_Z, x, y, e.message);
    return;
  }
  const layer = new VectorTile(new Pbf(buf)).layers.place;
  if (!layer) return;
  for (let i = 0; i < layer.length; i++) {
    const feat = layer.feature(i);
    const props = feat.properties;
    if (!PLACE_CLASSES.has(props.class) || !props.name) continue;
    const geom = feat.toGeoJSON(x, y, TILE_Z).geometry;
    if (geom.type !== "Point") continue;
    const [lng, lat] = geom.coordinates;
    if (lng < BBOX.west || lng > BBOX.east || lat < BBOX.south || lat > BBOX.north) {
      continue;
    }
    const key = `${props.name}|${lng.toFixed(4)}|${lat.toFixed(4)}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      type: "Feature",
      properties: {
        class: props.class,
        name: props.name,
        "name:latin": props["name:latin"] ?? null,
        "name:nonlatin": props["name:nonlatin"] ?? null,
      },
      geometry: { type: "Point", coordinates: [+lng.toFixed(6), +lat.toFixed(6)] },
    });
  }
}

const queue = [...tiles];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await processTile(queue.shift());
  }),
);

const features = [...byKey.values()];
const outPath = path.join(ROOT, "client", "public", "neighborhood-places.geojson");
fs.writeFileSync(outPath, JSON.stringify({ type: "FeatureCollection", features }));
const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log(`tiles ${tiles.length}, wrote ${outPath} (${kb} KB, ${features.length} places)`);
