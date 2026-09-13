import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { newId, products } from "$lib/server/db";
import { slugify } from "$lib/money";
import { MATERIALS, type Material, type Product } from "$lib/types";

export const load: PageServerLoad = () => ({ products: products.read(), materials: MATERIALS });

function parse(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const material = String(form.get("material") ?? "") as Material;
  const sizeCm = Number.parseInt(String(form.get("sizeCm") ?? ""), 10);
  const price = Number.parseFloat(String(form.get("price") ?? ""));
  const stock = Number.parseInt(String(form.get("stock") ?? ""), 10);
  const color = String(form.get("color") ?? "#c2410c");
  const featured = form.get("featured") === "on";

  const errors: string[] = [];
  if (name.length < 3 || name.length > 60) errors.push("Name must be 3-60 characters.");
  if (!MATERIALS.includes(material)) errors.push("Pick a valid material.");
  if (!Number.isInteger(sizeCm) || sizeCm < 5 || sizeCm > 120) errors.push("Size must be 5-120 cm.");
  if (!Number.isFinite(price) || price < 0) errors.push("Price must be a non-negative number.");
  if (!Number.isInteger(stock) || stock < 0) errors.push("Stock must be a non-negative whole number.");
  if (!/^#[0-9a-f]{6}$/i.test(color)) errors.push("Colour must be a hex value like #c2410c.");

  return { errors, values: { name, description, material, sizeCm, priceCents: Math.round(price * 100), stock, color, featured } };
}

export const actions: Actions = {
  create: async ({ request }) => {
    const form = await request.formData();
    const { errors, values } = parse(form);
    if (errors.length) return fail(400, { errors, action: "create" });
    const list = products.read();
    let slug = slugify(values.name);
    if (list.some((p) => p.slug === slug)) slug = `${slug}-${list.length + 1}`;
    const product: Product = { id: newId("p"), slug, ...values };
    list.push(product);
    products.write(list);
    return { ok: `Created ${product.name}.` };
  },

  update: async ({ request }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    const { errors, values } = parse(form);
    if (errors.length) return fail(400, { errors, action: "update", id });
    const list = products.read();
    const product = list.find((p) => p.id === id);
    if (!product) return fail(404, { errors: ["Product not found."], action: "update", id });
    Object.assign(product, values);
    products.write(list);
    return { ok: `Updated ${product.name}.` };
  },

  delete: async ({ request }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    const list = products.read();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return fail(404, { errors: ["Product not found."], action: "delete", id });
    const [removed] = list.splice(idx, 1);
    products.write(list);
    return { ok: `Deleted ${removed.name}.` };
  },
};
