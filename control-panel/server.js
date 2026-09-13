import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog, readmePath, ROOT } from "./lib/catalog.js";
import { Hub } from "./lib/hub.js";
import { Jobs } from "./lib/jobs.js";
import { StatusPoller } from "./lib/status.js";
import { actions, logs } from "./lib/actions.js";
import { dockerInfo } from "./lib/docker.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "127.0.0.1";
const TOKEN = process.env.PANEL_TOKEN || "";
const BUILD_CONCURRENCY = Number(process.env.BUILD_CONCURRENCY || 2);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 4000);

let apps = loadCatalog();
const hub = new Hub();
const jobs = new Jobs(hub, { buildConcurrency: BUILD_CONCURRENCY });
const poller = new StatusPoller({ apps, hub, jobs, intervalMs: POLL_INTERVAL_MS });

const app = express();
app.disable("x-powered-by");
app.use(express.json());

app.get("/healthz", (_req, res) => res.json({ status: "ok", apps: apps.length, root: ROOT }));

// Optional shared-secret guard for everything under /api
app.use("/api", (req, res, next) => {
  if (!TOKEN) return next();
  const given = req.get("x-panel-token") || req.query.token;
  if (given === TOKEN) return next();
  res.status(401).json({ error: "panel token required" });
});

const findApp = (req, res, next) => {
  req.app_ = apps.find((a) => a.folder === req.params.folder);
  if (!req.app_) return res.status(404).json({ error: `unknown app ${req.params.folder}` });
  next();
};

app.get("/api/state", async (_req, res) => {
  res.json({
    root: ROOT,
    docker: await dockerInfo(),
    tokenRequired: Boolean(TOKEN),
    buildConcurrency: BUILD_CONCURRENCY,
    apps: poller.snapshot,
    jobs: jobs.list(),
    actions: Object.fromEntries(Object.entries(actions).map(([k, v]) => [k, v.label])),
  });
});

app.get("/api/events", (req, res) => {
  hub.add(res);
  res.write(`event: apps\ndata: ${JSON.stringify({ apps: poller.snapshot, dockerError: poller.dockerError })}\n\n`);
  res.write(`event: jobs\ndata: ${JSON.stringify(jobs.list())}\n\n`);
});

app.post("/api/apps/:folder/:action", findApp, (req, res) => {
  const def = actions[req.params.action];
  if (!def) return res.status(404).json({ error: `unknown action ${req.params.action}` });
  try {
    const job = jobs.enqueue(req.app_, req.params.action, (log) => def.run(req.app_, log), { heavy: !!def.heavy });
    poller.refreshSoon();
    res.status(202).json({ job: jobs.publicView(job) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/all/:action", (req, res) => {
  const action = req.params.action;
  if (!["start", "stop"].includes(action)) return res.status(400).json({ error: "only start/stop are allowed for all apps" });
  const def = actions[action];
  const started = [];
  const skipped = [];
  const wanted = Array.isArray(req.body?.folders) ? new Set(req.body.folders) : null;
  for (const a of apps) {
    if (wanted && !wanted.has(a.folder)) continue;
    const snap = poller.snapshot.find((s) => s.folder === a.folder);
    if (action === "stop" && snap && snap.status === "stopped") continue;
    if (action === "start" && snap && snap.status === "running") continue;
    try {
      started.push(jobs.publicView(jobs.enqueue(a, action, (log) => def.run(a, log), { heavy: !!def.heavy })));
    } catch (err) {
      skipped.push({ folder: a.folder, reason: err.message });
    }
  }
  poller.refreshSoon();
  res.status(202).json({ started, skipped });
});

app.get("/api/apps/:folder/logs", findApp, async (req, res) => {
  const tail = Math.min(Number(req.query.tail) || 300, 2000);
  res.type("text/plain").send(await logs(req.app_, tail));
});

app.get("/api/apps/:folder/readme", findApp, (req, res) => {
  const file = readmePath(req.app_);
  if (!fs.existsSync(file)) return res.status(404).type("text/plain").send("README.md not found");
  res.type("text/markdown").send(fs.readFileSync(file, "utf8"));
});

app.get("/api/jobs", (_req, res) => res.json(jobs.list()));
app.get("/api/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "unknown job" });
  res.json(job);
});

app.post("/api/reload", (_req, res) => {
  apps = loadCatalog();
  poller.apps = apps;
  poller.refreshSoon();
  res.json({ apps: apps.length });
});

app.use(express.static(path.join(here, "public"), { etag: false, maxAge: 0 }));

app.listen(PORT, HOST, () => {
  poller.start();
  const missing = apps.filter((a) => a.runner.missing).map((a) => a.folder);
  console.log(`demo-apps control panel  http://${HOST}:${PORT}`);
  console.log(`root: ${ROOT}  apps: ${apps.length}  token: ${TOKEN ? "required" : "off"}  build concurrency: ${BUILD_CONCURRENCY}`);
  if (missing.length) console.warn(`warning: no stack file for ${missing.join(", ")}`);
});
