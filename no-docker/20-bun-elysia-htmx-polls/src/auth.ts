import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db.ts";
import { config } from "./config.ts";

export const SESSION_COOKIE = "pb_session";
export const VOTER_COOKIE = "pb_voter";

export interface User {
  email: string;
  isAdmin: boolean;
}

// ---- signed session cookie (HMAC-SHA256 over a base64url JSON payload) ----

function sign(payload: string): string {
  return createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
}

export function createSessionToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + config.sessionTtlDays * 86_400_000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): User | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".") as [string, string];
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email?: string; exp?: number };
    if (typeof data.email !== "string" || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { email: data.email, isAdmin: config.adminEmails.includes(data.email) };
  } catch {
    return null;
  }
}

// ---- passwordless OTP codes ----

const insertCode = db.query<void, [string, string, number]>(
  "INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)");
const latestCode = db.query<{ id: number; code: string; expires_at: number; used_at: number | null }, [string]>(
  "SELECT id, code, expires_at, used_at FROM otp_codes WHERE email = ? ORDER BY id DESC LIMIT 1");
const markUsed = db.query<void, [number]>("UPDATE otp_codes SET used_at = unixepoch() WHERE id = ?");
const purgeOld = db.query<void, []>("DELETE FROM otp_codes WHERE expires_at < unixepoch() - 3600");

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

/** Create a fresh 6-digit code; previous codes for the address become invalid. */
export function issueCode(email: string): string {
  purgeOld.run();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = Math.floor(Date.now() / 1000) + config.otpTtlMinutes * 60;
  insertCode.run(email, code, expiresAt);
  // No mail provider in this demo: the code is printed to the server log.
  console.log(`[pulsebox] login code for ${email}: ${code} (valid ${config.otpTtlMinutes} min)`);
  return code;
}

export function verifyCode(email: string, code: string): boolean {
  const row = latestCode.get(email);
  if (!row || row.used_at !== null || row.expires_at < Math.floor(Date.now() / 1000)) return false;
  const a = Buffer.from(row.code);
  const b = Buffer.from(code.trim());
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  markUsed.run(row.id);
  return true;
}

/** Dev helper: the latest unexpired, unused code for an address (never in production). */
export function peekCode(email: string): { code: string; expires_at: number } | null {
  const row = latestCode.get(email);
  if (!row || row.used_at !== null || row.expires_at < Math.floor(Date.now() / 1000)) return null;
  return { code: row.code, expires_at: row.expires_at };
}
