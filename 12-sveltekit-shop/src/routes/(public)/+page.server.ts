import type { PageServerLoad } from "./$types";
import { products } from "$lib/server/db";

export const load: PageServerLoad = () => {
  const all = products.read();
  return { featured: all.filter((p) => p.featured), count: all.length };
};
