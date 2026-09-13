import { Elysia } from "elysia";
import { randomUUID } from "node:crypto";
import { readSessionToken, SESSION_COOKIE, VOTER_COOKIE, type User } from "./auth.ts";
import { ErrorPage } from "./views/pages.tsx";

/** Resolves the current user (from the signed cookie) and an anonymous voter id for every request. */
export const session = new Elysia({ name: "session" })
  .derive({ as: "global" }, ({ cookie, request }) => {
    const user: User | null = readSessionToken(cookie[SESSION_COOKIE]?.value as string | undefined);
    let voterId = cookie[VOTER_COOKIE]?.value as string | undefined;
    if (!voterId || !/^[0-9a-f-]{36}$/.test(voterId)) {
      voterId = randomUUID();
      cookie[VOTER_COOKIE]!.set({ value: voterId, httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86_400 });
    }
    return {
      user,
      voterKey: user ? `user:${user.email}` : `anon:${voterId}`,
      isHtmx: request.headers.get("hx-request") === "true",
    };
  });

type Ctx = { user: User | null; isHtmx: boolean; set: { status?: number | string; headers: Record<string, string> }; redirect: (url: string, status?: number) => Response; request: Request };

/** beforeHandle guard: logged-in users only. Browsers get a 302, HTMX gets 401 + HX-Redirect. */
export function requireAuth({ user, isHtmx, set, redirect, request }: Ctx) {
  if (user) return;
  const next = encodeURIComponent(new URL(request.url).pathname);
  if (isHtmx) {
    set.status = 401;
    set.headers["HX-Redirect"] = `/login?next=${next}`;
    return "";
  }
  return redirect(`/login?next=${next}`, 302);
}

/** beforeHandle guard: admins only (403 for everyone else). */
export function requireAdmin(ctx: Ctx) {
  const denied = requireAuth(ctx);
  if (denied !== undefined) return denied;
  if (!ctx.user!.isAdmin) {
    ctx.set.status = 403;
    return ErrorPage({ user: ctx.user, status: 403, message: "This area is for administrators only." });
  }
}
