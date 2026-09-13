import type { PageServerLoad } from "./$types";
import { products } from "$lib/server/db";
import { MATERIALS, type Material } from "$lib/types";

export const load: PageServerLoad = ({ url }) => {
  const material = url.searchParams.get("material") as Material | null;
  const all = products.read();
  const list = material && MATERIALS.includes(material) ? all.filter((p) => p.material === material) : all;
  return { products: list, material: material ?? "", materials: MATERIALS };
};
