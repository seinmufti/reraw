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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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

function RoutesPanel({
  routes,
  loading,
  error,
  selectedRouteId,
  onSelectRoute,
}: RoutesPanelProps) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("routes")}</h2>
        {selectedRouteId && (
          <Button variant="ghost" size="sm" onClick={() => onSelectRoute(null)}>
            {t("showAllRoutes")}
          </Button>
        )}
      </div>
      {loading && (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
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
              {route.shortCode} — {route.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-1 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("direction")}:{" "}
              </span>
              {route.directionSummary}
            </p>
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

      <Separator className="my-4" />
      <h2 className="text-sm font-semibold">{t("legend")}</h2>
      <ul className="space-y-1 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#34a853]" />
                {t("stopHopOn")}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#1a73e8]" />
                {t("stopTerminal")}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ea4335]" />
          {t("stopEnd")}
        </li>
      </ul>
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
  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: api.getNeighborhoodLabels,
  });

  const routes = routesQuery.data ?? [];
  const labels = labelsQuery.data ?? [];

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  const popupStop = useMemo(() => {
    if (!stopPopup) return null;
    const route = routes.find((r) => r.id === stopPopup.routeId);
    return route?.stops.find((s) => s.id === stopPopup.stopId) ?? null;
  }, [routes, stopPopup]);

  const loading = routesQuery.isLoading || labelsQuery.isLoading;
  const error = routesQuery.isError || labelsQuery.isError;

  const routesPanel = (
    <RoutesPanel
      routes={routes}
      loading={loading}
      error={error}
      selectedRouteId={selectedRouteId}
      onSelectRoute={setSelectedRouteId}
    />
  );

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="border-b p-4 md:hidden">
          <AppTitle />
        </div>

        <aside className="hidden h-full w-[360px] flex-col border-r md:flex">
        <div className="p-4">
          <AppTitle />
        </div>
        <Separator />
          <ScrollArea className="flex-1">{routesPanel}</ScrollArea>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-[45dvh] flex-1">
          <MapCanvas
            routes={routes}
            labels={labels}
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
          {selectedRoute && (
            <Card className="absolute right-4 top-4 z-10 hidden max-w-sm shadow-lg md:block">
              <CardHeader className="p-3">
                <CardTitle className="text-base">{selectedRoute.name}</CardTitle>
              </CardHeader>
              <CardContent className="max-h-48 space-y-1 overflow-auto p-3 pt-0 text-sm">
                <p className="font-medium">{t("stops")}</p>
                {selectedRoute.stops.length === 0 ? (
                  <p className="text-muted-foreground">—</p>
                ) : (
                  selectedRoute.stops.map((s) => (
                    <p key={s.id}>
                      {s.name}{" "}
                      <span className="text-muted-foreground">
                        ({stopTypeLabel(s.type)})
                      </span>
                    </p>
                  ))
                )}
              </CardContent>
            </Card>
          )}
          </div>

          <div className="max-h-[38dvh] shrink-0 overflow-y-auto border-t md:hidden">
            {routesPanel}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
