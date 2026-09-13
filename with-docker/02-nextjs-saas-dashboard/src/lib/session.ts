import { cookies } from "next/headers";
import { COOKIE_NAME, sessionCookieOptions, signSession, verifySession, type SessionPayload } from "./jwt";
import type { User } from "./db";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function createSessionCookie(user: User): Promise<void> {
  const token = await signSession({ sub: user.id, email: user.email, name: user.name, role: user.role });
  const store = await cookies();
  store.set(COOKIE_NAME, token, sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
