import { useCallback, useEffect, useState, type FormEvent } from "react";
import ErrorBanner from "../components/ErrorBanner";
import Spinner from "../components/Spinner";
import { errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Role, User } from "../lib/types";

export default function AdminUsers() {
  const { authFetch, user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ email: string; password: string; role: Role }>({ email: "", password: "", role: "Staff" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await authFetch<User[]>("/api/users"));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authFetch<User>("/api/users", { json: form });
      setForm({ email: "", password: "", role: "Staff" });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u: User) => {
    if (!window.confirm(`Delete ${u.email}?`)) return;
    setError(null);
    try {
      await authFetch<void>(`/api/users/${u.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (users === null && !error) return <Spinner label="Loading users…" />;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-2xl font-black">Staff accounts</h1>
        <p className="text-sm text-zinc-400">Admin manages menu and users; Staff works the kitchen queue.</p>
        <div className="mt-4">
          <ErrorBanner messages={error} onDismiss={() => setError(null)} />
        </div>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-head bg-coal-900">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-coal-700">
              {(users ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-mono">
                    {u.email} {u.id === me?.id && <span className="text-xs text-zinc-500">(you)</span>}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === "Admin" ? "bg-ember-500/15 text-ember-300" : "bg-sky-500/15 text-sky-300"}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-2 text-zinc-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" className="btn btn-danger px-2 py-1 text-xs" disabled={u.id === me?.id} onClick={() => void remove(u)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={(e) => void submit(e)} className="card h-fit space-y-3 p-4 lg:sticky lg:top-16">
        <h2 className="text-lg font-bold">New account</h2>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password (min 8)
          </label>
          <input id="password" className="input" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="role">
            Role
          </label>
          <select id="role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="Staff">Staff</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          Create account
        </button>
      </form>
    </div>
  );
}
