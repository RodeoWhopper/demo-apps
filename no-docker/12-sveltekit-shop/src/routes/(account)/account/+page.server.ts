import type { PageServerLoad } from "./$types";
import { orders } from "$lib/server/db";
import { sessionCount } from "$lib/server/auth";

export const load: PageServerLoad = ({ locals }) => {
  const mine = orders.read().filter((o) => o.userId === locals.user!.id);
  return { orderCount: mine.length, spentCents: mine.reduce((s, o) => s + o.totalCents, 0), activeSessions: sessionCount() };
};
