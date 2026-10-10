import { z } from "zod";

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const StopTypeSchema = z.enum(["hop_on", "terminal", "end"]);

export const StopSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: StopTypeSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  notes: z.string().optional(),
});

export const RouteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  waypoints: z.array(LatLngSchema),
  /** Road-following polyline between waypoints (filled on save). */
  path: z.array(LatLngSchema).optional(),
  neighborhoodsServed: z.array(z.string()),
  stops: z.array(StopSchema),
});

export const RoutesFileSchema = z.array(RouteSchema);

export const VehicleSchema = z.object({
  routeId: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  updatedAt: z.string(),
});

export const VehiclesFileSchema = z.array(VehicleSchema);

export type LatLng = z.infer<typeof LatLngSchema>;
export type StopType = z.infer<typeof StopTypeSchema>;
export type Stop = z.infer<typeof StopSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;

export const ERBIL_CENTER: [number, number] = [44.009, 36.191];
/** Default city view; alleys at this zoom come from `detail-roads.geojson` overlay. */
export const ERBIL_DEFAULT_ZOOM = 10.75;
/** MapLibre maxBounds: SW and NE corners as [lng, lat]. */
export const ERBIL_MAX_BOUNDS: [[number, number], [number, number]] = [
  [43.82, 36.02],
  [44.18, 36.32],
];
export const ERBIL_MIN_ZOOM = 10;
export const ERBIL_MAX_ZOOM = 19;
/** Approximate area inside Erbil’s M120 ring — neighbourhood labels only. */
export const ERBIL_M120_LABEL_POLYGON: [number, number][] = [
  [43.979, 36.166],
  [44.04, 36.166],
  [44.04, 36.218],
  [43.979, 36.218],
  [43.979, 36.166],
];
/** @deprecated Use {@link ERBIL_M120_LABEL_POLYGON}. */
export const ERBIL_CORE_LABEL_POLYGON = ERBIL_M120_LABEL_POLYGON;
