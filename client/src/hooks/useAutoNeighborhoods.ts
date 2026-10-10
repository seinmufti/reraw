import { useEffect, useMemo, useState } from "react";
import {
  loadNeighborhoodPlaces,
  scanNeighborhoodsAlong,
} from "@/lib/scanNeighborhoods";

export function useAutoNeighborhoods(
  line: [number, number][] | undefined,
): string[] {
  const [places, setPlaces] = useState<
    Awaited<ReturnType<typeof loadNeighborhoodPlaces>>
  >([]);

  useEffect(() => {
    let cancelled = false;
    void loadNeighborhoodPlaces()
      .then((data) => {
        if (!cancelled) setPlaces(data);
      })
      .catch(() => {
        if (!cancelled) setPlaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    if (!line || line.length === 0) return [];
    return scanNeighborhoodsAlong(places, line);
  }, [places, line]);
}
