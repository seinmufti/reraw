import {
  RouteSchema,
  type NeighborhoodLabel,
  type Route,
  type Stop,
} from "@shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Link2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { AppTitle } from "@/components/AppTitle";
import { MapCanvas, type MapClickMode } from "@/components/map/MapCanvas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/i18n/en";

const ROUTE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#be185d",
];

function emptyRoute(): Route {
  const id = crypto.randomUUID();
  return {
    id,
    name: "New route",
    shortCode: "NEW",
    color: ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)],
    directionSummary: "",
    waypoints: [],
    neighborhoodsServed: [],
    stops: [],
  };
}

export function AdminPage() {
  const qc = useQueryClient();
  const routesQuery = useQuery({ queryKey: ["routes"], queryFn: api.getRoutes });
  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: api.getNeighborhoodLabels,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Route | null>(null);
  const [clickMode, setClickMode] = useState<MapClickMode>("waypoint");
  const [labelDraft, setLabelDraft] = useState<NeighborhoodLabel | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const routes = routesQuery.data ?? [];
  const labels = labelsQuery.data ?? [];

  useEffect(() => {
    if (!selectedId && routes.length > 0) {
      setSelectedId(routes[0].id);
    }
  }, [routes, selectedId]);

  useEffect(() => {
    if (selectedId) {
      const existing = routes.find((r) => r.id === selectedId);
      if (existing) setDraft(structuredClone(existing));
    } else {
      setDraft(null);
    }
  }, [selectedId, routes]);

  const saveMutation = useMutation({
    mutationFn: async (route: Route) => {
      const parsed = RouteSchema.parse(route);
      const exists = routes.some((r) => r.id === parsed.id);
      if (exists) return api.updateRoute(parsed);
      return api.createRoute(parsed);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["routes"] });
      setSaveError(null);
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRoute(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["routes"] });
      setSelectedId(null);
      setDraft(null);
    },
  });

  const labelSaveMutation = useMutation({
    mutationFn: async (label: NeighborhoodLabel) => {
      const exists = labels.some((l) => l.id === label.id);
      if (exists) return api.updateNeighborhoodLabel(label);
      return api.createNeighborhoodLabel(label);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["labels"] });
      setLabelDraft(null);
      setClickMode("waypoint");
    },
  });

  const labelDeleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNeighborhoodLabel(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["labels"] }),
  });

  const displayRoutes = useMemo(() => {
    if (!draft) return routes;
    const others = routes.filter((r) => r.id !== draft.id);
    return [...others, draft];
  }, [routes, draft]);

  const onMapClick = useCallback(
    (lat: number, lng: number) => {
      if (clickMode === "label") {
        setLabelDraft({
          id: crypto.randomUUID(),
          name: "",
          lat,
          lng,
          minZoom: 11,
        });
        return;
      }
      if (!draft) return;

      if (clickMode === "waypoint") {
        setDraft({
          ...draft,
          waypoints: [...draft.waypoints, { lat, lng }],
        });
        return;
      }

      const stopType =
        clickMode === "hop_on"
          ? "hop_on"
          : clickMode === "terminal"
            ? "terminal"
            : "end";

      const stop: Stop = {
        id: crypto.randomUUID(),
        name: `${stopType === "hop_on" ? "Hop-on" : stopType === "terminal" ? "Terminal" : "End"} stop`,
        type: stopType,
        lat,
        lng,
      };
      setDraft({ ...draft, stops: [...draft.stops, stop] });
    },
    [clickMode, draft],
  );

  const moveWaypoint = (index: number, dir: -1 | 1) => {
    if (!draft) return;
    const next = [...draft.waypoints];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDraft({ ...draft, waypoints: next });
  };

  const removeWaypoint = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      waypoints: draft.waypoints.filter((_, i) => i !== index),
    });
  };

  const neighborhoodsText = draft?.neighborhoodsServed.join(", ") ?? "";

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      <aside className="flex w-full flex-col border-b lg:h-full lg:w-[420px] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-lg font-bold">{t("adminTitle")}</h1>
            <AppTitle as="p" className="!text-xs font-semibold text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/">{t("backToMap")}</Link>
          </Button>
        </div>
        <Separator />
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const r = emptyRoute();
                  setDraft(r);
                  setSelectedId(r.id);
                }}
              >
                {t("newRoute")}
              </Button>
            </div>

            <div className="space-y-2">
              {routes.map((r) => (
                <Button
                  key={r.id}
                  variant={selectedId === r.id ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSelectedId(r.id)}
                >
                  <span
                    className="mr-2 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  {r.shortCode} — {r.name}
                </Button>
              ))}
              {draft && !routes.some((r) => r.id === draft.id) && (
                <Button variant="default" size="sm" className="w-full justify-start">
                  (unsaved) {draft.shortCode}
                </Button>
              )}
            </div>

            {!draft && (
              <p className="text-sm text-muted-foreground">{t("selectRoute")}</p>
            )}

            {draft && (
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">{t("saveRoute")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  <div className="space-y-1">
                    <Label htmlFor="name">{t("routeName")}</Label>
                    <Input
                      id="name"
                      value={draft.name}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="code">{t("shortCode")}</Label>
                      <Input
                        id="code"
                        value={draft.shortCode}
                        onChange={(e) =>
                          setDraft({ ...draft, shortCode: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="color">{t("routeColor")}</Label>
                      <Input
                        id="color"
                        type="color"
                        value={draft.color}
                        onChange={(e) =>
                          setDraft({ ...draft, color: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dir">{t("directionSummary")}</Label>
                    <Textarea
                      id="dir"
                      value={draft.directionSummary}
                      onChange={(e) =>
                        setDraft({ ...draft, directionSummary: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="hoods">{t("neighborhoodsField")}</Label>
                    <Input
                      id="hoods"
                      value={neighborhoodsText}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          neighborhoodsServed: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        ["waypoint", t("modeWaypoint")],
                        ["hop_on", t("modeHopOn")],
                        ["terminal", t("modeTerminal")],
                        ["end", t("modeEnd")],
                        ["label", t("modeLabel")],
                      ] as const
                    ).map(([mode, label]) => (
                      <Button
                        key={mode}
                        size="sm"
                        variant={clickMode === mode ? "default" : "outline"}
                        onClick={() => setClickMode(mode)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>

                  {clickMode === "waypoint" && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={draft.waypoints.length === 0}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              waypoints: draft.waypoints.slice(0, -1),
                            })
                          }
                        >
                          {t("undoLastWaypoint")}
                        </Button>
                      </div>
                      <p className="text-xs font-medium">{t("waypoints")}</p>
                      <ul className="max-h-32 space-y-1 overflow-auto text-xs">
                        {draft.waypoints.map((w, i) => (
                          <li
                            key={`${w.lat}-${w.lng}-${i}`}
                            className="flex items-center justify-between gap-1 rounded border px-2 py-1"
                          >
                            <span>
                              {i + 1}. {w.lat.toFixed(5)}, {w.lng.toFixed(5)}
                            </span>
                            <span className="flex shrink-0 gap-0.5">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => moveWaypoint(i, -1)}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => moveWaypoint(i, 1)}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => removeWaypoint(i)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {saveError && (
                    <p className="text-sm text-destructive">{saveError}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => saveMutation.mutate(draft)}
                      disabled={saveMutation.isPending}
                    >
                      {t("saveRoute")}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          {t("deleteRoute")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("deleteRoute")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("deleteRouteConfirm")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(draft.id)}
                          >
                            {t("delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />
            <h2 className="text-sm font-semibold">{t("labels")}</h2>
            <ul className="space-y-1 text-sm">
              {labels.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded border px-2 py-1"
                >
                  <span>{l.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => labelDeleteMutation.mutate(l.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
            {labelDraft && (
              <Card>
                <CardContent className="space-y-2 p-3">
                  <Label htmlFor="lname">{t("labelName")}</Label>
                  <Input
                    id="lname"
                    value={labelDraft.name}
                    onChange={(e) =>
                      setLabelDraft({ ...labelDraft, name: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!labelDraft.name.trim()}
                      onClick={() => labelSaveMutation.mutate(labelDraft)}
                    >
                      {t("saveLabel")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setLabelDraft(null);
                        setClickMode("waypoint");
                      }}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </aside>

      <div className="relative min-h-[50dvh] flex-1">
        <MapCanvas
          routes={displayRoutes}
          labels={labels}
          selectedRouteId={draft?.id ?? null}
          draftWaypoints={draft?.waypoints ?? []}
          clickMode={clickMode}
          onMapClick={onMapClick}
          className="absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs shadow">
          <Link2 className="mr-1 inline h-3 w-3" />
          Click map — mode: {clickMode}
        </div>
      </div>
    </div>
  );
}
