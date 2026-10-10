import type { LatLng } from "../../shared/types.js";

export type LngLat = [number, number];

const OSRM_ENDPOINTS = [
  "https://router.project-osrm.org/route/v1/driving",
  "https://routing.openstreetmap.de/routed-car/route/v1/driving",
];

const cache = new Map<string, LngLat[]>();

function cacheKey(waypoints: LatLng[]): string {
  return waypoints.map((w) => `${w.lng.toFixed(5)},${w.lat.toFixed(5)}`).join(";");
}

function straight(waypoints: LatLng[]): LngLat[] {
  return waypoints.map((w) => [w.lng, w.lat]);
}

type OsrmResponse = {
  code?: string;
  routes?: { geometry?: { coordinates?: LngLat[] } }[];
};

async function fetchFrom(base: string, waypoints: LatLng[]): Promise<LngLat[]> {
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `${base}/${coords}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Routing ${res.status} from ${base}`);
  const data = (await res.json()) as OsrmResponse;
  const path = data.routes?.[0]?.geometry?.coordinates;
  if (data.code !== "Ok" || !path || path.length < 2) {
    throw new Error("Routing returned no geometry");
  }
  return path;
}

/** Road-following polyline through the clicked points, in order. */
export async function roadPathFor(waypoints: LatLng[]): Promise<LngLat[]> {
  if (waypoints.length < 2) return straight(waypoints);
  const key = cacheKey(waypoints);
  const hit = cache.get(key);
  if (hit) return hit;

  let lastErr: unknown;
  for (const base of OSRM_ENDPOINTS) {
    try {
      const path = await fetchFrom(base, waypoints);
      cache.set(key, path);
      return path;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Routing failed");
}

export function pathToLatLng(path: LngLat[]): LatLng[] {
  return path.map(([lng, lat]) => ({ lat, lng }));
}
