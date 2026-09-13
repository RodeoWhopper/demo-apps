import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Cookies } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { sessionsFile } from "./db";
import type { SafeUser, Session, User } from "$lib/types";

export const SESSION_COOKIE = "tc_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Server-side session store: an in-memory Map mirrored to data/sessions.json so restarts keep people signed in.
const sessions = new Map<string, Session>();
let loaded = false;

function ensureLoaded() {
  if (loaded) return;
  for (const s of sessionsFile.read()) sessions.set(s.id, s);
  loaded = true;
  purgeExpired();
}

function persist() {
  sessionsFile.write([...sessions.values()]);
}

function purgeExpired() {
  const t = Date.now();
  let changed = false;
  for (const [id, s] of sessions) {
    if (Date.parse(s.expiresAt) < t) {
      sessions.delete(id);
      changed = true;
    }
  }
  if (changed) persist();
}

export function createSession(userId: string): Session {
  ensureLoaded();
  const session: Session = {
    id: crypto.randomBytes(32).toString("base64url"),
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  sessions.set(session.id, session);
  persist();
  return session;
}

export function getSession(id: string): Session | null {
  ensureLoaded();
  const s = sessions.get(id);
  if (!s) return null;
  if (Date.parse(s.expiresAt) < Date.now()) {
    sessions.delete(id);
    persist();
    return null;
  }
  return s;
}

export function deleteSession(id: string) {
  ensureLoaded();
  if (sessions.delete(id)) persist();
}

export function sessionCount(): number {
  ensureLoaded();
  return sessions.size;
}

const secureCookies = () => env.COOKIE_SECURE === "true";

export function setSessionCookie(cookies: Cookies, sessionId: string) {
  cookies.set(SESSION_COOKIE, sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(cookies: Cookies) {
  cookies.delete(SESSION_COOKIE, { path: "/", secure: secureCookies() });
}

export const hashPassword = (pw: string) => bcrypt.hashSync(pw, 10);
export const verifyPassword = (user: User, pw: string) => bcrypt.compareSync(pw, user.passwordHash);

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

/** Only same-origin relative paths are accepted as post-login redirect targets. */
export function safeNext(value: string | null | undefined, fallback = "/account"): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  return fallback;
}
