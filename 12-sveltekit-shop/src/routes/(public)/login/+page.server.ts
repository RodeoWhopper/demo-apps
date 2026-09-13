import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { createSession, safeNext, setSessionCookie, verifyPassword } from "$lib/server/auth";
import { findUserByEmail } from "$lib/server/db";

export const load: PageServerLoad = ({ locals, url }) => {
  const next = safeNext(url.searchParams.get("next"));
  if (locals.user) redirect(303, next);
  return { next };
};

export const actions: Actions = {
  /** POST /login?/login  (fields: email, password, next) */
  login: async ({ request, cookies }) => {
    const form = await request.formData();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const next = safeNext(String(form.get("next") ?? ""));

    if (!email || !password) return fail(400, { error: "Email and password are required.", email });
    const user = findUserByEmail(email);
    if (!user || !verifyPassword(user, password)) return fail(401, { error: "Invalid email or password.", email });

    const session = createSession(user.id);
    setSessionCookie(cookies, session.id);
    redirect(303, next);
  },
};
