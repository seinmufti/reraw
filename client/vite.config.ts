import { readFileSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { RequestHandler } from "express";
import { defineConfig, type Plugin } from "vite";

const rootDir = import.meta.dirname;
const repoRoot = path.resolve(rootDir, "..");
const apiEntry = path.join(repoRoot, "server", "src", "app.ts");

function readDevPort(): number {
  try {
    const designation = JSON.parse(
      readFileSync(path.join(repoRoot, ".cursor", "designation.json"), "utf8"),
    ) as { devPort: number };
    return designation.devPort;
  } catch {
    return 5177;
  }
}

const designation = { devPort: readDevPort() };

/** Serves the Express API from the Vite dev server so dev uses a single port. */
function apiMiddleware(): Plugin {
  return {
    name: "reraw-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api")) {
          next();
          return;
        }
        try {
          const { app } = (await server.ssrLoadModule(apiEntry)) as {
            app: RequestHandler;
          };
          app(req as never, res as never, next);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiMiddleware()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
      "@shared": path.resolve(repoRoot, "shared"),
      "@shared/types": path.resolve(repoRoot, "shared/types.ts"),
    },
  },
  server: {
    host: true,
    port: designation.devPort,
    strictPort: true,
  },
  preview: {
    host: true,
    port: designation.devPort,
    strictPort: true,
  },
  optimizeDeps: {
    include: ["maplibre-gl"],
  },
});
