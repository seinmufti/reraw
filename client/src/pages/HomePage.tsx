import type { Route } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import { Bus, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/api/client";
import { AppTitle } from "@/components/AppTitle";
import { SiteFooter } from "@/components/SiteFooter";
import { MapCanvas } from "@/components/map/MapCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n/en";

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
    <div className="sticky top-0 z-10 flex items-center justify-between bg-background px-4 pt-4 pb-2">
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
      {routes.map((route) => (
        <Card
          key={route.id}
          className={
            selectedRouteId === route.id
              ? "ring-2 ring-primary"
              : "cursor-pointer hover:bg-accent/40"
          }
          onClick={() =>
            onSelectRoute(selectedRouteId === route.id ? null : route.id)
          }
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
      ))}
    </div>
  );
}

export function HomePage() {
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

  const loading = routesQuery.isLoading;
  const error = routesQuery.isError;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-[70%] min-h-0 shrink-0 flex-col min-[768px]:h-[70cqh]">
        <div className="flex shrink-0 items-center justify-center border-b p-4">
          <AppTitle className="text-center" />
        </div>
        <div className="relative min-h-0 flex-1">
          <MapCanvas
            routes={routes}
            selectedRouteId={selectedRouteId}
            onStopClick={(routeId, stopId) => setStopPopup({ routeId, stopId })}
            className="absolute inset-0 h-full w-full"
          />
          {popupStop && (
            <Card className="absolute bottom-4 left-4 z-10 max-w-xs shadow-lg">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  {popupStop.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0 text-sm">
                <p>{stopTypeLabel(popupStop.type)}</p>
                {popupStop.notes && (
                  <p className="text-muted-foreground">{popupStop.notes}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStopPopup(null)}
                >
                  {t("cancel")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <div className="flex h-[30%] min-h-0 shrink-0 flex-col min-[768px]:h-[30cqh]">
        <div className="routes-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain border-t [-webkit-overflow-scrolling:touch]">
          <div>
            <RoutesHeader
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
            />
            <RouteCards
              routes={routes}
              loading={loading}
              error={error}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
            />
          </div>
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
