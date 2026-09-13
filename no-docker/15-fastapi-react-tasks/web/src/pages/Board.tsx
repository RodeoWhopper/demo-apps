import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import TaskCard from "../components/TaskCard";
import Spinner from "../components/Spinner";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { NEXT_STATUS, STATUSES, STATUS_LABEL, type Project, type Status, type Task } from "../lib/types";

export default function Board() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");

  const load = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([api<Task[]>("/tasks", { token }), api<Project[]>("/projects", { token })]);
      setTasks(t);
      setProjects(p);
      if (p.length && projectId === "") setProjectId(p[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [token, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // Optimistic status change: update the UI first, PATCH, and roll back on failure.
  const setStatus = useCallback(
    async (task: Task, status: Status) => {
      setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, status } : t)) ?? prev);
      try {
        const saved = await api<Task>(`/tasks/${task.id}`, { method: "PATCH", token, body: { status } });
        setTasks((prev) => prev?.map((t) => (t.id === task.id ? saved : t)) ?? prev);
      } catch (err) {
        setTasks((prev) => prev?.map((t) => (t.id === task.id ? task : t)) ?? prev);
        setError(err instanceof Error ? err.message : "Update failed");
      }
    },
    [token],
  );

  async function createTask(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || projectId === "") return;
    try {
      const created = await api<Task>("/tasks", { method: "POST", token, body: { title: title.trim(), project_id: projectId, priority } });
      setTasks((prev) => [...(prev ?? []), created]);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function deleteTask(task: Task) {
    const snapshot = tasks;
    setTasks((prev) => prev?.filter((t) => t.id !== task.id) ?? prev);
    try {
      await api<void>(`/tasks/${task.id}`, { method: "DELETE", token });
    } catch (err) {
      setTasks(snapshot);
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (error && !tasks) return <p className="text-rose-300">{error}</p>;
  if (!tasks) return <Spinner label="Loading board" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Task board</h1>
          <p className="text-sm text-slate-400">{tasks.length} tasks across {projects.length} projects. Tick a box or move a card; changes apply instantly and sync in the background.</p>
        </div>
        <div className="flex gap-2">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="rounded-md border border-space-700 px-3 py-1.5 text-sm hover:bg-space-800">
              <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              {p.name} <span className="text-slate-500">{p.task_counts.total}</span>
            </Link>
          ))}
        </div>
      </div>

      <form onSubmit={createTask} className="flex flex-wrap gap-2 rounded-lg border border-space-700 bg-space-800/60 p-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task title" required
          className="min-w-[14rem] flex-1 rounded-md border border-space-700 bg-space-900 px-3 py-2 text-sm text-white outline-none focus:border-orbit-500" />
        <select value={projectId} onChange={(e) => setProjectId(Number(e.target.value))} className="rounded-md border border-space-700 bg-space-900 px-3 py-2 text-sm text-white">
          {projects.map((p) => <option key={p.id} value={p.id}>{p.key} - {p.name}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])} className="rounded-md border border-space-700 bg-space-900 px-3 py-2 text-sm text-white">
          <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
        </select>
        <button className="rounded-md bg-comet-400 px-4 py-2 text-sm font-medium text-space-950 hover:brightness-110">Add task</button>
      </form>

      {error && (
        <p className="rounded-md bg-rose-500/15 px-3 py-2 text-sm text-rose-300 flex justify-between">
          {error} <button onClick={() => setError(null)} className="underline">dismiss</button>
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((status) => {
          const column = tasks.filter((t) => t.status === status);
          return (
            <section key={status} className="rounded-xl border border-space-700/70 bg-space-900/60 p-3">
              <header className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{STATUS_LABEL[status]}</h2>
                <span className="rounded-full bg-space-700 px-2 py-0.5 text-xs text-slate-300">{column.length}</span>
              </header>
              <div className="space-y-3">
                {column.map((task) => (
                  <TaskCard key={task.id} task={task} project={projectById.get(task.project_id)}
                    onAdvance={(t) => setStatus(t, NEXT_STATUS[t.status])}
                    onToggleDone={(t) => setStatus(t, t.status === "done" ? "todo" : "done")}
                    onDelete={deleteTask} />
                ))}
                {column.length === 0 && <p className="px-1 py-6 text-center text-xs text-slate-600">Nothing here.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
