import Link from "next/link";
import { Logo } from "./Logo";
import { getSession } from "@/lib/session";

export async function SiteHeader() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo dark />
        <nav className="flex items-center gap-6 text-sm text-slate-300">
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/api/health" className="hidden hover:text-white sm:inline">Status</Link>
          {session ? (
            <Link href="/dashboard" className="rounded-full bg-lime-400 px-4 py-1.5 font-medium text-slate-900 hover:bg-lime-300">
              Open dashboard
            </Link>
          ) : (
            <Link href="/login" className="rounded-full bg-white px-4 py-1.5 font-medium text-slate-900 hover:bg-slate-200">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
