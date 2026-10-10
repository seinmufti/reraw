type Place = {
  name: string;
  lng: number;
  lat: number;
};

const THRESHOLD_M = 450;
const M_PER_DEG_LAT = 111_320;
const ORIGIN_LAT = 36.19;
const ORIGIN_LNG = 44.01;
const M_PER_DEG_LNG = 111_320 * Math.cos((ORIGIN_LAT * Math.PI) / 180);

let placesPromise: Promise<Place[]> | null = null;

function toLocal(lng: number, lat: number): [number, number] {
  return [(lng - ORIGIN_LNG) * M_PER_DEG_LNG, (lat - ORIGIN_LAT) * M_PER_DEG_LAT];
}

function distPointToSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function firstHitIndex(
  place: Place,
  line: [number, number][],
): number | null {
  const [px, py] = toLocal(place.lng, place.lat);
  if (line.length === 1) {
    const [ax, ay] = toLocal(line[0][0], line[0][1]);
    return Math.hypot(px - ax, py - ay) <= THRESHOLD_M ? 0 : null;
  }
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = toLocal(line[i][0], line[i][1]);
    const [bx, by] = toLocal(line[i + 1][0], line[i + 1][1]);
    if (distPointToSeg(px, py, ax, ay, bx, by) <= THRESHOLD_M) return i;
  }
  return null;
}

function placeName(props: GeoJSON.GeoJsonProperties): string | null {
  if (!props) return null;
  const latin = props["name:latin"];
  const name = props.name;
  const raw =
    (typeof latin === "string" && latin.trim()) ||
    (typeof name === "string" && name.trim()) ||
    "";
  return raw || null;
}

export function loadNeighborhoodPlaces(): Promise<Place[]> {
  if (!placesPromise) {
    placesPromise = fetch("/neighborhood-places.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`neighborhood-places.geojson: ${res.status}`);
        return res.json() as Promise<GeoJSON.FeatureCollection>;
      })
      .then((data) =>
        data.features.flatMap((feature) => {
          if (feature.geometry.type !== "Point") return [];
          const name = placeName(feature.properties);
          if (!name) return [];
          const [lng, lat] = feature.geometry.coordinates;
          return [{ name, lng, lat }];
        }),
      );
  }
  return placesPromise;
}

/** Neighborhoods the line passes near, in travel order. */
export function scanNeighborhoodsAlong(
  places: Place[],
  line: [number, number][],
): string[] {
  if (line.length === 0 || places.length === 0) return [];
  const hits: { name: string; index: number }[] = [];
  const seen = new Set<string>();
  for (const place of places) {
    const key = place.name.toLowerCase();
    if (seen.has(key)) continue;
    const index = firstHitIndex(place, line);
    if (index == null) continue;
    seen.add(key);
    hits.push({ name: place.name, index });
  }
  hits.sort((a, b) => a.index - b.index);
  return hits.map((h) => h.name);
}
