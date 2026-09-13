import Link from "next/link";
import type { Metadata } from "next";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Sparkline } from "@/components/Sparkline";
import { listProjects } from "@/lib/db";
import { fmtInt, fmtPct, fmtUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = listProjects();
  const active = projects.filter((p) => p.status === "active");
  const visitors = projects.reduce((s, p) => s + p.metrics.visitors, 0);
  const conversions = projects.reduce((s, p) => s + p.metrics.conversions, 0);
  const revenue = projects.reduce((s, p) => s + p.metrics.revenue, 0);
  const bounce = active.reduce((s, p) => s + p.metrics.bounceRate, 0) / Math.max(active.length, 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-slate-500">Aggregated across {projects.length} projects · last 30 days (seeded data)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Visitors" value={fmtInt(visitors)} hint="unique sessions" accent="violet" />
        <MetricCard label="Conversions" value={fmtInt(conversions)} hint={`${fmtPct((conversions / visitors) * 100)} conversion rate`} accent="lime" />
        <MetricCard label="Revenue" value={fmtUsd(revenue)} hint="attributed" accent="sky" />
        <MetricCard label="Avg. bounce" value={fmtPct(bounce)} hint="active projects only" accent="amber" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Projects</h2>
          <span className="text-xs text-slate-500">{active.length} active</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Project</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3 text-right">Visitors</th>
                <th className="px-5 py-3 text-right">Conversions</th>
                <th className="px-5 py-3 text-right">Revenue</th>
                <th className="px-5 py-3">7-day trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/projects/${p.id}`} className="font-medium text-violet-700 hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500">{p.domain}</p>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-3 capitalize text-slate-600">{p.plan}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmtInt(p.metrics.visitors)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmtInt(p.metrics.conversions)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmtUsd(p.metrics.revenue)}</td>
                  <td className="px-5 py-3 text-violet-500"><Sparkline data={p.trend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
