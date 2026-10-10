import type { Route } from "@shared/types";

export type MapClickMode =
  | "view"
  | "start"
  | "waypoint"
  | "end";

export type MapCanvasProps = {
  routes: Route[];
  selectedRouteId: string | null;
  draftWaypoints?: { lat: number; lng: number }[];
  /** Hovered waypoint in the admin list — highlights that stretch of the route. */
  hoveredWaypointIndex?: number | null;
  clickMode?: MapClickMode;
  onMapClick?: (lat: number, lng: number) => void;
  onStopClick?: (routeId: string, stopId: string) => void;
  className?: string;
};
