import type { Route } from "@shared/types";
import { getAdminPassword } from "@/lib/adminAuth";
import { apiPath } from "@/lib/router-basename";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const adminPassword = getAdminPassword();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(adminPassword ? { "x-admin-password": adminPassword } : {}),
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
  unlockAdmin: (password: string) =>
    request<{ ok: true }>(apiPath("/api/admin/unlock"), {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  getRoutes: () => request<Route[]>(apiPath("/api/routes")),
  createRoute: (route: Route) =>
    request<Route>(apiPath("/api/routes"), { method: "POST", body: JSON.stringify(route) }),
  updateRoute: (route: Route) =>
    request<Route>(apiPath(`/api/routes/${route.id}`), {
      method: "PUT",
      body: JSON.stringify(route),
    }),
  deleteRoute: (id: string) =>
    request<void>(apiPath(`/api/routes/${id}`), { method: "DELETE" }),

  getDirections: (waypoints: { lat: number; lng: number }[]) =>
    request<{ coordinates: [number, number][] }>(apiPath("/api/directions"), {
      method: "POST",
      body: JSON.stringify({ waypoints }),
    }).then((body) => body.coordinates),
};
