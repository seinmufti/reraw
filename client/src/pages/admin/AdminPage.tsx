import { RouteSchema, type Route, type Stop } from "@shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { useAutoNeighborhoods } from "@/hooks/useAutoNeighborhoods";
import { useRoadPaths } from "@/hooks/useRoadPaths";
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

function pickRouteColor(used: string[]): string {
  const unused = ROUTE_COLORS.filter(
    (c) => !used.some((u) => u.toLowerCase() === c.toLowerCase()),
  );
  const pool = unused.length > 0 ? unused : ROUTE_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function emptyRoute(usedColors: string[]): Route {
  const id = crypto.randomUUID();
  return {
    id,
    name: "New route",
    color: pickRouteColor(usedColors),
    waypoints: [],
    neighborhoodsServed: [],
    stops: [],
  };
}

// The start (hop_on) and end stops double as the first and last waypoints of the route line.
const hasStart = (r: Route) => r.stops.some((s) => s.type === "hop_on");
const hasEnd = (r: Route) => r.stops.some((s) => s.type === "end");

function initialClickMode(r: Route): MapClickMode {
  if (!hasStart(r)) return "start";
  if (!hasEnd(r)) return "waypoint";
  return "view";
}

function makeStop(type: "hop_on" | "end", lat: number, lng: number): Stop {
  const name = type === "hop_on" ? t("startStop") : t("endStop");
  return { id: crypto.randomUUID(), name, type, lat, lng };
}

const MODE_HINTS: Record<MapClickMode, string> = {
  start: t("hintStart"),
  waypoint: t("hintWaypoint"),
  end: t("hintEnd"),
  view: t("hintView"),
};

export function AdminPage() {
  const qc = useQueryClient();
  const routesQuery = useQuery({ queryKey: ["routes"], queryFn: api.getRoutes });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Route | null>(null);
  const [clickMode, setClickMode] = useState<MapClickMode>("start");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hoveredWaypoint, setHoveredWaypoint] = useState<number | null>(null);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [repositionIndex, setRepositionIndex] = useState<number | null>(null);

  const routes = routesQuery.data ?? [];

  const selectedIsOnServer = routes.some((r) => r.id === selectedId);
  useEffect(() => {
    if (!selectedId) {
      setDraft(null);
      return;
    }
    const existing = routes.find((r) => r.id === selectedId);
    if (existing) setDraft(structuredClone(existing));
    // Reload when switching routes or when a new id first appears on the server.
    // Do not depend on route contents — a refetch must not wipe points being drawn.
  }, [selectedId, selectedIsOnServer]);

  const [saveOk, setSaveOk] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (route: Route) => {
      const parsed = RouteSchema.safeParse(route);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Could not save route");
      }
      const exists = routes.some((r) => r.id === parsed.data.id);
      if (exists) return api.updateRoute(parsed.data);
      return api.createRoute(parsed.data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["routes"] });
      setSaveError(null);
      setSaveOk(true);
    },
    onError: (err: Error) => {
      setSaveOk(false);
      setSaveError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRoute(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["routes"] });
      setSelectedId(null);
      setDraft(null);
    },
  });

  const displayRoutes = useMemo(() => {
    if (!draft) return routes;
    const others = routes.filter((r) => r.id !== draft.id);
    return [...others, draft];
  }, [routes, draft]);

  const draftPathLists = useMemo(
    () =>
      draft
        ? [{ id: draft.id, waypoints: draft.waypoints, stored: draft.path }]
        : [],
    [draft],
  );
  const draftRoadPaths = useRoadPaths(draftPathLists);
  const autoLine = useMemo((): [number, number][] | undefined => {
    if (!draft) return undefined;
    const snapped = draftRoadPaths[draft.id];
    if (snapped && snapped.length >= 2) return snapped;
    if (draft.path && draft.path.length >= 2) {
      return draft.path.map((p) => [p.lng, p.lat] as [number, number]);
    }
    if (draft.waypoints.length > 0) {
      return draft.waypoints.map((w) => [w.lng, w.lat] as [number, number]);
    }
    return undefined;
  }, [draft, draftRoadPaths]);
  const autoNeighborhoods = useAutoNeighborhoods(autoLine);
  const autoNeighborhoodsText = autoNeighborhoods.join(", ");
  const [copiedAuto, setCopiedAuto] = useState(false);

  const onMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!draft) return;
      const point = { lat, lng };
      const wp = draft.waypoints;
      const start = hasStart(draft);
      const end = hasEnd(draft);

      if (repositionIndex != null && repositionIndex < wp.length) {
        const firstPinned = start ? 1 : 0;
        const lastPinned = wp.length - 1 - (end ? 1 : 0);
        const nextStops =
          repositionIndex < firstPinned
            ? draft.stops.map((s) =>
                s.type === "hop_on" ? { ...s, lat, lng } : s,
              )
            : repositionIndex > lastPinned
              ? draft.stops.map((s) =>
                  s.type === "end" ? { ...s, lat, lng } : s,
                )
              : draft.stops;
        setDraft({
          ...draft,
          waypoints: wp.map((w, i) => (i === repositionIndex ? point : w)),
          stops: nextStops,
        });
        setRepositionIndex(null);
        return;
      }

      if (clickMode === "start") {
        setDraft({
          ...draft,
          stops: [
            ...draft.stops.filter((s) => s.type !== "hop_on"),
            makeStop("hop_on", lat, lng),
          ],
          waypoints: start ? [point, ...wp.slice(1)] : [point, ...wp],
        });
        setClickMode(end ? "view" : "waypoint");
        return;
      }

      if (clickMode === "end") {
        setDraft({
          ...draft,
          stops: [
            ...draft.stops.filter((s) => s.type !== "end"),
            makeStop("end", lat, lng),
          ],
          waypoints: end ? [...wp.slice(0, -1), point] : [...wp, point],
        });
        setClickMode("view");
        return;
      }

      if (clickMode === "waypoint") {
        if (insertAfterIndex != null && insertAfterIndex < wp.length) {
          const after = Math.min(
            insertAfterIndex,
            end ? wp.length - 2 : wp.length - 1,
          );
          setDraft({
            ...draft,
            waypoints: [
              ...wp.slice(0, after + 1),
              point,
              ...wp.slice(after + 1),
            ],
          });
          setInsertAfterIndex(null);
          return;
        }
        setDraft({
          ...draft,
          waypoints: end
            ? [...wp.slice(0, -1), point, wp[wp.length - 1]]
            : [...wp, point],
        });
        return;
      }
    },
    [clickMode, draft, insertAfterIndex, repositionIndex],
  );

  // Start and end are pinned to the ends of the line; only the points between them can be edited here.
  const firstMovable = draft && hasStart(draft) ? 1 : 0;
  const lastMovable = draft
    ? draft.waypoints.length - 1 - (hasEnd(draft) ? 1 : 0)
    : -1;

  const beginInsertAfter = (index: number) => {
    if (!draft) return;
    if (hasEnd(draft) && index >= draft.waypoints.length - 1) return;
    if (insertAfterIndex === index) {
      setInsertAfterIndex(null);
      return;
    }
    setRepositionIndex(null);
    setInsertAfterIndex(index);
    setClickMode("waypoint");
  };

  const beginReposition = (index: number) => {
    if (!draft) return;
    if (repositionIndex === index) {
      setRepositionIndex(null);
      return;
    }
    setInsertAfterIndex(null);
    setRepositionIndex(index);
    setClickMode("waypoint");
  };

  const moveWaypoint = (index: number, dir: -1 | 1) => {
    if (!draft) return;
    const next = [...draft.waypoints];
    const target = index + dir;
    if (target < firstMovable || target > lastMovable) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDraft({ ...draft, waypoints: next });
  };

  const removeWaypoint = (index: number) => {
    if (!draft) return;
    // Deleting the first/last pinned point also deletes the start/end stop it belongs to.
    const removedType =
      index < firstMovable ? "hop_on" : index > lastMovable ? "end" : null;
    const next: Route = {
      ...draft,
      waypoints: draft.waypoints.filter((_, i) => i !== index),
      stops: removedType
        ? draft.stops.filter((s) => s.type !== removedType)
        : draft.stops,
    };
    setDraft(next);
    if (removedType) setClickMode(initialClickMode(next));
    if (insertAfterIndex === index) setInsertAfterIndex(null);
    else if (insertAfterIndex != null && index < insertAfterIndex) {
      setInsertAfterIndex(insertAfterIndex - 1);
    }
    if (repositionIndex === index) setRepositionIndex(null);
    else if (repositionIndex != null && index < repositionIndex) {
      setRepositionIndex(repositionIndex - 1);
    }
  };

  // Raw text so typing a trailing comma isn't erased before the next name is typed.
  const [neighborhoodsText, setNeighborhoodsText] = useState("");
  const draftId = draft?.id;
  useEffect(() => {
    setNeighborhoodsText(draft?.neighborhoodsServed.join(", ") ?? "");
    setClickMode(draft ? initialClickMode(draft) : "start");
    setSaveOk(false);
    setSaveError(null);
    setHoveredWaypoint(null);
    setInsertAfterIndex(null);
    setRepositionIndex(null);
    setCopiedAuto(false);
    // Only reset when switching routes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const closeEditor = () => {
    setSelectedId(null);
    setDraft(null);
    setClickMode("view");
    setHoveredWaypoint(null);
    setInsertAfterIndex(null);
    setRepositionIndex(null);
    setSaveOk(false);
    setSaveError(null);
  };

  const openNewRoute = () => {
    const r = emptyRoute(routes.map((route) => route.color));
    setDraft(r);
    setSelectedId(r.id);
  };

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      <aside className="flex w-full flex-col border-b lg:h-full lg:w-[420px] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 p-4">
          {draft ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={closeEditor}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToRoutes")}
            </Button>
          ) : (
            <h1 className="text-lg font-bold">{t("adminTitle")}</h1>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/">{t("backToMap")}</Link>
          </Button>
        </div>
        <Separator />
        <ScrollArea className="flex-1">
          {!draft ? (
            <div className="space-y-2 p-4">
              {routesQuery.isLoading && (
                <p className="text-sm text-muted-foreground">{t("loading")}</p>
              )}
              {routesQuery.isError && (
                <p className="text-sm text-destructive">{t("errorLoad")}</p>
              )}
              {!routesQuery.isLoading && routes.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("noRoutes")}</p>
              )}
              {routes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm font-medium hover:bg-accent"
                  onClick={() => setSelectedId(r.id)}
                >
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                </button>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={openNewRoute}
              >
                <Plus className="h-4 w-4" />
                {t("newRoute")}
              </Button>
            </div>
          ) : (
            <div className="p-4">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">{draft.name}</CardTitle>
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
                  <div className="space-y-1">
                    <Label htmlFor="hoods-auto">{t("neighborhoodsAuto")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="hoods-auto"
                        readOnly
                        value={autoNeighborhoodsText}
                        placeholder={t("neighborhoodsAutoEmpty")}
                        className="bg-muted/40"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={!autoNeighborhoodsText}
                        onClick={() => {
                          void navigator.clipboard.writeText(autoNeighborhoodsText).then(
                            () => {
                              setCopiedAuto(true);
                              window.setTimeout(() => setCopiedAuto(false), 1500);
                            },
                          );
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedAuto ? t("copied") : t("copy")}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="hoods">{t("neighborhoodsField")}</Label>
                    <Input
                      id="hoods"
                      value={neighborhoodsText}
                      onChange={(e) => {
                        setNeighborhoodsText(e.target.value);
                        setDraft({
                          ...draft,
                          neighborhoodsServed: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        });
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        ["start", t("modeStart"), false],
                        ["waypoint", t("modeWaypoint"), !hasStart(draft)],
                        ["end", t("modeEnd"), !hasStart(draft)],
                      ] as const
                    ).map(([mode, label, disabled]) => (
                      <Button
                        key={mode}
                        size="sm"
                        variant={clickMode === mode ? "default" : "outline"}
                        disabled={disabled}
                        onClick={() => {
                          setInsertAfterIndex(null);
                          setRepositionIndex(null);
                          setClickMode(mode);
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>

                  {draft.waypoints.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium">{t("waypoints")}</p>
                      <ul className="max-h-32 space-y-1 overflow-auto text-xs">
                        {draft.waypoints.map((w, i) => {
                          const pinned = i < firstMovable || i > lastMovable;
                          const tag =
                            i < firstMovable
                              ? t("startStop")
                              : i > lastMovable
                                ? t("endStop")
                                : `${i + 1}.`;
                          return (
                          <li
                            key={`${w.lat}-${w.lng}-${i}`}
                            className="flex items-center justify-between gap-1 rounded border px-2 py-1 hover:bg-accent/60"
                            onMouseEnter={() => setHoveredWaypoint(i)}
                            onMouseLeave={() => setHoveredWaypoint(null)}
                          >
                            <span>
                              <span className={pinned ? "font-semibold" : undefined}>
                                {tag}
                              </span>{" "}
                              {w.lat.toFixed(5)}, {w.lng.toFixed(5)}
                            </span>
                            <span className="flex shrink-0 gap-0.5">
                              {!(hasEnd(draft) && i > lastMovable) && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant={insertAfterIndex === i ? "default" : "ghost"}
                                  className="h-6 w-6"
                                  aria-label={t("addWaypointBelow")}
                                  title={t("addWaypointBelow")}
                                  onClick={() => beginInsertAfter(i)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="icon"
                                variant={repositionIndex === i ? "default" : "ghost"}
                                className="h-6 w-6"
                                aria-label={t("repositionWaypoint")}
                                title={t("repositionWaypoint")}
                                onClick={() => beginReposition(i)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {!pinned && (
                                <>
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
                                </>
                              )}
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
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {saveError && (
                    <p className="text-sm text-destructive">{saveError}</p>
                  )}
                  {saveOk && !saveError && (
                    <p className="text-sm text-muted-foreground">{t("routeSaved")}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setSaveOk(false);
                        saveMutation.mutate(draft);
                      }}
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
            </div>
          )}
        </ScrollArea>
      </aside>

      <div className="relative min-h-[50dvh] flex-1">
        <MapCanvas
          routes={displayRoutes}
          selectedRouteId={draft?.id ?? null}
          draftWaypoints={draft?.waypoints ?? []}
          hoveredWaypointIndex={hoveredWaypoint}
          clickMode={draft ? clickMode : "view"}
          onMapClick={draft ? onMapClick : undefined}
          className="absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs shadow">
          <Link2 className="mr-1 inline h-3 w-3" />
          {draft
            ? repositionIndex != null
              ? t("hintReposition")
              : insertAfterIndex != null
                ? t("hintInsertAfter")
                : MODE_HINTS[clickMode]
            : t("routes")}
        </div>
      </div>
    </div>
  );
}
