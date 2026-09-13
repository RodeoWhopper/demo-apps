import { Elysia, t } from "elysia";
import { createSessionToken, isValidEmail, issueCode, normalizeEmail, peekCode, SESSION_COOKIE, verifyCode } from "../auth.ts";
import { config, isProduction } from "../config.ts";
import { session } from "../plugins.ts";
import { LoginPage, VerifyPage } from "../views/pages.tsx";

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export const authRoutes = new Elysia()
  .use(session)
  .get("/login", ({ user, redirect }) => (user ? redirect("/") : LoginPage({})))
  .post(
    "/login",
    ({ body, set, redirect }) => {
      const email = normalizeEmail(body.email);
      if (!isValidEmail(email)) {
        set.status = 422;
        return LoginPage({ error: "Please enter a valid email address.", email: body.email });
      }
      issueCode(email);
      const next = safeNext(body.next);
      return redirect(`/login/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`, 303);
    },
    { body: t.Object({ email: t.String(), next: t.Optional(t.String()) }) },
  )
  .get("/login/verify", ({ query, set, redirect }) => {
    const email = normalizeEmail(query.email ?? "");
    if (!isValidEmail(email)) return redirect("/login");
    // In development the pending code is shown on the page as well as in the log.
    const devCode = isProduction ? null : peekCode(email)?.code ?? null;
    set.headers["cache-control"] = "no-store";
    return VerifyPage({ email, devCode });
  })
  .post(
    "/login/verify",
    ({ body, cookie, set, redirect, query }) => {
      const email = normalizeEmail(body.email);
      if (!isValidEmail(email) || !verifyCode(email, body.code)) {
        set.status = 422;
        return VerifyPage({ email, error: "That code is wrong or has expired. Request a new one." });
      }
      cookie[SESSION_COOKIE]!.set({
        value: createSessionToken(email),
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: config.sessionTtlDays * 86_400,
      });
      return redirect(safeNext(query.next), 303);
    },
    { body: t.Object({ email: t.String(), code: t.String() }) },
  )
  .post("/logout", ({ cookie, redirect }) => {
    cookie[SESSION_COOKIE]!.remove();
    return redirect("/", 303);
  });

/** Development-only helper so the OTP can be read without a mail provider. Disabled when APP_ENV=production. */
export const devRoutes = new Elysia().get("/dev/last-code", ({ query, set }) => {
  if (isProduction) {
    set.status = 404;
    return { error: "not available in production" };
  }
  const email = normalizeEmail(query.email ?? "");
  const pending = email ? peekCode(email) : null;
  if (!pending) {
    set.status = 404;
    return { email, code: null, error: "no pending code for this email" };
  }
  return { email, code: pending.code, expires_at: new Date(pending.expires_at * 1000).toISOString() };
});
