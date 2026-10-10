import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ZodType } from "zod";
import routesSeed from "../../data/routes.json" with { type: "json" };
import vehiclesSeed from "../../data/vehicles.json" with { type: "json" };

const bundledSeeds: Record<string, unknown> = {
  "routes.json": routesSeed,
  "vehicles.json": vehiclesSeed,
};

function resolveDataDir(): string {
  const starts = [
    path.dirname(fileURLToPath(import.meta.url)),
    process.cwd(),
    path.resolve(process.cwd(), ".."),
  ];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      const candidate = path.join(dir, "data");
      if (existsSync(candidate)) return candidate;
      dir = path.dirname(dir);
    }
  }
  return path.resolve(process.cwd(), "data");
}

export const dataDir = resolveDataDir();

export async function readJsonFile<T>(
  filename: string,
  schema: ZodType<T>,
): Promise<T> {
  const filePath = path.join(dataDir, filename);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    const seed = bundledSeeds[filename];
    if (seed !== undefined) return schema.parse(seed);
    raw = "[]";
  }
  const parsed = JSON.parse(raw) as unknown;
  return schema.parse(parsed);
}

export async function writeJsonFile<T>(
  filename: string,
  data: T,
  schema: ZodType<T>,
): Promise<void> {
  schema.parse(data);
  await fs.mkdir(dataDir, { recursive: true });
  const filePath = path.join(dataDir, filename);
  const tempPath = `${filePath}.${process.pid}.tmp`;
  const body = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(tempPath, body, "utf-8");
  await fs.rename(tempPath, filePath);
}
