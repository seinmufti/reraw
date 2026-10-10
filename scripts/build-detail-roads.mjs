import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** Urban core first — expand if Overpass stays healthy. */
const SOUTH = 36.12;
const WEST = 43.88;
const NORTH = 36.26;
const EAST = 44.12;
const SPLITS = 3;

function queryForBbox(s, w, n, e) {
  return `[out:json][timeout:120];
(
  way["highway"~"^(service|residential|living_street|track|unclassified)$"](${s},${w},${n},${e});
);
out geom;`;
}

const OVERPASS =
  process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

async function fetchBbox(s, w, n, e) {
  const query = queryForBbox(s, w, n, e);
  const url = OVERPASS + "?data=" + encodeURIComponent(query);
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "reraw-bus-map/1.0 (local dev; github.com/seinmufti/reraw)",
      },
    });
    if (res.ok) return res.json();
    const body = await res.text();
    if (attempt < 4 && (res.status === 429 || res.status >= 500)) {
      const wait = attempt * 8000;
      console.warn(`  ${res.status}, retry in ${wait / 1000}s…`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    throw new Error(`Overpass ${res.status}: ${body.slice(0, 300)}`);
  }
  throw new Error("Overpass: unreachable");
}

function simplifyRing(coords, tolerance) {
  if (coords.length <= 2) return coords;
  const tol2 = tolerance * tolerance;

  function sqDistToSegment(p, a, b) {
    let x = a[0];
    let y = a[1];
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = b[0];
        y = b[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  }

  function rdp(points, start, end, out) {
    let maxSq = 0;
    let idx = start;
    const a = points[start];
    const b = points[end];
    for (let i = start + 1; i < end; i++) {
      const sq = sqDistToSegment(points[i], a, b);
      if (sq > maxSq) {
        maxSq = sq;
        idx = i;
      }
    }
    if (maxSq > tol2) {
      rdp(points, start, idx, out);
      out.push(points[idx]);
      rdp(points, idx, end, out);
    }
  }

  const out = [coords[0]];
  rdp(coords, 0, coords.length - 1, out);
  out.push(coords[coords.length - 1]);
  return out;
}

const latStep = (NORTH - SOUTH) / SPLITS;
const lonStep = (EAST - WEST) / SPLITS;
const elements = [];
const seen = new Set();

for (let i = 0; i < SPLITS; i++) {
  for (let j = 0; j < SPLITS; j++) {
    const s = SOUTH + i * latStep;
    const n = i === SPLITS - 1 ? NORTH : SOUTH + (i + 1) * latStep;
    const w = WEST + j * lonStep;
    const e = j === SPLITS - 1 ? EAST : WEST + (j + 1) * lonStep;
    console.log(`Fetching ${s},${w},${n},${e}…`);
    const osm = await fetchBbox(s, w, n, e);
    await new Promise((r) => setTimeout(r, 2500));
    for (const el of osm.elements ?? []) {
      if (el.type !== "way" || seen.has(el.id)) continue;
      seen.add(el.id);
      elements.push(el);
    }
  }
}

const features = [];
for (const el of elements) {
  if (!el.geometry?.length) continue;
  let coords = el.geometry.map((node) => [node.lon, node.lat]);
  coords = simplifyRing(coords, 0.00008);
  if (coords.length < 2) continue;
  features.push({
    type: "Feature",
    properties: { highway: el.tags?.highway ?? "service" },
    geometry: { type: "LineString", coordinates: coords },
  });
}

const geojson = { type: "FeatureCollection", features };
const outPath = path.join(root, "client/public/erbil-detail-roads.geojson");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(geojson));

const mb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
console.log(`Wrote ${features.length} ways → ${outPath} (${mb} MB)`);
