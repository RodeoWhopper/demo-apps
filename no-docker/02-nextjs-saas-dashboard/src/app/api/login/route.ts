import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/db";
import { createSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * JSON login endpoint (same cookie as the Server Action form) so the flow is curl-testable:
 *   curl -c jar -H 'content-type: application/json' -d '{"email":"admin@lumeo.dev","password":"Admin123!"}' http://localhost:3002/api/login
 */
export async function POST(req: Request) {
  let email = "";
  let password = "";
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const body = (await req.json()) as { email?: string; password?: string };
      email = String(body.email ?? "");
      password = String(body.password ?? "");
    } else {
      const form = await req.formData();
      email = String(form.get("email") ?? "");
      password = String(form.get("password") ?? "");
    }
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const user = verifyCredentials(email.trim().toLowerCase(), password);
  if (!user) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }
  await createSessionCookie(user);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
