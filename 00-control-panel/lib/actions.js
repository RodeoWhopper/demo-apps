import fs from "node:fs";
import path from "node:path";
import { compose, run, capture, composeArgs } from "./docker.js";

function ensureEnv(app, log) {
  // Native compose apps read ./.env; create it from .env.example (demo values) when absent.
  if (app._runner.mode !== "native") return;
  const dir = app._runner.cwd;
  const env = path.join(dir, ".env");
  const example = path.join(dir, ".env.example");
  if (!fs.existsSync(env) && fs.existsSync(example)) {
    fs.copyFileSync(example, env);
    log(`panel: created ${app.folder}/.env from .env.example (demo values)`);
  }
}

function guard(app) {
  if (app._runner.mode === "stack" && !fs.existsSync(app._runner.file)) {
    throw Object.assign(new Error(`No stack file for ${app.folder} (expected ${app.runner.file})`), { status: 500 });
  }
}

export const actions = {
  start: {
    label: "Start",
    heavy: true,
    run: async (app, log) => {
      guard(app);
      ensureEnv(app, log);
      log(`$ docker ${composeArgs(app, ["up", "-d", "--build", "--remove-orphans"]).join(" ")}`);
      return compose(app, ["up", "-d", "--build", "--remove-orphans"], { onLine: log });
    },
  },
  stop: {
    label: "Stop",
    run: async (app, log) => {
      guard(app);
      log(`$ docker ${composeArgs(app, ["down", "--remove-orphans"]).join(" ")}`);
      return compose(app, ["down", "--remove-orphans"], { onLine: log });
    },
  },
  restart: {
    label: "Restart",
    run: async (app, log) => {
      guard(app);
      ensureEnv(app, log);
      log(`$ docker ${composeArgs(app, ["up", "-d", "--force-recreate"]).join(" ")}`);
      return compose(app, ["up", "-d", "--force-recreate"], { onLine: log });
    },
  },
  rebuild: {
    label: "Rebuild (no cache)",
    heavy: true,
    run: async (app, log) => {
      guard(app);
      ensureEnv(app, log);
      log(`$ docker ${composeArgs(app, ["build", "--no-cache"]).join(" ")}`);
      const code = await compose(app, ["build", "--no-cache"], { onLine: log });
      if (code !== 0) return code;
      log(`$ docker ${composeArgs(app, ["up", "-d", "--remove-orphans"]).join(" ")}`);
      return compose(app, ["up", "-d", "--remove-orphans"], { onLine: log });
    },
  },
  reset: {
    label: "Reset (delete data)",
    run: async (app, log) => {
      guard(app);
      log(`$ docker ${composeArgs(app, ["down", "-v", "--remove-orphans"]).join(" ")}`);
      return compose(app, ["down", "-v", "--remove-orphans"], { onLine: log });
    },
  },
  setup: {
    label: "Setup",
    run: async (app, log) => {
      if (!app.setup) throw Object.assign(new Error(`${app.folder} has no setup script`), { status: 400 });
      ensureEnv(app, log);
      log(`$ (cd ${app.folder} && ${app.setup.command})`);
      return run("bash", ["-lc", app.setup.command], { cwd: app._runner.cwd, onLine: log });
    },
  },
};

export async function logs(app, tail = 300) {
  guard(app);
  try {
    return await capture("docker", composeArgs(app, ["logs", "--no-color", "--tail", String(tail)]), {
      cwd: app._runner.cwd,
      timeoutMs: 20000,
    });
  } catch (err) {
    return `(could not read logs: ${err.message})`;
  }
}
