import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { createSession, hashPassword, setSessionCookie } from "$lib/server/auth";
import { findUserByEmail, newId, users } from "$lib/server/db";

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(303, "/account");
  return {};
};

export const actions: Actions = {
  /** POST /register?/register  (fields: name, email, password) — always creates a `customer` */
  register: async ({ request, cookies }) => {
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    if (name.length < 2) return fail(400, { error: "Please tell us your name.", name, email });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { error: "That email address does not look right.", name, email });
    if (password.length < 8) return fail(400, { error: "Password must be at least 8 characters.", name, email });
    if (findUserByEmail(email)) return fail(409, { error: "An account with that email already exists.", name, email });

    const list = users.read();
    const user = { id: newId("u"), email, name, passwordHash: hashPassword(password), role: "customer" as const, createdAt: new Date().toISOString() };
    list.push(user);
    users.write(list);

    const session = createSession(user.id);
    setSessionCookie(cookies, session.id);
    redirect(303, "/account");
  },
};
