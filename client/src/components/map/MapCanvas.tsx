import {
  ERBIL_CENTER,
  ERBIL_DEFAULT_ZOOM,
  ERBIL_MAX_BOUNDS,
  ERBIL_MAX_ZOOM,
  ERBIL_MIN_ZOOM,
  type NeighborhoodLabel,
  type Route,
} from "@shared/types";
import {
  GeoJSONSource,
  Map,
  NavigationControl,
  type MapMouseEvent,
} from "maplibre-gl";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/en";
import { boostMinorRoadVisibility } from "@/lib/boostMinorRoads";
import { boostPlaceLabelVisibility } from "@/lib/boostPlaceLabels";
import { MAP_STYLE_URL, mapStyleFallback } from "@/lib/mapStyle";
import {
  allStopsCollection,
  draftWaypointsCollection,
  labelsToPointCollection,
  routesToLineCollection,
} from "./mapGeoJson";

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

const ROUTES_SOURCE = "reraw-routes";
const STOPS_SOURCE = "reraw-stops";
const LABELS_SOURCE = "reraw-labels";
const DRAFT_SOURCE = "reraw-draft";

function upsertGeoJsonSource(map: Map, id: string, data: GeoJSON.GeoJSON) {
  const src = map.getSource(id);
  if (src && "setData" in src) {
    (src as GeoJSONSource).setData(data);
  } else {
    map.addSource(id, { type: "geojson", data });
  }
}

export function MapCanvas({
  routes,
  labels,
  selectedRouteId,
  draftWaypoints = [],
  clickMode = "view",
  onMapClick,
  onStopClick,
  className,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const propsRef = useRef({
    routes,
    labels,
    selectedRouteId,
    draftWaypoints,
    clickMode,
    onMapClick,
    onStopClick,
  });
  propsRef.current = {
    routes,
    labels,
    selectedRouteId,
    draftWaypoints,
    clickMode,
    onMapClick,
    onStopClick,
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: ERBIL_CENTER,
      zoom: ERBIL_DEFAULT_ZOOM,
      minZoom: ERBIL_MIN_ZOOM,
      maxZoom: ERBIL_MAX_ZOOM,
      maxBounds: ERBIL_MAX_BOUNDS,
      attributionControl: { compact: true },
      fadeDuration: 0,
    });
    map.addControl(new NavigationControl({ visualizePitch: false }), "top-right");

    let styleFallbackApplied = false;
    let styleHasLoaded = false;
    map.on("error", (e) => {
      if (styleFallbackApplied || styleHasLoaded) return;
      // Tile/glyph/source glitches are common; only fall back if the style never loads.
      const sourceId =
        "sourceId" in e && typeof e.sourceId === "string" ? e.sourceId : "";
      if (sourceId) return;
      styleFallbackApplied = true;
      map.setStyle(mapStyleFallback);
    });

    const setupLayers = () => {
      if (map.getLayer("routes-line")) return;
      const p = propsRef.current;
      upsertGeoJsonSource(
        map,
        ROUTES_SOURCE,
        routesToLineCollection(p.routes, p.selectedRouteId),
      );
      map.addLayer({
        id: "routes-line",
        type: "line",
        source: ROUTES_SOURCE,
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "case",
            ["get", "dimmed"],
            2,
            ["==", ["get", "routeId"], p.selectedRouteId ?? ""],
            7,
            5,
          ],
          "line-opacity": ["case", ["get", "dimmed"], 0.35, 0.95],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      upsertGeoJsonSource(map, STOPS_SOURCE, allStopsCollection(p.routes));
      map.addLayer({
        id: "stops-circle",
        type: "circle",
        source: STOPS_SOURCE,
        paint: {
          "circle-radius": 9,
          "circle-color": [
            "match",
            ["get", "stopType"],
            "hop_on",
            "#34a853",
            "terminal",
            "#1a73e8",
            "end",
            "#ea4335",
            "#5f6368",
          ],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      upsertGeoJsonSource(map, LABELS_SOURCE, labelsToPointCollection(p.labels));
      map.addLayer({
        id: "labels-text",
        type: "symbol",
        source: LABELS_SOURCE,
        filter: [">=", ["zoom"], ["get", "minZoom"]],
        layout: {
          "text-field": ["get", "name"],
          "text-size": [
            "case",
            ["==", ["get", "labelId"], "citadel"],
            13,
            12,
          ],
          "text-font": ["Noto Sans Regular"],
          "text-variable-anchor": ["center", "top", "bottom", "left", "right"],
          "text-radial-offset": 0.6,
          "text-justify": "auto",
          "text-max-width": 9,
          // MapLibre draws lower symbol-sort-key on top; invert app priority (higher = more important).
          "text-allow-overlap": [
            "case",
            [">=", ["get", "priority"], 500],
            true,
            false,
          ],
          "text-ignore-placement": [
            "case",
            [">=", ["get", "priority"], 500],
            true,
            false,
          ],
          "text-optional": [
            "case",
            [">=", ["get", "priority"], 500],
            false,
            true,
          ],
          "text-padding": 8,
          "symbol-sort-key": ["*", -1, ["get", "priority"]],
        },
        paint: {
          "text-color": "#202124",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2.5,
        },
      });

      upsertGeoJsonSource(
        map,
        DRAFT_SOURCE,
        draftWaypointsCollection(p.draftWaypoints),
      );
      map.addLayer({
        id: "draft-line",
        type: "line",
        source: DRAFT_SOURCE,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#f59e0b",
          "line-width": 4,
          "line-dasharray": [2, 2],
        },
      });
      map.addLayer({
        id: "draft-points",
        type: "circle",
        source: DRAFT_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#f59e0b",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });
    };

    map.on("style.load", () => {
      styleHasLoaded = true;
      boostMinorRoadVisibility(map);
      boostPlaceLabelVisibility(map);
      setupLayers();
      upsertGeoJsonSource(
        map,
        LABELS_SOURCE,
        labelsToPointCollection(propsRef.current.labels),
      );
    });

    map.on("click", (e: MapMouseEvent) => {
      const { clickMode: mode, onMapClick: click, onStopClick: stopClick } =
        propsRef.current;
      if (mode !== "view" && click) {
        click(e.lngLat.lat, e.lngLat.lng);
        return;
      }
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["stops-circle"],
      });
      if (features.length > 0 && stopClick) {
        const f = features[0];
        const routeId = f.properties?.routeId as string | undefined;
        const stopId = f.properties?.stopId as string | undefined;
        if (routeId && stopId) stopClick(routeId, stopId);
      }
    });

    map.on("mouseenter", "stops-circle", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "stops-circle", () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      if (!map.getLayer("routes-line")) return;
      const p = propsRef.current;
      upsertGeoJsonSource(
        map,
        ROUTES_SOURCE,
        routesToLineCollection(p.routes, p.selectedRouteId),
      );
      upsertGeoJsonSource(map, STOPS_SOURCE, allStopsCollection(p.routes));
      upsertGeoJsonSource(map, LABELS_SOURCE, labelsToPointCollection(p.labels));
      upsertGeoJsonSource(
        map,
        DRAFT_SOURCE,
        draftWaypointsCollection(p.draftWaypoints),
      );
      map.setPaintProperty("routes-line", "line-width", [
        "case",
        ["get", "dimmed"],
        2,
        ["==", ["get", "routeId"], p.selectedRouteId ?? ""],
        7,
        5,
      ]);
    };

    const runSync = () => {
      if (!map.isStyleLoaded()) return;
      sync();
    };

    runSync();
    map.on("style.load", runSync);
    return () => {
      map.off("style.load", runSync);
    };
  }, [routes, labels, selectedRouteId, draftWaypoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = clickMode === "view" ? "" : "crosshair";
  }, [clickMode]);

  const resetView = () => {
    mapRef.current?.flyTo({
      center: ERBIL_CENTER,
      zoom: ERBIL_DEFAULT_ZOOM,
      duration: 700,
    });
  };

  return (
    <div className={`relative ${className ?? "h-full w-full min-h-[320px]"}`}>
      <div ref={containerRef} className="reraw-map h-full w-full" />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label={t("resetMapView")}
        title={t("resetMapView")}
        className="absolute bottom-12 right-3 z-10 border-0 bg-[#5f6368] text-white shadow-md hover:bg-[#494c50]"
        onClick={resetView}
      >
        <LocateFixed className="h-5 w-5" />
      </Button>
    </div>
  );
}
