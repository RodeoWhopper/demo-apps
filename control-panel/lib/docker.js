import { spawn } from "node:child_process";
import readline from "node:readline";

/** Run a command, streaming merged stdout/stderr lines to onLine. Resolves with the exit code. */
export function run(cmd, args, { cwd, env, onLine } = {}) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      return reject(err);
    }
    const pipe = (stream) => {
      readline.createInterface({ input: stream, crlfDelay: Infinity }).on("line", (line) => onLine?.(line));
    };
    pipe(child.stdout);
    pipe(child.stderr);
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? -1));
  });
}

/** Capture full stdout of a command (stderr is ignored unless the command fails). */
export function capture(cmd, args, { cwd, env, timeoutMs = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve(out) : reject(new Error(err.trim() || `${cmd} exited with ${code}`));
    });
  });
}

export function composeArgs(app, extra) {
  return ["compose", "-f", app._runner.file, ...extra];
}

export function compose(app, extra, opts = {}) {
  return run("docker", composeArgs(app, extra), { cwd: app._runner.cwd, ...opts });
}

const FORMAT = [
  '{{.Label "com.docker.compose.project"}}',
  '{{.Label "com.docker.compose.service"}}',
  "{{.State}}",
  "{{.Status}}",
  "{{.Names}}",
  "{{.Ports}}",
  "{{.ID}}",
].join("\t");

/** All compose-managed containers on the host, grouped by compose project name. */
export async function containersByProject() {
  const out = await capture("docker", ["ps", "-a", "--no-trunc", "--filter", "label=com.docker.compose.project", "--format", FORMAT], {
    timeoutMs: 15000,
  });
  const groups = new Map();
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    const [project, service, state, status, name, ports, id] = line.split("\t");
    const health = /\(healthy\)/.test(status) ? "healthy" : /\(unhealthy\)/.test(status) ? "unhealthy" : /\(health: starting\)/.test(status) ? "starting" : null;
    if (!groups.has(project)) groups.set(project, []);
    groups.get(project).push({ service, state, status, health, name, ports, id: id?.slice(0, 12) });
  }
  return groups;
}

export async function dockerInfo() {
  try {
    const out = await capture("docker", ["version", "--format", "{{.Server.Version}}"], { timeoutMs: 10000 });
    return { ok: true, version: out.trim() };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}
