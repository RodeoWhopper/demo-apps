import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PANEL_DIR = path.resolve(here, "..");
export const ROOT = process.env.DEMO_APPS_ROOT
  ? path.resolve(process.env.DEMO_APPS_ROOT)
  : path.resolve(PANEL_DIR, "..");
const PUBLIC_HOST = process.env.PUBLIC_HOST || "localhost";

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

/** Compose derives the default project name from the directory name; mirror that normalisation. */
export function composeProjectName(folder) {
  return folder.toLowerCase().replace(/[^a-z0-9_-]/g, "").replace(/^[_-]+/, "");
}

/** Scan ROOT for numbered app folders that contain a deploy.json (the panel own 00- folder is skipped). */
export function loadCatalog() {
  const extras = readJson(path.join(PANEL_DIR, "catalog.json"), {}) || {};
  const folders = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name) && !d.name.startsWith("00-"))
    .map((d) => d.name)
    .sort();

  const apps = [];
  for (const folder of folders) {
    const dir = path.join(ROOT, folder);
    const manifest = readJson(path.join(dir, "deploy.json"));
    if (!manifest) continue;

    let runner;
    if (manifest.docker?.compose) {
      runner = { mode: "native", cwd: dir, file: path.join(dir, manifest.docker.compose) };
    } else {
      const stack = path.join(PANEL_DIR, "stacks", `${folder}.yml`);
      runner = { mode: "stack", cwd: dir, file: stack, missing: !fs.existsSync(stack) };
    }

    const ports = [manifest.port, ...(manifest.extra_ports || [])].filter((p) => Number.isInteger(p));
    const extra = extras[folder] || {};
    apps.push({
      folder,
      name: manifest.name,
      title: manifest.title,
      description: manifest.description,
      kind: manifest.kind,
      stack: manifest.stack || [],
      runtime: manifest.runtime,
      port: manifest.port,
      extra_ports: manifest.extra_ports || [],
      urls: ports.map((p) => `http://${PUBLIC_HOST}:${p}`),
      healthcheck: manifest.healthcheck || { path: "/", expect_status: 200 },
      auth: manifest.auth || { model: "none", description: "" },
      credentials: manifest.credentials || [],
      routes: manifest.routes || {},
      env: manifest.env || [],
      persistence: manifest.persistence,
      notes: manifest.notes,
      setup: extra.setup || null,
      project: composeProjectName(folder),
      runner: { mode: runner.mode, file: path.relative(ROOT, runner.file), missing: !!runner.missing },
      _runner: runner,
      hasEnvExample: fs.existsSync(path.join(dir, ".env.example")),
      hasEnv: fs.existsSync(path.join(dir, ".env")),
    });
  }
  return apps;
}

export function readmePath(app) {
  return path.join(ROOT, app.folder, "README.md");
}
