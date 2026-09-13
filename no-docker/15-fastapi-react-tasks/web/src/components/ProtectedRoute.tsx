import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import Spinner from "./Spinner";

// Wraps every authenticated route: unauthenticated visitors are redirected to /login
// and sent back to where they were after signing in.
export default function ProtectedRoute() {
  const { token, user, loading } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (loading || !user) return <Spinner label="Checking your session" />;
  return <Outlet />;
}
