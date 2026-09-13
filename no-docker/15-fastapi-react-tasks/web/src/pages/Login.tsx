import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import { API_URL } from "../lib/api";

export default function Login() {
  const { token, login } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [email, setEmail] = useState("dev@orbit.dev");
  const [password, setPassword] = useState("Dev123!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 relative h-16 w-16">
            <span className="absolute inset-0 rounded-full border-[3px] border-orbit-500 -rotate-12 scale-x-125" />
            <span className="absolute inset-4 rounded-full bg-comet-400" />
            <span className="absolute right-0 top-1 h-3 w-3 rounded-full bg-flare-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Orbit Tasks</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in with the OAuth2 password flow.</p>
        </div>
        <form onSubmit={onSubmit} className="rounded-xl border border-space-700 bg-space-800/80 p-6 shadow-xl space-y-4">
          <label className="block text-sm">
            <span className="text-slate-300">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" required
              className="mt-1 w-full rounded-md border border-space-700 bg-space-900 px-3 py-2 text-white outline-none focus:border-orbit-500" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Password</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required
              className="mt-1 w-full rounded-md border border-space-700 bg-space-900 px-3 py-2 text-white outline-none focus:border-orbit-500" />
          </label>
          {error && <p className="rounded-md bg-rose-500/15 px-3 py-2 text-sm text-rose-300">{error}</p>}
          <button disabled={busy} className="w-full rounded-md bg-orbit-500 py-2 font-medium text-white hover:bg-orbit-400 disabled:opacity-60">
            {busy ? "Signing in..." : "Sign in"}
          </button>
          <p className="text-xs text-slate-500">
            Demo: <code>dev@orbit.dev / Dev123!</code> (member) or <code>admin@orbit.dev / Admin123!</code> (admin).
          </p>
          <p className="text-[11px] text-slate-600">API: {API_URL}</p>
        </form>
      </div>
    </div>
  );
}
