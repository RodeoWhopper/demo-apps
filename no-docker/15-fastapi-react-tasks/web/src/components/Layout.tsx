import { NavLink, Outlet } from "react-router";
import { useAuth } from "../lib/auth";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm transition ${isActive ? "bg-space-700 text-white" : "text-slate-300 hover:text-white hover:bg-space-800"}`;

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-space-700/70 bg-space-900/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight text-white">
            <span className="relative inline-flex h-6 w-6 items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-orbit-500 -rotate-12 scale-x-125" />
              <span className="h-2.5 w-2.5 rounded-full bg-comet-400" />
            </span>
            Orbit Tasks
          </NavLink>
          <nav className="flex items-center gap-1 ml-4">
            <NavLink to="/" end className={linkClass}>Board</NavLink>
            {user?.role === "admin" && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {user && (
              <span className="hidden sm:inline text-slate-300">
                {user.name} <span className="ml-1 rounded bg-space-700 px-1.5 py-0.5 text-xs uppercase tracking-wide text-orbit-400">{user.role}</span>
              </span>
            )}
            <button onClick={logout} className="rounded-md border border-space-700 px-3 py-1.5 text-slate-200 hover:bg-space-800">Log out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 flex-1">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-slate-500 py-6">Orbit Tasks - FastAPI + React demo. No tracking, no external calls except the API.</footer>
    </div>
  );
}
