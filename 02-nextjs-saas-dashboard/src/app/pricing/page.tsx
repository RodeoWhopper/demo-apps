import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Pricing" };

const tiers = [
  { name: "Starter", price: "$0", blurb: "For side projects and prototypes.", perks: ["1 project", "50k events / month", "7-day retention"] },
  { name: "Growth", price: "$49", blurb: "For teams shipping every week.", perks: ["10 projects", "2M events / month", "90-day retention", "Funnels & cohorts"], featured: true },
  { name: "Scale", price: "$249", blurb: "For products with real traffic.", perks: ["Unlimited projects", "50M events / month", "2-year retention", "SSO & audit log"] },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-20">
        <h1 className="text-center text-4xl font-semibold tracking-tight">Simple, usage-based pricing</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-slate-300">
          Every plan includes the same privacy guarantees. Prices are fictional - this is a demo.
        </p>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl border p-8 ${t.featured ? "border-lime-400 bg-lime-400/5 shadow-lg shadow-lime-400/10" : "border-white/10 bg-white/5"}`}
            >
              <h2 className="text-lg font-semibold">{t.name}</h2>
              <p className="mt-1 text-sm text-slate-400">{t.blurb}</p>
              <p className="mt-6 text-4xl font-semibold">
                {t.price}
                <span className="text-base font-normal text-slate-400"> / month</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> {p}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`mt-8 block rounded-full px-4 py-2 text-center text-sm font-semibold ${t.featured ? "bg-lime-400 text-slate-900 hover:bg-lime-300" : "bg-white/10 text-white hover:bg-white/20"}`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
