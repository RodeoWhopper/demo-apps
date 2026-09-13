import { createBrowserRouter, RouterProvider } from "react-router";
import Layout from "./components/Layout";
import RequireRole from "./components/RequireRole";
import { AuthProvider } from "./lib/auth";
import { HubProvider } from "./lib/hub";
import AdminMenu from "./pages/AdminMenu";
import AdminUsers from "./pages/AdminUsers";
import Board from "./pages/Board";
import Kitchen from "./pages/Kitchen";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import OrderPage from "./pages/OrderPage";

// React Router in library mode; the server answers every non-/api, non-/hubs path with index.html.
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Board /> },
      { path: "order/:tableCode", element: <OrderPage /> },
      { path: "login", element: <Login /> },
      {
        path: "kitchen",
        element: (
          <RequireRole roles={["Staff", "Admin"]}>
            <Kitchen />
          </RequireRole>
        ),
      },
      {
        path: "admin/menu",
        element: (
          <RequireRole roles={["Admin"]}>
            <AdminMenu />
          </RequireRole>
        ),
      },
      {
        path: "admin/users",
        element: (
          <RequireRole roles={["Admin"]}>
            <AdminUsers />
          </RequireRole>
        ),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <HubProvider>
        <RouterProvider router={router} />
      </HubProvider>
    </AuthProvider>
  );
}
