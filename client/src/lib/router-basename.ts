/** When Reraw is proxied under nordlyssolutions.com/reraw. */
export const NORDLYS_RERAW_BASENAME = "/reraw";

export function getRouterBasename(): string {
  if (typeof window === "undefined") return "";

  const { hostname, pathname } = window.location;
  if (hostname === "nordlyssolutions.com" || hostname === "www.nordlyssolutions.com") {
    return NORDLYS_RERAW_BASENAME;
  }

  if (
    pathname === NORDLYS_RERAW_BASENAME ||
    pathname.startsWith(`${NORDLYS_RERAW_BASENAME}/`)
  ) {
    return NORDLYS_RERAW_BASENAME;
  }

  return "";
}

export function publicAssetPath(path: string): string {
  const base = getRouterBasename();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function apiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return publicAssetPath(normalized);
}
