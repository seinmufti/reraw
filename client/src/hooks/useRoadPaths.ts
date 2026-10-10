import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import type { LatLng } from "@shared/types";

export type LngLat = [number, number];

const cache = new Map<string, LngLat[]>();
const inflight = new Map<string, Promise<LngLat[]>>();

export function waypointKey(waypoints: LatLng[]): string {
  return waypoints.map((w) => `${w.lng.toFixed(5)},${w.lat.toFixed(5)}`).join(";");
}

function straight(waypoints: LatLng[]): LngLat[] {
  return waypoints.map((w) => [w.lng, w.lat]);
}

function storedPath(stored?: LatLng[]): LngLat[] | null {
  if (!stored || stored.length < 2) return null;
  return stored.map((w) => [w.lng, w.lat]);
}

function load(waypoints: LatLng[]): Promise<LngLat[]> {
  const key = waypointKey(waypoints);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(key);
  if (pending) return pending;
  const req = api
    .getDirections(waypoints)
    .then((coords) => {
      cache.set(key, coords);
      return coords;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, req);
  return req;
}

export type RoadPathList = {
  id: string;
  waypoints: LatLng[];
  stored?: LatLng[];
};

export function useRoadPaths(lists: RoadPathList[]): Record<string, LngLat[]> {
  const signature = lists
    .map((list) => `${list.id}:${waypointKey(list.waypoints)}`)
    .join("|");

  const initial = useMemo(() => {
    const next: Record<string, LngLat[]> = {};
    for (const list of lists) {
      if (list.waypoints.length < 2) continue;
      const key = waypointKey(list.waypoints);
      next[list.id] =
        cache.get(key) ?? storedPath(list.stored) ?? straight(list.waypoints);
    }
    return next;
    // lists is represented by signature so we don't refetch on new array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const [paths, setPaths] = useState(initial);

  useEffect(() => {
    setPaths(initial);
    let cancelled = false;
    const missing = lists.filter((list) => {
      if (list.waypoints.length < 2) return false;
      return !cache.has(waypointKey(list.waypoints));
    });
    if (missing.length === 0) return;

    void Promise.all(
      missing.map(async (list) => {
        try {
          const coords = await load(list.waypoints);
          if (!cancelled) {
            setPaths((prev) => ({ ...prev, [list.id]: coords }));
          }
        } catch {
          // Keep the straight-line fallback already in state.
        }
      }),
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, initial]);

  return paths;
}
