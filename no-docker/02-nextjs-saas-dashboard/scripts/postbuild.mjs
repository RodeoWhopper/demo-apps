// Copies static assets next to the standalone server so `node .next/standalone/server.js`
// (used by `npm start`) can serve them.
import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const standalone = path.join(root, ".next", "standalone");
if (!existsSync(standalone)) {
  console.error("postbuild: .next/standalone not found (is output: 'standalone' set?)");
  process.exit(1);
}
cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
if (existsSync(path.join(root, "public"))) {
  cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
}
console.log("postbuild: copied .next/static and public into .next/standalone");
