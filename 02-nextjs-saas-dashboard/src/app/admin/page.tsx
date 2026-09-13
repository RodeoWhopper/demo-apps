import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { toggleRoleAction } from "@/lib/actions";
import { listUsers } from "@/lib/db";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await getSession();
  const users = listUsers();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">Admin</span>
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">← Dashboard</Link>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Team members</h1>
        <p className="text-sm text-slate-500">Toggle roles with a Server Action. Changes are written to data/db.json.</p>

        {error === "self" && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
            You cannot change your own role.
          </p>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3 font-medium">{u.name}{u.id === session?.sub && <span className="ml-2 text-xs text-slate-400">(you)</span>}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${u.role === "admin" ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={toggleRoleAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="role" value={u.role} />
                      <button
                        type="submit"
                        disabled={u.id === session?.sub}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {u.role === "admin" ? "Demote to member" : "Promote to admin"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
