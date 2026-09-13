import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/types";
import Spinner from "./Spinner";

/** Client-side mirror of the server policies: anonymous -> /login?next=, wrong role -> 403 page. */
export default function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") return <Spinner label="Restoring session…" />;
  if (status === "anon" || !user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (!roles.includes(user.role)) return <Forbidden role={user.role} needed={roles} />;
  return <>{children}</>;
}

function Forbidden({ role, needed }: { role: Role; needed: Role[] }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-mono text-6xl font-black text-ember-500">403</p>
      <h1 className="mt-4 text-2xl font-bold">Not allowed</h1>
      <p className="mt-2 text-zinc-400">
        You are signed in as <span className="text-zinc-200">{role}</span>; this page needs {needed.join(" or ")}.
      </p>
      <Link to="/" className="btn btn-ghost mt-6">
        Back to the board
      </Link>
    </div>
  );
}
