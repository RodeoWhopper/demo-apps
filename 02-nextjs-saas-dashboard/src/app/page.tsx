import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const features = [
  { title: "Real-time funnels", body: "Watch sign-ups move through activation in seconds, not tomorrow's batch job." },
  { title: "Cookie-less tracking", body: "Privacy-first collection that never fingerprints your users or needs a banner." },
  { title: "Role-aware workspaces", body: "Members explore data; admins manage people. Enforced server-side with signed JWT cookies." },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.35),transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> Now with role-based admin
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Product analytics that respects your users <span className="text-lime-400">and</span> your on-call rota.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">
              Lumeo turns raw page views into revenue insight for eight fictional projects. Sign in to explore a
              seeded dashboard, drill into project metrics and manage team roles.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/login" className="rounded-full bg-lime-400 px-6 py-3 font-semibold text-slate-900 hover:bg-lime-300">
                Sign in to the demo
              </Link>
              <Link href="/pricing" className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10">
                See pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{f.body}</p>
              </div>
            ))}
          </div>
          <dl className="mt-16 grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
            {[
              ["8", "seeded projects"],
              ["3", "team members"],
              ["HS256", "signed session JWT"],
              ["0", "third-party trackers"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="text-3xl font-semibold text-lime-400">{v}</dt>
                <dd className="text-sm text-slate-400">{l}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
