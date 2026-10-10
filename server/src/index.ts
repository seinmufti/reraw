import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  NeighborhoodLabelSchema,
  NeighborhoodLabelsFileSchema,
  RouteSchema,
  RoutesFileSchema,
  VehiclesFileSchema,
} from "../../shared/types.js";
import { dataDir, readJsonFile, writeJsonFile } from "./jsonStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 5178);
const ADMIN_ENABLED = process.env.ADMIN_ENABLED !== "false";

const app = express();
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
    const idx = routes.findIndex((r) => r.id === req.params.id);
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

app.get("/api/neighborhood-labels", async (_req, res) => {
  try {
    const labels = await readJsonFile(
      "neighborhood-labels.json",
      NeighborhoodLabelsFileSchema,
    );
    res.json(labels);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/neighborhood-labels", adminOnly, async (req, res) => {
  try {
    const label = NeighborhoodLabelSchema.parse(req.body);
    const labels = await readJsonFile(
      "neighborhood-labels.json",
      NeighborhoodLabelsFileSchema,
    );
    if (labels.some((l) => l.id === label.id)) {
      res.status(409).json({ error: "Label id already exists" });
      return;
    }
    labels.push(label);
    await writeJsonFile(
      "neighborhood-labels.json",
      labels,
      NeighborhoodLabelsFileSchema,
    );
    res.status(201).json(label);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.put("/api/neighborhood-labels/:id", adminOnly, async (req, res) => {
  try {
    const label = NeighborhoodLabelSchema.parse({
      ...req.body,
      id: req.params.id,
    });
    const labels = await readJsonFile(
      "neighborhood-labels.json",
      NeighborhoodLabelsFileSchema,
    );
    const idx = labels.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: "Label not found" });
      return;
    }
    labels[idx] = label;
    await writeJsonFile(
      "neighborhood-labels.json",
      labels,
      NeighborhoodLabelsFileSchema,
    );
    res.json(label);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.delete("/api/neighborhood-labels/:id", adminOnly, async (req, res) => {
  try {
    const labels = await readJsonFile(
      "neighborhood-labels.json",
      NeighborhoodLabelsFileSchema,
    );
    const next = labels.filter((l) => l.id !== req.params.id);
    if (next.length === labels.length) {
      res.status(404).json({ error: "Label not found" });
      return;
    }
    await writeJsonFile(
      "neighborhood-labels.json",
      next,
      NeighborhoodLabelsFileSchema,
    );
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

const clientDist = path.resolve(dataDir, "../client/dist");
const clientIndex = path.join(clientDist, "index.html");
if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(clientIndex, (err) => {
      if (err) next();
    });
  });
}

app.listen(PORT, () => {
  console.log(`Reraw API listening on http://localhost:${PORT}`);
});
