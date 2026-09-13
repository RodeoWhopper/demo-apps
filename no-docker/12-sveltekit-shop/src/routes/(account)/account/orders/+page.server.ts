import type { PageServerLoad } from "./$types";
import { orders } from "$lib/server/db";

export const load: PageServerLoad = ({ locals, url }) => ({
  orders: orders
    .read()
    .filter((o) => o.userId === locals.user!.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  placed: url.searchParams.get("placed"),
});
