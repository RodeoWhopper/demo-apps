import { Link } from "react-router";
import type { Project, Task } from "../lib/types";
import { NEXT_STATUS, STATUS_LABEL } from "../lib/types";

const priorityClass: Record<Task["priority"], string> = {
  high: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  medium: "bg-flare-400/15 text-amber-300 border-amber-400/30",
  low: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

interface Props {
  task: Task;
  project?: Project;
  onAdvance: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onDelete?: (task: Task) => void;
  showProject?: boolean;
}

export default function TaskCard({ task, project, onAdvance, onToggleDone, onDelete, showProject = true }: Props) {
  const done = task.status === "done";
  return (
    <article className={`rounded-lg border border-space-700 bg-space-800/80 p-3 shadow-sm transition ${done ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          aria-label={done ? "Mark as to do" : "Mark as done"}
          checked={done}
          onChange={() => onToggleDone(task)}
          className="mt-1 h-4 w-4 accent-comet-400 cursor-pointer"
        />
        <div className="min-w-0 flex-1">
          <h3 className={`font-medium leading-snug ${done ? "line-through text-slate-400" : "text-white"}`}>{task.title}</h3>
          {task.description && <p className="mt-1 text-sm text-slate-400 line-clamp-2">{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded border px-1.5 py-0.5 ${priorityClass[task.priority]}`}>{task.priority}</span>
            {showProject && project && (
              <Link to={`/projects/${project.id}`} className="rounded px-1.5 py-0.5 text-space-950 font-semibold" style={{ background: project.color }}>
                {project.key}
              </Link>
            )}
            {task.assignee && <span className="text-slate-400">@{task.assignee.name.split(" ")[0]}</span>}
            {task.due_date && <span className="text-slate-500">due {task.due_date}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => onAdvance(task)} className="rounded-md bg-orbit-500/20 px-2.5 py-1 text-xs text-orbit-400 hover:bg-orbit-500/30">
          Move to {STATUS_LABEL[NEXT_STATUS[task.status]]} &rarr;
        </button>
        {onDelete && (
          <button onClick={() => onDelete(task)} className="ml-auto text-xs text-slate-500 hover:text-rose-300">
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
