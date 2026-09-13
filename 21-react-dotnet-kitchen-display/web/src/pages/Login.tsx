import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ErrorBanner from "../components/ErrorBanner";
import { errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { User } from "../lib/types";

const DEMO = [
  { email: "admin@ocakbasi.dev", password: "Admin123!", role: "Admin" },
  { email: "sef@ocakbasi.dev", password: "Sef123!", role: "Staff" },
];

function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

const homeFor = (user: User | null) => (user?.role === "Admin" ? "/admin/menu" : "/kitchen");

export default function Login() {
  const { status, user, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authed") navigate(next ?? homeFor(user), { replace: true });
  }, [status, user, next, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const signedIn = await login(email, password);
      navigate(next ?? homeFor(signedIn), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-black">Staff sign in</h1>
      <p className="mt-1 text-sm text-zinc-400">Kitchen and admin screens need an account. Customers order without signing in.</p>

      <form onSubmit={(e) => void submit(e)} className="card mt-6 space-y-4 p-5">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <ErrorBanner messages={error} onDismiss={() => setError(null)} />
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 text-sm">
        <p className="mb-2 text-zinc-500">Demo accounts</p>
        <ul className="space-y-1">
          {DEMO.map((d) => (
            <li key={d.email} className="flex items-center justify-between rounded-lg bg-coal-800 px-3 py-2">
              <span>
                <span className="font-mono">{d.email}</span> <span className="text-zinc-500">/ {d.password}</span>{" "}
                <span className="text-ember-300">{d.role}</span>
              </span>
              <button
                type="button"
                className="btn btn-ghost px-2 py-1 text-xs"
                onClick={() => {
                  setEmail(d.email);
                  setPassword(d.password);
                }}
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
