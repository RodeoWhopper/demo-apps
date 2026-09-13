import { Elysia } from "elysia";
import { html } from "@elysiajs/html";
import { config, isProduction } from "./config.ts";
import { db, seedIfEmpty } from "./db.ts";
import { session } from "./plugins.ts";
import { adminRoutes } from "./routes/admin.tsx";
import { authRoutes, devRoutes } from "./routes/auth.tsx";
import { pollRoutes } from "./routes/polls.tsx";
import { ErrorPage } from "./views/pages.tsx";

seedIfEmpty();

export const app = new Elysia()
  .use(html())
  // Registered before the routes (and global) so it also covers validation errors inside plugins.
  .onError({ as: "global" }, ({ code, error, set, request }) => {
    const isHtmx = request.headers.get("hx-request") === "true";
    if (code === "NOT_FOUND") {
      set.status = 404;
      return isHtmx ? "" : ErrorPage({ user: null, status: 404, message: "Page not found." });
    }
    if (code === "VALIDATION") {
      set.status = 422;
      return isHtmx
        ? '<p class="alert err">That request was not valid - reload the page and try again.</p>'
        : ErrorPage({ user: null, status: 422, message: "The request was malformed." });
    }
    console.error(`[pulsebox] ${request.method} ${new URL(request.url).pathname}:`, error);
    set.status = 500;
    return isHtmx ? "" : ErrorPage({ user: null, status: 500, message: "Something went wrong." });
  })
  .get("/healthz", ({ set }) => {
    let dbOk = true;
    try {
      db.query("SELECT 1").get();
    } catch {
      dbOk = false;
    }
    set.status = dbOk ? 200 : 503;
    return { status: dbOk ? "ok" : "degraded", app: "pulsebox", env: config.env, db: dbOk ? "ok" : "error", time: new Date().toISOString() };
  })
  .use(session)
  .use(authRoutes)
  .use(devRoutes)
  .use(pollRoutes)
  .use(adminRoutes)
  .listen({ hostname: "0.0.0.0", port: config.port });

console.log(`[pulsebox] ${config.env} server listening on http://0.0.0.0:${config.port}`);
if (!isProduction) console.log("[pulsebox] dev helper enabled: GET /dev/last-code?email=<address>");
