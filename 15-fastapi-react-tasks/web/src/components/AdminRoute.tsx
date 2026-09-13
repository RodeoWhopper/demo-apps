import { Outlet } from "react-router";
import { useAuth } from "../lib/auth";
import Forbidden from "../pages/Forbidden";

// Client-side gate for /admin; the API enforces the role server-side as well.
export default function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Forbidden />;
  return <Outlet />;
}
