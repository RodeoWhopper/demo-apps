import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

/** Everything under (account) requires a signed-in user. */
export const load: LayoutServerLoad = ({ locals, url }) => {
  if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  return { user: locals.user };
};
