import { execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const designation = JSON.parse(
  fs.readFileSync(path.join(ROOT, ".cursor", "designation.json"), "utf8"),
);
const port = designation.devPort;
const wait = process.argv.includes("--wait");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickLanIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return null;
}

function httpStatus(host, p, pathname = "/", timeoutMs = 4000) {
  return new Promise((resolve) => {
    const req = http.get(
      { host, port: p, path: pathname, timeout: timeoutMs },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

function portListening(p) {
  try {
    if (process.platform === "win32") {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${p} -State Listen -ErrorAction SilentlyContinue).Count"`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      return parseInt(out.trim(), 10) > 0;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function inboundRuleForPort(p) {
  try {
    const out = execSync(`netsh advfirewall firewall show rule name=all dir=in verbose`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 60000,
      maxBuffer: 16 * 1024 * 1024,
    });
    const blocks = out.split(/\r?\n\r?\n/);
    for (const block of blocks) {
      const portMatch = new RegExp(`LocalPort:\\s*${p}\\b`).test(block);
      const nodeMatch = /Program:\s*.*nodejs\\node\.exe/i.test(block);
      if (!portMatch && !nodeMatch) continue;
      if (/Direction:\s*In/i.test(block) && /Action:\s*Allow/i.test(block)) {
        if (/Enabled:\s*Yes/i.test(block)) return true;
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

function networkProfiles() {
  try {
    const out = execSync(
      'powershell -NoProfile -Command "Get-NetConnectionProfile | Select-Object -ExpandProperty NetworkCategory"',
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return out
      .trim()
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  if (wait) {
    for (let i = 0; i < 60; i++) {
      if (portListening(port)) break;
      await sleep(500);
    }
  }

  const lan = pickLanIp();
  const localOk = (await httpStatus("127.0.0.1", port)) === 200;
  const lanOk = lan ? (await httpStatus(lan, port)) === 200 : false;
  const apiOk = lan
    ? (await httpStatus(lan, port, "/api/health")) === 200
    : false;
  const fwClient = inboundRuleForPort(port);
  const profiles = networkProfiles();
  const isPublic = profiles.some((p) => /^Public$/i.test(p));
  const hotspotLike = lan?.startsWith("172.20.10.") ?? false;

  console.log("");
  console.log("  Network check (before using on a phone):");
  console.log(
    "  Localhost:     " + (localOk ? "OK (200)" : "FAIL — is dev running?"),
  );
  if (lan) {
    console.log(
      "  This PC → " +
        lan +
        ": " +
        (lanOk ? "OK (200)" : "FAIL"),
    );
    console.log("  Phone URL:     http://" + lan + ":" + port + "/");
  } else {
    console.log("  Phone URL:     (no LAN IPv4 found)");
  }
  console.log(
    "  API via proxy: " + (apiOk ? "OK (/api/health)" : "FAIL"),
  );
  console.log(
    "  Firewall in:   " + port + "=" + (fwClient ? "allow" : "MISSING"),
  );
  if (isPublic) {
    console.log("  Wi‑Fi profile: Public (Windows often blocks phones until rules exist)");
  }

  let phoneLikely = localOk && lanOk && apiOk && fwClient;
  if (hotspotLike) {
    console.log(
      "  Hotspot note:  172.20.10.x — if Catalogue+ works on phone but this does not, compare the same http://… URL pattern.",
    );
  }
  if (!fwClient) {
    console.log("  Fix firewall:  npm run firewall:dev  (PowerShell as Administrator, once)");
  }

  console.log(
    "  Phone ready:   " + (phoneLikely ? "likely yes — try the URL above" : "NO — fix items above first"),
  );
  console.log("");

  return phoneLikely ? 0 : 1;
}

main().then((code) => process.exit(code));
