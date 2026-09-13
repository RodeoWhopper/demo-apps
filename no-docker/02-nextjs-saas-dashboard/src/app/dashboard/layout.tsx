import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { getSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-5 text-sm text-slate-600 sm:flex">
              <Link href="/dashboard" className="hover:text-slate-900">Overview</Link>
              <Link href="/api/projects" className="hover:text-slate-900">Projects API</Link>
              {session?.role === "admin" && (
                <Link href="/admin" className="rounded-full bg-violet-50 px-3 py-1 text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100">
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs leading-tight">
              <p className="font-medium text-slate-800">{session?.name}</p>
              <p className="text-slate-500">{session?.email} · {session?.role}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
