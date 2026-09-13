import { redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { clearSessionCookie, deleteSession } from "$lib/server/auth";

export const actions: Actions = {
  /** POST /logout — destroys the server-side session and clears the cookie */
  default: async ({ locals, cookies }) => {
    if (locals.sessionId) deleteSession(locals.sessionId);
    clearSessionCookie(cookies);
    redirect(303, "/");
  },
};
