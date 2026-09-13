import { Elysia, t } from "elysia";
import { polls } from "../db.ts";
import { requireAdmin, session } from "../plugins.ts";
import { AdminPage } from "../views/pages.tsx";
import { AdminRow } from "../views/partials.tsx";

const idParam = { params: t.Object({ id: t.Numeric() }) };

function row(id: number) {
  return polls.list().find((p) => p.id === id);
}

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(session)
  .guard({ beforeHandle: requireAdmin }, (app) =>
    app
      .get("/", ({ user }) => AdminPage({ user: user!, polls: polls.list() }))
      .post("/polls/:id/close", ({ params: { id }, set }) => {
        polls.setClosed(id, true);
        const p = row(id);
        if (!p) set.status = 404;
        return p ? AdminRow({ poll: p }) : "";
      }, idParam)
      .post("/polls/:id/reopen", ({ params: { id }, set }) => {
        polls.setClosed(id, false);
        const p = row(id);
        if (!p) set.status = 404;
        return p ? AdminRow({ poll: p }) : "";
      }, idParam)
      // HTMX DELETE: an empty 200 body with outerHTML swap removes the row.
      .delete("/polls/:id", ({ params: { id } }) => {
        polls.delete(id);
        return "";
      }, idParam),
  );
