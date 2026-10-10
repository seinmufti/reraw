import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  LatLngSchema,
  RouteSchema,
  RoutesFileSchema,
  VehiclesFileSchema,
} from "../../shared/types.js";
import { readJsonFile, writeJsonFile } from "./jsonStore.js";
import { roadPathFor } from "./osrm.js";

const ADMIN_ENABLED = process.env.ADMIN_ENABLED !== "false";

export const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function adminOnly(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (!ADMIN_ENABLED) {
    res.status(403).json({ error: "Admin writes are disabled" });
    return;
  }
  next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/directions", async (req, res) => {
  try {
    const waypoints = z.array(LatLngSchema).parse(req.body.waypoints);
    if (waypoints.length < 2) {
      res.json({ coordinates: waypoints.map((w) => [w.lng, w.lat]) });
      return;
    }
    const coordinates = await roadPathFor(waypoints);
    res.json({ coordinates });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

app.get("/api/routes", async (_req, res) => {
  try {
    const routes = await readJsonFile("routes.json", RoutesFileSchema);
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/routes", adminOnly, async (req, res) => {
  try {
    const route = RouteSchema.parse(req.body);
    const routes = await readJsonFile("routes.json", RoutesFileSchema);
    if (routes.some((r) => r.id === route.id)) {
      res.status(409).json({ error: "Route id already exists" });
      return;
    }
    routes.push(route);
    await writeJsonFile("routes.json", routes, RoutesFileSchema);
    res.status(201).json(route);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.put("/api/routes/:id", adminOnly, async (req, res) => {
  try {
    const route = RouteSchema.parse({ ...req.body, id: req.params.id });
    const routes = await readJsonFile("routes.json", RoutesFileSchema);
    const idx = routes.findIndex((r) => r.id === route.id);
    if (idx === -1) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    routes[idx] = route;
    await writeJsonFile("routes.json", routes, RoutesFileSchema);
    res.json(route);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.delete("/api/routes/:id", adminOnly, async (req, res) => {
  try {
    const routes = await readJsonFile("routes.json", RoutesFileSchema);
    const next = routes.filter((r) => r.id !== req.params.id);
    if (next.length === routes.length) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    await writeJsonFile("routes.json", next, RoutesFileSchema);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/vehicles", async (_req, res) => {
  try {
    const vehicles = await readJsonFile("vehicles.json", VehiclesFileSchema);
    res.json(vehicles);
  } catch {
    res.json([]);
  }
});
