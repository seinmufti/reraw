import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const rootDir = import.meta.dirname;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
      "@shared": path.resolve(rootDir, "../shared"),
      "@shared/types": path.resolve(rootDir, "../shared/types.ts"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5177,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      clientPort: 5177,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5178",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["maplibre-gl"],
  },
});
