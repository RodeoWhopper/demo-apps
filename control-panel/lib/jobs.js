import { randomUUID } from "node:crypto";

const MAX_JOBS = 40;
const MAX_LINES = 3000;

/** Job registry with a per-app lock and a global semaphore for heavy (build) jobs. */
export class Jobs {
  constructor(hub, { buildConcurrency = 2 } = {}) {
    this.hub = hub;
    this.jobs = [];
    this.buildConcurrency = buildConcurrency;
    this.buildsRunning = 0;
    this.waiting = [];
  }

  activeFor(folder) {
    return this.jobs.find((j) => j.app === folder && (j.state === "queued" || j.state === "running"));
  }

  list() {
    return this.jobs.map(({ lines, ...rest }) => ({ ...rest, lineCount: lines.length }));
  }

  get(id) {
    return this.jobs.find((j) => j.id === id) || null;
  }

  publicView(job) {
    const { lines, ...rest } = job;
    return { ...rest, lineCount: lines.length };
  }

  /**
   * Enqueue work for an app. `fn(log)` receives a logger and must return an exit code (0 = success).
   * heavy=true jobs are limited by buildConcurrency.
   */
  enqueue(app, action, fn, { heavy = false } = {}) {
    if (this.activeFor(app.folder)) {
      const err = new Error(`A job is already active for ${app.folder}`);
      err.status = 409;
      throw err;
    }
    const job = {
      id: randomUUID().slice(0, 8),
      app: app.folder,
      title: app.title,
      action,
      heavy,
      state: "queued",
      createdAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null,
      code: null,
      lines: [],
    };
    this.jobs.unshift(job);
    if (this.jobs.length > MAX_JOBS) {
      const idx = this.jobs.findLastIndex((j) => j.state === "done" || j.state === "failed");
      if (idx >= 0) this.jobs.splice(idx, 1);
    }
    this.hub.emit("job", this.publicView(job));
    this._schedule(job, fn);
    return job;
  }

  _schedule(job, fn) {
    const start = async () => {
      if (job.heavy) this.buildsRunning++;
      job.state = "running";
      job.startedAt = new Date().toISOString();
      this.hub.emit("job", this.publicView(job));
      const log = (line) => {
        if (job.lines.length < MAX_LINES) job.lines.push(line);
        else if (job.lines.length === MAX_LINES) job.lines.push("… output truncated …");
        this.hub.emit("log", { job: job.id, app: job.app, line });
      };
      try {
        const code = await fn(log);
        job.code = code;
        job.state = code === 0 ? "done" : "failed";
      } catch (err) {
        log(`panel error: ${err.message || err}`);
        job.code = -1;
        job.state = "failed";
      }
      job.endedAt = new Date().toISOString();
      this.hub.emit("job", this.publicView(job));
      if (job.heavy) {
        this.buildsRunning--;
        this._drain();
      }
    };
    if (job.heavy && this.buildsRunning >= this.buildConcurrency) {
      this.waiting.push(start);
    } else {
      start();
    }
  }

  _drain() {
    while (this.waiting.length && this.buildsRunning < this.buildConcurrency) {
      this.waiting.shift()();
    }
  }
}
