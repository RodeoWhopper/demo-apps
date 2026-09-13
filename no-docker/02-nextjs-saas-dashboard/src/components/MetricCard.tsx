export function MetricCard({ label, value, hint, accent = "violet" }: { label: string; value: string; hint?: string; accent?: "violet" | "lime" | "sky" | "amber" }) {
  const bar = { violet: "bg-violet-500", lime: "bg-lime-500", sky: "bg-sky-500", amber: "bg-amber-500" }[accent];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${bar}`} />
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
