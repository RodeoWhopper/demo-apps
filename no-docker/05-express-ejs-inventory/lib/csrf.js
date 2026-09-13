import crypto from "node:crypto";

/**
 * Hand-rolled CSRF protection: a random token lives in the server-side session and must be echoed back
 * in every state-changing request as the `_csrf` form field (or `x-csrf-token` header).
 */
export function csrfProtection(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString("hex");
  }
  res.locals.csrfToken = req.session.csrfToken;

  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const sent = String(req.body?._csrf ?? req.get("x-csrf-token") ?? "");
    const expected = req.session.csrfToken;
    const ok =
      sent.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
    if (!ok) {
      return res.status(403).render("error", { status: 403, title: "Forbidden", message: "Invalid or missing CSRF token." });
    }
  }
  next();
}
