# Reraw

Map-first web app for **Erbil bus routes**: see where each line goes, which neighborhoods it serves, and where buses usually stop or gather.

- **Public map:** [http://localhost:5177/](http://localhost:5177/)
- **Admin editor:** [http://localhost:5177/admin](http://localhost:5177/admin)

## Stack

- **Client:** React, TypeScript, Vite, Tailwind, shadcn-style UI, **MapLibre GL** + **OpenFreeMap** (OSM data, no API key)
- **Server:** Express API with JSON file storage under [`data/`](data/)

## Local development

```bash
npm install
npm run dev
```

- Vite (strict port **5177**, `host: true`) proxies `/api` to the API on **5178**.
- Designation: [`.cursor/designation.json`](.cursor/designation.json)
- **Phone / LAN:** use the `Network:` URL from the terminal (same Wi‑Fi as this PC). If the page never loads, allow inbound TCP **5177** in Windows Firewall (run PowerShell **as Administrator**):

  `netsh advfirewall firewall add rule name="Reraw Dev 5177" dir=in action=allow protocol=TCP localport=5177`

## Production

```bash
npm run build
npm start
```

Serves the built client from `client/dist` and the API on port **5178** (override with `PORT`).

## Data files

| File | Purpose |
|------|---------|
| [`data/routes.json`](data/routes.json) | Bus routes, waypoints, stops |
| [`data/neighborhood-labels.json`](data/neighborhood-labels.json) | Map labels for neighborhoods |
| [`data/vehicles.json`](data/vehicles.json) | Reserved for future live tracking (`GET /api/vehicles`) |

Route shape is validated with Zod in [`shared/types.ts`](shared/types.ts).

### Route fields

- `shortCode`, `name`, `color`, `directionSummary`
- `waypoints`: ordered `{ lat, lng }` — line is drawn through these points
- `neighborhoodsServed`: text list for the sidebar (comma-separated in admin)
- `stops`: `{ name, type: hop_on | terminal | end, lat, lng, notes? }`

## Admin (no auth in v1)

Anyone who can open `/admin` can edit data. For production, set `ADMIN_ENABLED=false` on the server to block writes, or add authentication later without changing the JSON schema.

## i18n

English copy lives in [`client/src/i18n/en.ts`](client/src/i18n/en.ts). Kurdish can be added alongside when you are ready.

## Map provider

Basemap: [OpenFreeMap](https://openfreemap.org/) (OpenStreetMap data), with OSM raster fallback. Route overlays and labels are rendered by Reraw.
