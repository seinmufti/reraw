import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const designation = JSON.parse(
  fs.readFileSync(path.join(ROOT, ".cursor", "designation.json"), "utf8"),
);
const port = designation.devPort;

const lanIps = [];
for (const ifaces of Object.values(os.networkInterfaces())) {
  for (const iface of ifaces ?? []) {
    if (
      iface.family === "IPv4" &&
      !iface.internal &&
      !iface.address.startsWith("169.254.")
    ) {
      lanIps.push(iface.address);
    }
  }
}

console.log("");
console.log("  Local:   http://localhost:" + port + "/");
for (const ip of lanIps) {
  console.log("  Network: http://" + ip + ":" + port + "/");
}
console.log("");
