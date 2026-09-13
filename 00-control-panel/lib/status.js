import { containersByProject } from "./docker.js";

const BOOT_GRACE_MS = 4 * 60 * 1000;

async function probe(app) {
  const hc = app.healthcheck;
  const url = `http://127.0.0.1:${app.port}${hc.path || "/"}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(2500) });
    const expect = hc.expect_status || 200;
    const ok = res.status === expect || (expect === 200 && res.status >= 200 && res.status < 300);
    return { ok, status: res.status, ms: Date.now() - started, url };
  } catch (err) {
    return { ok: false, status: null, ms: Date.now() - started, url, error: err.name === "TimeoutError" ? "timeout" : (err.cause?.code || err.message) };
  }
}

function summarise(app, containers, health, activeJob, firstSeen) {
  const running = containers.filter((c) => c.state === "running");
  if (activeJob) {
    const map = { start: "starting", stop: "stopping", restart: "restarting", rebuild: "building", reset: "resetting", setup: "setup" };
    return { status: map[activeJob.action] || "working", detail: `${activeJob.action} job ${activeJob.id} ${activeJob.state}` };
  }
  if (containers.length === 0) return { status: "stopped", detail: "no containers" };
  if (running.length === 0) return { status: "exited", detail: containers.map((c) => `${c.service}: ${c.status}`).join(", ") };
  if (running.length < containers.length) {
    return { status: "error", detail: containers.filter((c) => c.state !== "running").map((c) => `${c.service}: ${c.status}`).join(", ") };
  }
  if (health?.ok) return { status: "running", detail: `health ${health.status} in ${health.ms} ms` };
  const age = Date.now() - firstSeen;
  const hint = app.setup ? " — first start? run Setup" : "";
  if (age < BOOT_GRACE_MS) return { status: "booting", detail: `waiting for ${health?.url} (${health?.error || health?.status || "…"})${hint}` };
  return { status: "unhealthy", detail: `health probe ${health?.error || health?.status} at ${health?.url}${hint}` };
}

/** Polls docker + health endpoints and pushes an "apps" snapshot to the hub when anything changes. */
export class StatusPoller {
  constructor({ apps, hub, jobs, intervalMs = 4000 }) {
    this.apps = apps;
    this.hub = hub;
    this.jobs = jobs;
    this.intervalMs = intervalMs;
    this.snapshot = apps.map((a) => this.view(a, { status: "unknown", detail: "polling…" }, [], null));
    this.firstSeen = new Map();
    this.lastJson = "";
    this.dockerError = null;
    this.ticks = 0;
  }

  view(app, summary, containers, health) {
    const { _runner, ...pub } = app;
    return { ...pub, status: summary.status, detail: summary.detail, containers, health };
  }

  start() {
    const loop = async () => {
      try {
        await this.tick();
      } catch (err) {
        this.dockerError = String(err.message || err);
        this.snapshot = this.apps.map((a) => this.view(a, { status: "unknown", detail: `docker unavailable: ${this.dockerError}` }, [], null));
        this.hub.emit("apps", { apps: this.snapshot, dockerError: this.dockerError });
      } finally {
        this.timer = setTimeout(loop, this.intervalMs);
        this.timer.unref();
      }
    };
    loop();
  }

  async refreshSoon() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.start(), 400);
  }

  async tick() {
    const groups = await containersByProject();
    this.dockerError = null;
    const results = await Promise.all(
      this.apps.map(async (app) => {
        const containers = groups.get(app.project) || [];
        const allRunning = containers.length > 0 && containers.every((c) => c.state === "running");
        if (allRunning && !this.firstSeen.has(app.folder)) this.firstSeen.set(app.folder, Date.now());
        if (!allRunning) this.firstSeen.delete(app.folder);
        const health = allRunning ? await probe(app) : null;
        const summary = summarise(app, containers, health, this.jobs.activeFor(app.folder), this.firstSeen.get(app.folder));
        return this.view(app, summary, containers, health);
      }),
    );
    this.snapshot = results;
    this.ticks++;
    const json = JSON.stringify(results.map((r) => [r.folder, r.status, r.detail, r.containers.map((c) => c.status)]));
    if (json !== this.lastJson || this.ticks % 8 === 0) {
      this.lastJson = json;
      this.hub.emit("apps", { apps: this.snapshot, dockerError: null });
    }
  }
}
