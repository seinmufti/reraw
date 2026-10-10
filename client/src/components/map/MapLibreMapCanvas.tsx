import "@/lib/maplibreSetup";
import {
  ERBIL_CENTER,
  ERBIL_DEFAULT_ZOOM,
  ERBIL_MAX_BOUNDS,
  ERBIL_MAX_ZOOM,
  ERBIL_MIN_ZOOM,
} from "@shared/types";
import {
  GeoJSONSource,
  Map,
  NavigationControl,
  type MapMouseEvent,
} from "maplibre-gl";
import { LocateFixed } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRoadPaths } from "@/hooks/useRoadPaths";
import { t } from "@/i18n/en";
import { scheduleMinorRoadBoost } from "@/lib/boostMinorRoads";
import { scheduleSecondaryRoadBoost } from "@/lib/boostSecondaryRoads";
import { installDetailRoadsOverlay } from "@/lib/detailRoadsOverlay";
import { installSecondaryRoadsOverlay } from "@/lib/secondaryRoadsOverlay";
import { boostPlaceLabelVisibility } from "@/lib/boostPlaceLabels";
import { installNeighborhoodLabelsOverlay } from "@/lib/neighborhoodLabelsOverlay";
import { MAP_STYLE_URL, mapStyleFallback } from "@/lib/mapStyle";
import {
  allStopsCollection,
  draftWaypointsCollection,
  hoverSegmentCollection,
  routesToLineCollection,
} from "./mapGeoJson";

export type { MapCanvasProps, MapClickMode } from "./mapCanvasTypes";
import type { MapCanvasProps } from "./mapCanvasTypes";

const ROUTES_SOURCE = "reraw-routes";
const STOPS_SOURCE = "reraw-stops";
const DRAFT_SOURCE = "reraw-draft";
const HOVER_SOURCE = "reraw-hover-segment";
const DRAFT_PATH_ID = "__draft__";
const PHONE_ZOOM_IN = 0.05;

const PHONE_MAX_WIDTH_PX = 767;

/** Phone-sized maps (real phones and the PC phone frame) start a little closer in. */
function startZoom(container: HTMLElement | null) {
  const isPhoneSized = (container?.clientWidth ?? 0) <= PHONE_MAX_WIDTH_PX;
  return isPhoneSized ? ERBIL_DEFAULT_ZOOM + PHONE_ZOOM_IN : ERBIL_DEFAULT_ZOOM;
}

function upsertGeoJsonSource(map: Map, id: string, data: GeoJSON.GeoJSON) {
  const src = map.getSource(id);
  if (src && "setData" in src) {
    (src as GeoJSONSource).setData(data);
  } else {
    map.addSource(id, { type: "geojson", data });
  }
}

export function MapLibreMapCanvas({
  routes,
  selectedRouteId,
  draftWaypoints = [],
  hoveredWaypointIndex = null,
  clickMode = "view",
  onMapClick,
  onStopClick,
  className,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const roadPathLists = useMemo(
    () => [
      ...routes.map((route) => ({
        id: route.id,
        waypoints: route.waypoints,
        stored: route.path,
      })),
      { id: DRAFT_PATH_ID, waypoints: draftWaypoints },
    ],
    [routes, draftWaypoints],
  );
  const roadPaths = useRoadPaths(roadPathLists);
  const propsRef = useRef({
    routes,
    selectedRouteId,
    draftWaypoints,
    hoveredWaypointIndex,
    roadPaths,
    clickMode,
    onMapClick,
    onStopClick,
  });
  propsRef.current = {
    routes,
    selectedRouteId,
    draftWaypoints,
    hoveredWaypointIndex,
    roadPaths,
    clickMode,
    onMapClick,
    onStopClick,
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let cancelled = false;
    let map: Map | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const extraCleanups: Array<() => void> = [];

    const attachResize = (instance: Map, node: HTMLElement) => {
      const onResize = () => {
        if (node.clientWidth >= 2 && node.clientHeight >= 2) instance.resize();
      };
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(node);
      window.addEventListener("resize", onResize);
      window.addEventListener("orientationchange", onResize);
      extraCleanups.push(() => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onResize);
      });
      requestAnimationFrame(() => {
        onResize();
        requestAnimationFrame(onResize);
      });
      instance.once("load", onResize);
    };

    const createMap = () => {
      if (cancelled || mapRef.current || !containerRef.current) return;
      const node = containerRef.current;
      if (node.clientWidth < 2 || node.clientHeight < 2) return;

    map = new Map({
      container: node,
      style: MAP_STYLE_URL,
      center: ERBIL_CENTER,
      zoom: startZoom(node),
      minZoom: ERBIL_MIN_ZOOM,
      maxZoom: ERBIL_MAX_ZOOM,
      maxBounds: ERBIL_MAX_BOUNDS,
      attributionControl: false,
      fadeDuration: 0,
      trackResize: true,
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
        routesToLineCollection(p.routes, p.selectedRouteId, p.roadPaths),
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

      upsertGeoJsonSource(
        map,
        DRAFT_SOURCE,
        draftWaypointsCollection(p.draftWaypoints, p.roadPaths[DRAFT_PATH_ID]),
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

      upsertGeoJsonSource(
        map,
        HOVER_SOURCE,
        hoverSegmentCollection(
          p.draftWaypoints,
          p.hoveredWaypointIndex,
          p.roadPaths[DRAFT_PATH_ID],
        ),
      );
      map.addLayer({
        id: "hover-segment-casing",
        type: "line",
        source: HOVER_SOURCE,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#ffffff",
          "line-width": 12,
          "line-opacity": 0.9,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addLayer({
        id: "hover-segment-line",
        type: "line",
        source: HOVER_SOURCE,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#2563eb",
          "line-width": 7,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addLayer({
        id: "hover-segment-point",
        type: "circle",
        source: HOVER_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 9,
          "circle-color": "#2563eb",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
    };

    map.on("style.load", () => {
      styleHasLoaded = true;
      scheduleMinorRoadBoost(map);
      scheduleSecondaryRoadBoost(map);
      boostPlaceLabelVisibility(map);
      setupLayers();
      installDetailRoadsOverlay(map);
      installSecondaryRoadsOverlay(map);
      installNeighborhoodLabelsOverlay(map);
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
    attachResize(map, node);
    };

    const readyObserver = new ResizeObserver(() => createMap());
    readyObserver.observe(el);
    createMap();

    return () => {
      cancelled = true;
      readyObserver.disconnect();
      resizeObserver?.disconnect();
      for (const clean of extraCleanups) clean();
      map?.remove();
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
        routesToLineCollection(p.routes, p.selectedRouteId, p.roadPaths),
      );
      upsertGeoJsonSource(map, STOPS_SOURCE, allStopsCollection(p.routes));
      upsertGeoJsonSource(
        map,
        DRAFT_SOURCE,
        draftWaypointsCollection(p.draftWaypoints, p.roadPaths[DRAFT_PATH_ID]),
      );
      upsertGeoJsonSource(
        map,
        HOVER_SOURCE,
        hoverSegmentCollection(
          p.draftWaypoints,
          p.hoveredWaypointIndex,
          p.roadPaths[DRAFT_PATH_ID],
        ),
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

    // isStyleLoaded() stays false while tiles load, which would drop data that arrives mid-load.
    sync();
    map.on("style.load", sync);
    return () => {
      map.off("style.load", sync);
    };
  }, [routes, selectedRouteId, draftWaypoints, hoveredWaypointIndex, roadPaths]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = clickMode === "view" ? "" : "crosshair";
  }, [clickMode]);

  const resetView = () => {
    mapRef.current?.flyTo({
      center: ERBIL_CENTER,
      zoom: startZoom(containerRef.current),
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
        className="absolute right-3 bottom-3 z-10 border-0 bg-[#5f6368] text-white shadow-md hover:bg-[#494c50]"
        onClick={resetView}
      >
        <LocateFixed className="h-5 w-5" />
      </Button>
    </div>
  );
}
