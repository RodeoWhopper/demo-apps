import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import Spinner from "../components/Spinner";
import TaskCard from "../components/TaskCard";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { NEXT_STATUS, STATUSES, STATUS_LABEL, type ProjectDetail, type Status, type Task } from "../lib/types";

export default function ProjectPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProject(await api<ProjectDetail>(`/projects/${id}`, { token }));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "Project not found." : err instanceof Error ? err.message : "Failed");
    }
  }, [id, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(task: Task, status: Status) {
    setProject((p) => (p ? { ...p, tasks: p.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)) } : p));
    try {
      const saved = await api<Task>(`/tasks/${task.id}`, { method: "PATCH", token, body: { status } });
      setProject((p) => (p ? { ...p, tasks: p.tasks.map((t) => (t.id === task.id ? saved : t)) } : p));
    } catch (err) {
      setProject((p) => (p ? { ...p, tasks: p.tasks.map((t) => (t.id === task.id ? task : t)) } : p));
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (error) return <div className="space-y-3"><p className="text-rose-300">{error}</p><Link to="/" className="text-orbit-400 underline">Back to board</Link></div>;
  if (!project) return <Spinner label="Loading project" />;

  const total = project.tasks.length;
  const done = project.tasks.filter((t) => t.status === "done").length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-slate-400 hover:text-white">&larr; Board</Link>
      <header className="rounded-xl border border-space-700 bg-space-800/70 p-6">
        <div className="flex items-center gap-3">
          <span className="rounded px-2 py-0.5 text-sm font-bold text-space-950" style={{ background: project.color }}>{project.key}</span>
          <h1 className="text-2xl font-semibold text-white">{project.name}</h1>
        </div>
        <p className="mt-2 text-slate-400">{project.description}</p>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400"><span>{done} of {total} done</span><span>{pct}%</span></div>
          <div className="mt-1 h-2 rounded-full bg-space-700"><div className="h-2 rounded-full bg-comet-400 transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((status) => (
          <section key={status} className="rounded-xl border border-space-700/70 bg-space-900/60 p-3">
            <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-slate-300">{STATUS_LABEL[status]}</h2>
            <div className="space-y-3">
              {project.tasks.filter((t) => t.status === status).map((task) => (
                <TaskCard key={task.id} task={task} showProject={false}
                  onAdvance={(t) => setStatus(t, NEXT_STATUS[t.status])}
                  onToggleDone={(t) => setStatus(t, t.status === "done" ? "todo" : "done")} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
