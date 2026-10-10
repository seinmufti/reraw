import express from "express";
import fs from "node:fs";
import path from "node:path";
import { app } from "./app.js";
import { dataDir } from "./jsonStore.js";

const repoRoot = path.resolve(dataDir, "..");
const designation = JSON.parse(
  fs.readFileSync(path.join(repoRoot, ".cursor", "designation.json"), "utf8"),
) as { devPort: number };
const PORT = Number(process.env.PORT ?? designation.devPort);
const HOST = process.env.HOST ?? "0.0.0.0";

const clientDist = path.join(repoRoot, "client", "dist");
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

app.listen(PORT, HOST, () => {
  console.log(`Reraw listening on http://${HOST}:${PORT}`);
});
