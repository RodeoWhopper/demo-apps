/* Demo Apps Control Panel – vanilla JS client (no build step). */
const $ = (sel, root = document) => root.querySelector(sel);
const state = { apps: [], jobs: [], selectedJob: null, docker: null, token: localStorage.getItem("panelToken") || "" };
const els = {
  grid: $("#grid"), summary: $("#summary"), jobs: $("#jobs"), console: $("#console"), banner: $("#banner"),
  search: $("#search"), kind: $("#kindFilter"), onlyRunning: $("#onlyRunning"), jobCount: $("#jobCount"),
  dialog: $("#dialog"), dialogTitle: $("#dialogTitle"), dialogBody: $("#dialogBody"), toasts: $("#toasts"), root: $("#rootPath"),
};
const tpl = $("#cardTpl");
const cards = new Map();
const STATUS_LABEL = {
  running: "Running", stopped: "Stopped", booting: "Booting", unhealthy: "Unhealthy", error: "Error", exited: "Exited",
  starting: "Starting", building: "Building", restarting: "Restarting", stopping: "Stopping", resetting: "Resetting", setup: "Setup running", working: "Working", unknown: "…",
};
const BUSY = new Set(["starting", "building", "restarting", "stopping", "resetting", "setup", "working"]);

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function toast(msg, type = "info", ms = 4500) {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  els.toasts.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (state.token) headers["x-panel-token"] = state.token;
  const res = await fetch(path, { ...opts, headers });
  if (res.status === 401) {
    const t = prompt("This panel requires a token (PANEL_TOKEN). Enter it:");
    if (t) { state.token = t; localStorage.setItem("panelToken", t); return api(path, opts); }
  }
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(body?.error || (typeof body === "string" ? body : res.statusText));
  return body;
}
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "");

/* ---------- rendering ---------- */
function matchesFilter(app) {
  const q = els.search.value.trim().toLowerCase();
  if (els.kind.value && app.kind !== els.kind.value) return false;
  if (els.onlyRunning.checked && app.status !== "running") return false;
  if (!q) return true;
  const hay = [app.folder, app.title, app.description, app.kind, app.runtime, app.auth?.model, ...(app.stack || []), app.port, ...(app.extra_ports || [])].join(" ").toLowerCase();
  return hay.includes(q);
}

function renderSummary() {
  const count = (s) => state.apps.filter((a) => a.status === s).length;
  const busy = state.apps.filter((a) => BUSY.has(a.status) || a.status === "booting").length;
  const bad = state.apps.filter((a) => ["error", "unhealthy", "exited"].includes(a.status)).length;
  els.summary.innerHTML = `
    <span class="chip"><span class="dot" style="background:var(--ok)"></span>${count("running")} running</span>
    <span class="chip"><span class="dot" style="background:var(--busy)"></span>${busy} working</span>
    <span class="chip"><span class="dot" style="background:var(--danger)"></span>${bad} failing</span>
    <span class="chip"><span class="dot"></span>${count("stopped")} stopped</span>
    <span class="chip">${state.apps.length} apps</span>`;
}

function cardFor(app) {
  let card = cards.get(app.folder);
  if (!card) {
    card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.folder = app.folder;
    $(".num", card).textContent = `#${app.folder.slice(0, 2)}`;
    $(".title", card).textContent = app.title;
    $(".desc", card).textContent = app.description;
    $(".desc", card).title = app.description;
    $(".tags", card).innerHTML =
      `<span class="tag kind">${esc(app.kind)}</span><span class="tag">${esc(app.runtime)}</span><span class="tag auth" title="${esc(app.auth?.description)}">auth: ${esc(app.auth?.model || "none")}</span>` +
      (app.stack || []).slice(0, 4).map((s) => `<span class="tag">${esc(s)}</span>`).join("");
    $(".ports", card).innerHTML = app.urls.map((u, i) => `<a class="port" href="${esc(u)}" target="_blank" rel="noopener">${i === 0 ? "↗" : "↗"} ${esc(u.replace(/^https?:\/\//, ""))}</a>`).join("");
    const setup = $(".setup", card);
    if (app.setup) { setup.hidden = false; setup.textContent = `⚙ ${app.setup.label}`; setup.title = app.setup.hint || app.setup.command; }
    card.addEventListener("click", onCardClick);
    cards.set(app.folder, card);
  }
  return card;
}

function updateCard(app) {
  const card = cardFor(app);
  card.dataset.status = app.status;
  card.classList.toggle("busy", BUSY.has(app.status));
  $(".status-text", card).textContent = STATUS_LABEL[app.status] || app.status;
  $(".status-pill", card).title = app.detail || "";
  $(".detail", card).textContent = app.detail || "";
  const running = app.status === "running";
  const hasContainers = app.containers?.length > 0;
  card.querySelectorAll(".port").forEach((p) => p.classList.toggle("disabled", !hasContainers));
  $(".containers", card).innerHTML = (app.containers || [])
    .map((c) => `<li class="${c.state === "running" ? "up" : "down"}" title="${esc(c.name)}">${esc(c.service)} · ${esc(c.status)}</li>`)
    .join("");
  const busy = BUSY.has(app.status);
  $('[data-action="start"]', card).disabled = busy || running;
  $('[data-action="stop"]', card).disabled = busy || !hasContainers;
  $('[data-action="restart"]', card).disabled = busy || !hasContainers;
  $('[data-action="setup"]', card).disabled = busy;
  $('[data-action="rebuild"]', card).disabled = busy;
  $('[data-action="reset"]', card).disabled = busy;
  if (app.runner?.missing) { $(".detail", card).textContent = `Missing stack file ${app.runner.file}`; card.dataset.status = "error"; }
  card.hidden = !matchesFilter(app);
}

function renderApps() {
  const seen = new Set();
  for (const app of state.apps) {
    seen.add(app.folder);
    const card = cardFor(app);
    updateCard(app);
    if (card.parentElement !== els.grid) els.grid.appendChild(card);
  }
  for (const [folder, card] of cards) if (!seen.has(folder)) { card.remove(); cards.delete(folder); }
  renderSummary();
}

function renderJobs() {
  els.jobCount.textContent = state.jobs.length ? `${state.jobs.filter((j) => j.state === "running").length} running · ${state.jobs.length} total` : "no jobs yet";
  els.jobs.innerHTML = state.jobs
    .map((j) => `<li data-id="${j.id}" data-state="${j.state}" class="${j.id === state.selectedJob ? "selected" : ""}">
        <span class="dot"></span>
        <span><strong>${esc(j.action)}</strong> ${esc(j.app)}${j.code !== null && j.code !== 0 ? ` <span style="color:var(--danger)">(exit ${j.code})</span>` : ""}</span>
        <span class="when">${fmtTime(j.startedAt || j.createdAt)}</span></li>`)
    .join("");
}

async function selectJob(id) {
  state.selectedJob = id;
  renderJobs();
  try {
    const job = await api(`/api/jobs/${id}`);
    els.console.textContent = job.lines.join("\n");
    els.console.scrollTop = els.console.scrollHeight;
  } catch (err) { toast(err.message, "error"); }
}

/* ---------- actions ---------- */
async function act(app, action) {
  if (action === "reset" && !confirm(`Reset ${app.title}?\n\nThis runs "docker compose down -v" and DELETES the app's data volumes.`)) return;
  try {
    const { job } = await api(`/api/apps/${app.folder}/${action}`, { method: "POST" });
    toast(`${action} queued for ${app.folder} (job ${job.id})`, "ok", 2500);
    selectJob(job.id);
    $("#activity").classList.remove("collapsed");
  } catch (err) { toast(err.message, "error"); }
}

async function showLogs(app) {
  els.dialogTitle.textContent = `Logs · ${app.folder}`;
  els.dialogBody.innerHTML = `<p class="muted">Loading last 300 lines…</p>`;
  els.dialog.showModal();
  try {
    const text = await api(`/api/apps/${app.folder}/logs?tail=300`);
    els.dialogBody.innerHTML = `<pre class="console" style="max-height:60vh">${esc(text || "(no output)")}</pre>`;
    const pre = $("pre", els.dialogBody); pre.scrollTop = pre.scrollHeight;
  } catch (err) { els.dialogBody.innerHTML = `<p style="color:var(--danger)">${esc(err.message)}</p>`; }
}

function table(rows, cols) {
  if (!rows?.length) return `<p class="muted">—</p>`;
  return `<table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${cols.map((c) => `<td>${r[c] === undefined || r[c] === null ? "" : typeof r[c] === "string" && /pass|secret|token/i.test(c) ? `<button class="copy" data-copy="${esc(r[c])}" title="Copy">${esc(r[c])}</button>` : esc(String(r[c]))}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function showDetails(app) {
  els.dialogTitle.textContent = `${app.title}`;
  const routes = Object.entries(app.routes || {}).map(([k, v]) => ({ group: k, paths: (v || []).join(", ") }));
  els.dialogBody.innerHTML = `
    <p>${esc(app.description)}</p>
    <p class="muted">Folder <code>${esc(app.folder)}</code> · kind <code>${esc(app.kind)}</code> · runtime <code>${esc(app.runtime)}</code> · compose project <code>${esc(app.project)}</code> · runner <code>${esc(app.runner.mode)}</code> (<code>${esc(app.runner.file)}</code>)</p>
    <h4>Open</h4><p>${app.urls.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`).join(" · ")} · health <code>${esc(app.healthcheck.path)}</code> → ${esc(app.healthcheck.expect_status)}</p>
    <h4>Auth</h4><p><code>${esc(app.auth?.model)}</code> — ${esc(app.auth?.description || "")}</p>
    <h4>Default credentials</h4>${table(app.credentials, ["role", "username", "password"])}
    ${app.setup ? `<h4>Post-start setup</h4><p><code>${esc(app.setup.command)}</code><br><span class="muted">${esc(app.setup.hint || "")}</span></p>` : ""}
    <h4>Routes</h4>${table(routes, ["group", "paths"])}
    <h4>Environment variables</h4>${table(app.env, ["name", "required", "default", "description"])}
    <h4>Persistence</h4><p>${esc(app.persistence || "—")}</p>
    <h4>Notes for deployment</h4><p style="white-space:pre-wrap">${esc(app.notes || "—")}</p>
    <h4>Stack</h4><p>${(app.stack || []).map((s) => `<span class="tag">${esc(s)}</span>`).join(" ")}</p>`;
  els.dialog.showModal();
}

async function showReadme(app) {
  els.dialogTitle.textContent = `README · ${app.folder}`;
  els.dialogBody.innerHTML = `<p class="muted">Loading…</p>`;
  els.dialog.showModal();
  try {
    const md = await api(`/api/apps/${app.folder}/readme`);
    els.dialogBody.innerHTML = window.marked ? `<div class="markdown">${window.marked.parse(md)}</div>` : `<pre class="console">${esc(md)}</pre>`;
  } catch (err) { els.dialogBody.innerHTML = `<p style="color:var(--danger)">${esc(err.message)}</p>`; }
}

function onCardClick(e) {
  const card = e.currentTarget;
  const app = state.apps.find((a) => a.folder === card.dataset.folder);
  const btn = e.target.closest("button");
  document.querySelectorAll(".menu.open").forEach((m) => { if (!m.contains(e.target) && !m.previousElementSibling.contains(e.target)) m.classList.remove("open"); });
  if (!btn) return;
  if (btn.classList.contains("more-btn")) { btn.nextElementSibling.classList.toggle("open"); return; }
  if (btn.dataset.action) { btn.closest(".menu")?.classList.remove("open"); return act(app, btn.dataset.action); }
  if (btn.classList.contains("logs")) return showLogs(app);
  if (btn.classList.contains("details")) return showDetails(app);
  if (btn.classList.contains("readme")) { btn.closest(".menu")?.classList.remove("open"); return showReadme(app); }
}

/* ---------- events (SSE) ---------- */
function connect() {
  const url = state.token ? `/api/events?token=${encodeURIComponent(state.token)}` : "/api/events";
  const es = new EventSource(url);
  es.addEventListener("apps", (e) => {
    const data = JSON.parse(e.data);
    state.apps = data.apps;
    els.banner.hidden = !data.dockerError;
    if (data.dockerError) els.banner.textContent = `Docker is not reachable: ${data.dockerError}`;
    renderApps();
  });
  es.addEventListener("jobs", (e) => { state.jobs = JSON.parse(e.data); renderJobs(); });
  es.addEventListener("job", (e) => {
    const job = JSON.parse(e.data);
    const idx = state.jobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) state.jobs[idx] = job; else state.jobs.unshift(job);
    if (job.state === "done" || job.state === "failed") toast(`${job.action} ${job.app}: ${job.state}${job.code ? ` (exit ${job.code})` : ""}`, job.state === "done" ? "ok" : "error");
    renderJobs();
  });
  es.addEventListener("log", (e) => {
    const { job, line } = JSON.parse(e.data);
    if (job !== state.selectedJob) return;
    const stick = els.console.scrollHeight - els.console.scrollTop - els.console.clientHeight < 40;
    els.console.textContent += (els.console.textContent ? "\n" : "") + line;
    if (stick) els.console.scrollTop = els.console.scrollHeight;
  });
  es.onerror = () => { es.close(); setTimeout(connect, 3000); };
}

/* ---------- bootstrap ---------- */
async function init() {
  try {
    const s = await api("/api/state");
    els.root.textContent = `${s.root} · docker ${s.docker.ok ? s.docker.version : "unavailable"} · ${s.buildConcurrency} parallel builds`;
    state.apps = s.apps; state.jobs = s.jobs;
    renderApps(); renderJobs();
    if (!s.docker.ok) { els.banner.hidden = false; els.banner.textContent = `Docker is not reachable: ${s.docker.error}`; }
  } catch (err) { toast(`Cannot reach panel API: ${err.message}`, "error", 8000); }
  connect();
}
[els.search, els.kind, els.onlyRunning].forEach((el) => el.addEventListener("input", renderApps));
$("#startAll").addEventListener("click", async () => {
  const visible = state.apps.filter(matchesFilter).map((a) => a.folder);
  if (!confirm(`Start ${visible.length} app(s)? First builds can take several minutes (Strapi, Spring Boot, .NET, Laravel).`)) return;
  try { const r = await api("/api/all/start", { method: "POST", body: JSON.stringify({ folders: visible }) }); toast(`${r.started.length} start job(s) queued`, "ok"); $("#activity").classList.remove("collapsed"); } catch (err) { toast(err.message, "error"); }
});
$("#stopAll").addEventListener("click", async () => {
  const visible = state.apps.filter(matchesFilter).map((a) => a.folder);
  if (!confirm(`Stop ${visible.length} app(s)? (docker compose down – data volumes are kept)`)) return;
  try { const r = await api("/api/all/stop", { method: "POST", body: JSON.stringify({ folders: visible }) }); toast(`${r.started.length} stop job(s) queued`, "ok"); } catch (err) { toast(err.message, "error"); }
});
$("#toggleActivity").addEventListener("click", (e) => { const a = $("#activity"); a.classList.toggle("collapsed"); e.target.textContent = a.classList.contains("collapsed") ? "▴" : "▾"; });
els.jobs.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) selectJob(li.dataset.id); });
$("#dialogClose").addEventListener("click", () => els.dialog.close());
els.dialog.addEventListener("click", (e) => { if (e.target === els.dialog) els.dialog.close(); });
els.dialogBody.addEventListener("click", (e) => { const b = e.target.closest(".copy"); if (b) { navigator.clipboard?.writeText(b.dataset.copy); toast("Copied", "ok", 1200); } });
document.addEventListener("click", (e) => { if (!e.target.closest(".more")) document.querySelectorAll(".menu.open").forEach((m) => m.classList.remove("open")); });
init();
