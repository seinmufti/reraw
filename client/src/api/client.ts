import type { Route } from "@shared/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  getRoutes: () => request<Route[]>("/api/routes"),
  createRoute: (route: Route) =>
    request<Route>("/api/routes", { method: "POST", body: JSON.stringify(route) }),
  updateRoute: (route: Route) =>
    request<Route>(`/api/routes/${route.id}`, {
      method: "PUT",
      body: JSON.stringify(route),
    }),
  deleteRoute: (id: string) =>
    request<void>(`/api/routes/${id}`, { method: "DELETE" }),

  getDirections: (waypoints: { lat: number; lng: number }[]) =>
    request<{ coordinates: [number, number][] }>("/api/directions", {
      method: "POST",
      body: JSON.stringify({ waypoints }),
    }).then((body) => body.coordinates),
};
