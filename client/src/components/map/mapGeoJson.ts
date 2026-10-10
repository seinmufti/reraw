import type { FeatureCollection, LineString, Point } from "geojson";
import type { NeighborhoodLabel, Route } from "@shared/types";

export function routesToLineCollection(
  routes: Route[],
  selectedRouteId: string | null,
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: routes.flatMap((route) => {
      if (route.waypoints.length < 2) return [];
      const coords = route.waypoints.map((w) => [w.lng, w.lat] as [number, number]);
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

export function labelsToPointCollection(
  labels: NeighborhoodLabel[],
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: labels.map((label) => ({
      type: "Feature",
      properties: {
        labelId: label.id,
        name: label.name,
        minZoom: label.minZoom ?? 12,
        priority:
          label.priority ?? 100 - (label.minZoom ?? 12) * 8,
      },
      geometry: {
        type: "Point",
        coordinates: [label.lng, label.lat],
      },
    })),
  };
}

export function draftWaypointsCollection(
  waypoints: { lat: number; lng: number }[],
): FeatureCollection<LineString | Point> {
  const features: FeatureCollection<LineString | Point>["features"] = waypoints.map(
    (w, i) => ({
      type: "Feature",
      properties: { index: i },
      geometry: { type: "Point", coordinates: [w.lng, w.lat] },
    }),
  );
  if (waypoints.length >= 2) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: waypoints.map((w) => [w.lng, w.lat]),
      },
    });
  }
  return { type: "FeatureCollection", features };
}
