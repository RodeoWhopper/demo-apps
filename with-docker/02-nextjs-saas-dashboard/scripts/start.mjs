// Production start: runs the self-contained server produced by `next build` (output: "standalone").
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server = path.join(root, ".next", "standalone", "server.js");
if (!existsSync(server)) {
  console.error("Standalone build not found. Run `npm run build` first.");
  process.exit(1);
}
process.env.PORT ??= "3002";
process.env.HOSTNAME = process.env.HOST ?? "0.0.0.0"; // Next's standalone server reads HOSTNAME
process.env.DATA_DIR ??= path.join(root, "data"); // keep db.json in ./data, not inside .next/
await import(pathToFileURL(server).href);
