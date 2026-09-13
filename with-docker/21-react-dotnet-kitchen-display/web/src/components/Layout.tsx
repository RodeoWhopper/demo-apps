import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import LiveDot from "./LiveDot";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition ${isActive ? "bg-coal-700 text-white" : "text-zinc-400 hover:bg-coal-800 hover:text-zinc-100"}`;

export default function Layout() {
  const { status, user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-coal-700 bg-coal-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link to="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
            <img src="/kds.svg" alt="" className="h-7 w-7" />
            Ocakbaşı <span className="text-ember-400">KDS</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Board
            </NavLink>
            <NavLink to="/order/M1" className={linkClass}>
              Order (table M1)
            </NavLink>
            {hasRole("Staff", "Admin") && (
              <NavLink to="/kitchen" className={linkClass}>
                Kitchen
              </NavLink>
            )}
            {hasRole("Admin") && (
              <>
                <NavLink to="/admin/menu" className={linkClass}>
                  Menu
                </NavLink>
                <NavLink to="/admin/users" className={linkClass}>
                  Users
                </NavLink>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <LiveDot />
            {status === "authed" && user ? (
              <>
                <span className="hidden text-xs text-zinc-400 sm:inline">
                  {user.email} · <span className="text-ember-300">{user.role}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-1 text-xs"
                  onClick={() => void logout().then(() => navigate("/"))}
                >
                  Sign out
                </button>
              </>
            ) : (
              <NavLink to="/login" className={linkClass}>
                Staff sign in
              </NavLink>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
