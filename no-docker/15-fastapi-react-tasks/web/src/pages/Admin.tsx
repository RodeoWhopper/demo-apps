import { useEffect, useState } from "react";
import Spinner from "../components/Spinner";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { User } from "../lib/types";

export default function Admin() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<User[]>("/admin/users", { token }).then(setUsers).catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [token]);

  async function toggle(u: User) {
    try {
      const updated = await api<User>(`/admin/users/${u.id}/toggle-active`, { method: "POST", token });
      setUsers((prev) => prev?.map((x) => (x.id === u.id ? updated : x)) ?? prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  if (error) return <p className="text-rose-300">{error}</p>;
  if (!users) return <Spinner label="Loading users" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Admin - users</h1>
        <p className="text-sm text-slate-400">Deactivated users cannot sign in and their existing tokens are rejected (403).</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-space-700">
        <table className="w-full text-sm">
          <thead className="bg-space-800 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Open tasks</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-space-700">
            {users.map((u) => (
              <tr key={u.id} className="bg-space-900/50">
                <td className="px-4 py-3"><div className="text-white">{u.name}</div><div className="text-xs text-slate-500">{u.email}</div></td>
                <td className="px-4 py-3"><span className="rounded bg-space-700 px-1.5 py-0.5 text-xs uppercase text-orbit-400">{u.role}</span></td>
                <td className="px-4 py-3 text-slate-300">{u.assigned_open_tasks ?? 0}</td>
                <td className="px-4 py-3">{u.is_active ? <span className="text-comet-400">active</span> : <span className="text-rose-300">deactivated</span>}</td>
                <td className="px-4 py-3 text-right">
                  <button disabled={u.id === me?.id} onClick={() => toggle(u)}
                    className="rounded-md border border-space-700 px-3 py-1 text-xs hover:bg-space-800 disabled:opacity-40">
                    {u.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
