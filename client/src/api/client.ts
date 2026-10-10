import type { NeighborhoodLabel, Route } from "@shared/types";

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

  getNeighborhoodLabels: () =>
    request<NeighborhoodLabel[]>("/api/neighborhood-labels"),
  createNeighborhoodLabel: (label: NeighborhoodLabel) =>
    request<NeighborhoodLabel>("/api/neighborhood-labels", {
      method: "POST",
      body: JSON.stringify(label),
    }),
  updateNeighborhoodLabel: (label: NeighborhoodLabel) =>
    request<NeighborhoodLabel>(`/api/neighborhood-labels/${label.id}`, {
      method: "PUT",
      body: JSON.stringify(label),
    }),
  deleteNeighborhoodLabel: (id: string) =>
    request<void>(`/api/neighborhood-labels/${id}`, { method: "DELETE" }),
};
