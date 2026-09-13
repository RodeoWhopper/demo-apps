"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setUserRole, verifyCredentials } from "./db";
import { clearSessionCookie, createSessionCookie, getSession } from "./session";
import { safeNext } from "./utils";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Email and password are required." };
  const user = verifyCredentials(email, password);
  if (!user) return { error: "Invalid email or password." };

  await createSessionCookie(user);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

export async function toggleRoleAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login?next=/admin");

  const id = String(formData.get("id") ?? "");
  const current = String(formData.get("role") ?? "member");
  if (id === session.sub) {
    // Refuse to demote yourself so the demo never loses its last admin.
    redirect("/admin?error=self");
  }
  setUserRole(id, current === "admin" ? "member" : "admin");
  revalidatePath("/admin");
  redirect("/admin");
}
