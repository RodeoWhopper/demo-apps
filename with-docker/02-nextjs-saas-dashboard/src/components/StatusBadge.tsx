import type { ProjectStatus } from "@/lib/db";

const styles: Record<ProjectStatus, string> = {
  active: "bg-lime-100 text-lime-800 ring-lime-600/20",
  paused: "bg-amber-100 text-amber-800 ring-amber-600/20",
  archived: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
