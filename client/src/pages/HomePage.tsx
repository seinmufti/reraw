import type { Route } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import { Bus, MapPin, X } from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { api } from "@/api/client";
import { AppTitle } from "@/components/AppTitle";
import { SiteFooter } from "@/components/SiteFooter";
import { MapCanvas } from "@/components/map/MapCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";
import { t } from "@/i18n/en";
import { setLang, useLang } from "@/i18n/lang";

/** Bottom-sheet heights as a percentage of the screen: peek, half, tall. */
const SHEET_SNAPS = [30, 55, 88] as const;
const SHEET_MIN_PCT = 18;
const SHEET_MAX_PCT = 92;
const TAP_SLOP_PX = 6;

function nearestSnap(pct: number) {
  let best = 0;
  for (let i = 1; i < SHEET_SNAPS.length; i++) {
    if (Math.abs(SHEET_SNAPS[i] - pct) < Math.abs(SHEET_SNAPS[best] - pct)) {
      best = i;
    }
  }
  return best;
}

function stopTypeLabel(type: Route["stops"][number]["type"]) {
  switch (type) {
    case "hop_on":
      return t("stopHopOn");
    case "terminal":
      return t("stopTerminal");
    case "end":
      return t("stopEnd");
  }
}

type RoutesPanelProps = {
  routes: Route[];
  loading: boolean;
  error: boolean;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string | null) => void;
};

function RoutesHeader({
  selectedRouteId,
  onSelectRoute,
}: Pick<RoutesPanelProps, "selectedRouteId" | "onSelectRoute">) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-background px-4 pt-2 pb-2">
      <h2 className="text-sm font-semibold">{t("routes")}</h2>
      {selectedRouteId && (
        <Button variant="ghost" size="sm" onClick={() => onSelectRoute(null)}>
          {t("showAllRoutes")}
        </Button>
      )}
    </div>
  );
}

function RouteCards({
  routes,
  loading,
  error,
  selectedRouteId,
  onSelectRoute,
}: RoutesPanelProps) {
  return (
    <div className="space-y-3 px-4 pb-8">
      {loading && (
        <>
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        </>
      )}
      {error && <p className="text-sm text-destructive">{t("errorLoad")}</p>}
      {!loading && routes.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noRoutes")}</p>
      )}
      {routes.map((route) => {
        const selected = selectedRouteId === route.id;
        const toggle = () => onSelectRoute(selected ? null : route.id);
        return (
          <Card
            key={route.id}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            className={`cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              selected ? "ring-2 ring-primary" : "hover:bg-accent/40"
            }`}
            onClick={toggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle();
              }
            }}
          >
            <CardHeader className="p-3 pb-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: route.color }}
                />
                <Bus className="h-4 w-4 opacity-70" />
                {route.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-1 text-sm">
              {route.neighborhoodsServed.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">{t("neighborhoodsServed")}</p>
                  <div className="flex flex-wrap gap-1">
                    {route.neighborhoodsServed.map((n) => (
                      <Badge key={n} variant="secondary">
                        {n}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

type SheetHandleProps = {
  /** Called at drag start; returns the screen height in px. */
  onDragStart: () => number;
  onDragMove: (deltaPct: number) => void;
  onDragEnd: (moved: boolean) => void;
  onStep: (dir: 1 | -1) => void;
};

function SheetHandle({ onDragStart, onDragMove, onDragEnd, onStep }: SheetHandleProps) {
  const drag = useRef<{ y: number; moved: boolean; h: number } | null>(null);

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, moved: false, h: onDragStart() };
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (!d.moved && Math.abs(dy) < TAP_SLOP_PX) return;
    d.moved = true;
    onDragMove((dy / d.h) * 100);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (d) onDragEnd(d.moved);
  };
  const key = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowUp") onStep(1);
    else if (e.key === "ArrowDown") onStep(-1);
    else return;
    e.preventDefault();
  };

  return (
    <button
      type="button"
      aria-label={t("routes")}
      className="flex w-full shrink-0 cursor-grab touch-none items-center justify-center py-2.5 outline-none focus-visible:bg-accent active:cursor-grabbing"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
    >
      <span className="h-1.5 w-10 rounded-full bg-foreground/25" />
    </button>
  );
}

export function HomePage() {
  useDocumentLocale();
  const lang = useLang();
  const [snap, setSnap] = useState(0);
  const [dragPct, setDragPct] = useState<number | null>(null);
  const dragPctRef = useRef<number | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [stopPopup, setStopPopup] = useState<{
    routeId: string;
    stopId: string;
  } | null>(null);
  const routesQuery = useQuery({ queryKey: ["routes"], queryFn: api.getRoutes });

  const routes = routesQuery.data ?? [];

  const popupStop = useMemo(() => {
    if (!stopPopup) return null;
    const route = routes.find((r) => r.id === stopPopup.routeId);
    return route?.stops.find((s) => s.id === stopPopup.stopId) ?? null;
  }, [routes, stopPopup]);

  const selectRoute = (id: string | null) => {
    setSelectedRouteId(id);
    // Give the map room to show the chosen route.
    if (id && snap === SHEET_SNAPS.length - 1) setSnap(1);
  };

  const updateDrag = (pct: number | null) => {
    dragPctRef.current = pct;
    setDragPct(pct);
  };

  const loading = routesQuery.isLoading;
  const error = routesQuery.isError;
  const sheetPct = dragPct ?? SHEET_SNAPS[snap];

  return (
    <div
      ref={screenRef}
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex shrink-0 items-center justify-center border-b p-4">
          <AppTitle className="text-center" />
          <Button
            variant="outline"
            size="sm"
            className="absolute end-3 top-1/2 -translate-y-1/2"
            onClick={() => setLang(lang === "ckb" ? "en" : "ckb")}
          >
            {t("switchLanguage")}
          </Button>
        </div>
        <div className="relative min-h-0 flex-1">
          <MapCanvas
            routes={routes}
            selectedRouteId={selectedRouteId}
            onStopClick={(routeId, stopId) => setStopPopup({ routeId, stopId })}
            className="absolute inset-0 h-full w-full"
          />
          {popupStop && (
            <Card className="absolute bottom-4 left-4 right-16 z-10 max-w-xs shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("close")}
                title={t("close")}
                className="absolute end-1 top-1 h-7 w-7"
                onClick={() => setStopPopup(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <CardHeader className="p-3 pb-1 pe-9">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {popupStop.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0 text-sm">
                <p>{stopTypeLabel(popupStop.type)}</p>
                {popupStop.notes && (
                  <p className="text-muted-foreground">{popupStop.notes}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <div
        className={`flex min-h-0 shrink-0 flex-col rounded-t-2xl border-t bg-background shadow-[0_-2px_8px_rgb(0_0_0/0.08)] ${
          dragPct === null ? "transition-[height] duration-200" : ""
        }`}
        style={{ height: `${sheetPct}%` }}
      >
        <SheetHandle
          onDragStart={() => screenRef.current?.clientHeight || 1}
          onDragMove={(delta) =>
            updateDrag(
              Math.min(
                SHEET_MAX_PCT,
                Math.max(SHEET_MIN_PCT, SHEET_SNAPS[snap] + delta),
              ),
            )
          }
          onDragEnd={(moved) => {
            if (moved) setSnap(nearestSnap(dragPctRef.current ?? SHEET_SNAPS[snap]));
            else setSnap((snap + 1) % SHEET_SNAPS.length);
            updateDrag(null);
          }}
          onStep={(dir) =>
            setSnap(Math.min(SHEET_SNAPS.length - 1, Math.max(0, snap + dir)))
          }
        />
        <div className="routes-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          <div>
            <RoutesHeader
              selectedRouteId={selectedRouteId}
              onSelectRoute={selectRoute}
            />
            <RouteCards
              routes={routes}
              loading={loading}
              error={error}
              selectedRouteId={selectedRouteId}
              onSelectRoute={selectRoute}
            />
          </div>
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
