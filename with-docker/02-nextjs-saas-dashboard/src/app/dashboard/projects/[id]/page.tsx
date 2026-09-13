import Link from "next/link";
import { notFound } from "next/navigation";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { getProject } from "@/lib/db";
import { fmtInt, fmtPct, fmtUsd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: getProject(id)?.name ?? "Project" };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const max = Math.max(...project.trend, 1);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const convRate = (project.metrics.conversions / Math.max(project.metrics.visitors, 1)) * 100;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-violet-700 hover:underline">← All projects</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <StatusBadge status={project.status} />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">{project.plan} plan</span>
        </div>
        <p className="text-sm text-slate-500">
          {project.domain} · owned by {project.owner} · id <code>{project.id}</code>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Visitors" value={fmtInt(project.metrics.visitors)} accent="violet" />
        <MetricCard label="Conversions" value={fmtInt(project.metrics.conversions)} hint={`${fmtPct(convRate)} rate`} accent="lime" />
        <MetricCard label="Revenue" value={fmtUsd(project.metrics.revenue)} accent="sky" />
        <MetricCard label="Bounce rate" value={fmtPct(project.metrics.bounceRate)} accent="amber" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Visitors · last 7 days</h2>
        <div className="mt-6 flex h-48 items-end gap-3">
          {project.trend.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs tabular-nums text-slate-500">{fmtInt(v)}</span>
              <div className="w-full rounded-t-md bg-violet-500/80" style={{ height: `${Math.max((v / max) * 100, 2)}%` }} />
              <span className="text-xs text-slate-500">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
