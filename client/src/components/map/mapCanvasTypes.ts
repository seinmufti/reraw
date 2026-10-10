import type { NeighborhoodLabel, Route } from "@shared/types";

export type MapClickMode =
  | "view"
  | "waypoint"
  | "hop_on"
  | "terminal"
  | "end"
  | "label";

export type MapCanvasProps = {
  routes: Route[];
  labels: NeighborhoodLabel[];
  selectedRouteId: string | null;
  draftWaypoints?: { lat: number; lng: number }[];
  clickMode?: MapClickMode;
  onMapClick?: (lat: number, lng: number) => void;
  onStopClick?: (routeId: string, stopId: string) => void;
  className?: string;
};
