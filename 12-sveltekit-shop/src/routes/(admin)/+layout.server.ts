import { error, redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

/** Everything under (admin) requires a signed-in user with role "admin". */
export const load: LayoutServerLoad = ({ locals, url }) => {
  if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  if (locals.user.role !== "admin") error(403, "This area is for shop staff only.");
  return { user: locals.user };
};
