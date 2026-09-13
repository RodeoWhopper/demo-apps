import type { Handle } from "@sveltejs/kit";
import { SESSION_COOKIE, clearSessionCookie, getSession, toSafeUser } from "$lib/server/auth";
import { findUserById } from "$lib/server/db";

/**
 * Resolves the `tc_session` cookie against the server-side session store on every request and exposes the
 * signed-in user as `event.locals.user`. Route-group layouts (`(account)`, `(admin)`) use it to gate access.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const sid = event.cookies.get(SESSION_COOKIE) ?? null;
  const session = sid ? getSession(sid) : null;
  const user = session ? findUserById(session.userId) : undefined;

  if (session && user) {
    event.locals.user = toSafeUser(user);
    event.locals.sessionId = session.id;
  } else {
    event.locals.user = null;
    event.locals.sessionId = null;
    if (sid) clearSessionCookie(event.cookies); // stale or unknown session id
  }

  return resolve(event);
};
