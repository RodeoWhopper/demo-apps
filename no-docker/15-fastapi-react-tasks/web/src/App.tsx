import { createBrowserRouter, RouterProvider } from "react-router";
import { AuthProvider } from "./lib/auth";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Login from "./pages/Login";
import Board from "./pages/Board";
import ProjectPage from "./pages/ProjectPage";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/", element: <Board /> },
          { path: "/projects/:id", element: <ProjectPage /> },
          { element: <AdminRoute />, children: [{ path: "/admin", element: <Admin /> }] },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
