import type { FeatureCollection, LineString, Point } from "geojson";
import type { Route } from "@shared/types";

function lineCoords(
  route: Route,
  snapped?: [number, number][],
): [number, number][] | null {
  if (snapped && snapped.length >= 2) return snapped;
  if (route.path && route.path.length >= 2) {
    return route.path.map((w) => [w.lng, w.lat]);
  }
  if (route.waypoints.length < 2) return null;
  return route.waypoints.map((w) => [w.lng, w.lat]);
}

export function routesToLineCollection(
  routes: Route[],
  selectedRouteId: string | null,
  roadPaths: Record<string, [number, number][]> = {},
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: routes.flatMap((route) => {
      const coords = lineCoords(route, roadPaths[route.id]);
      if (!coords) return [];
      const dimmed =
        selectedRouteId !== null && selectedRouteId !== route.id;
      return [
        {
          type: "Feature" as const,
          properties: {
            routeId: route.id,
            color: route.color,
            dimmed,
          },
          geometry: {
            type: "LineString" as const,
            coordinates: coords,
          },
        },
      ];
    }),
  };
}

export function allStopsCollection(routes: Route[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: routes.flatMap((route) =>
      route.stops.map((stop) => ({
        type: "Feature" as const,
        properties: {
          routeId: route.id,
          stopId: stop.id,
          name: stop.name,
          stopType: stop.type,
          notes: stop.notes ?? "",
        },
        geometry: {
          type: "Point" as const,
          coordinates: [stop.lng, stop.lat],
        },
      })),
    ),
  };
}

export function draftWaypointsCollection(
  waypoints: { lat: number; lng: number }[],
  roadPath?: [number, number][],
): FeatureCollection<LineString | Point> {
  const features: FeatureCollection<LineString | Point>["features"] = waypoints.map(
    (w, i) => ({
      type: "Feature",
      properties: { index: i },
      geometry: { type: "Point", coordinates: [w.lng, w.lat] },
    }),
  );
  const line =
    roadPath && roadPath.length >= 2
      ? roadPath
      : waypoints.length >= 2
        ? waypoints.map((w) => [w.lng, w.lat] as [number, number])
        : null;
  if (line) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: line,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

function nearestPathIndex(
  path: [number, number][],
  point: { lat: number; lng: number },
): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const dx = path[i][0] - point.lng;
    const dy = path[i][1] - point.lat;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/** Line from this waypoint to the next (or from the previous, if it is last). */
export function hoverSegmentCollection(
  waypoints: { lat: number; lng: number }[],
  hoveredIndex: number | null | undefined,
  roadPath?: [number, number][],
): FeatureCollection<LineString | Point> {
  const features: FeatureCollection<LineString | Point>["features"] = [];
  if (hoveredIndex == null || !waypoints[hoveredIndex]) {
    return { type: "FeatureCollection", features };
  }

  const from =
    hoveredIndex < waypoints.length - 1 ? hoveredIndex : hoveredIndex - 1;
  const to = from + 1;
  const start = waypoints[from];
  const end = waypoints[to];

  features.push({
    type: "Feature",
    properties: { kind: "hover-point" },
    geometry: {
      type: "Point",
      coordinates: [waypoints[hoveredIndex].lng, waypoints[hoveredIndex].lat],
    },
  });

  if (!start || !end) {
    return { type: "FeatureCollection", features };
  }

  let coordinates: [number, number][] = [
    [start.lng, start.lat],
    [end.lng, end.lat],
  ];
  if (roadPath && roadPath.length >= 2) {
    const a = nearestPathIndex(roadPath, start);
    const b = nearestPathIndex(roadPath, end);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (hi > lo) coordinates = roadPath.slice(lo, hi + 1);
  }

  features.push({
    type: "Feature",
    properties: { kind: "hover-line" },
    geometry: { type: "LineString", coordinates },
  });
  return { type: "FeatureCollection", features };
}
