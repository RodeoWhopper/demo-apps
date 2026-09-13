import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { findProductBySlug } from "$lib/server/db";
import { readCart, writeCart } from "$lib/server/cart";

export const load: PageServerLoad = ({ params, cookies }) => {
  const product = findProductBySlug(params.slug);
  if (!product) error(404, "Product not found");
  const inCart = readCart(cookies)[product.id] ?? 0;
  return { product, inCart };
};

export const actions: Actions = {
  add: async ({ params, cookies, request }) => {
    const product = findProductBySlug(params.slug);
    if (!product) error(404, "Product not found");
    const form = await request.formData();
    const qty = Number.parseInt(String(form.get("qty") ?? "1"), 10);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return fail(400, { error: "Quantity must be between 1 and 99." });
    const cart = readCart(cookies);
    const next = Math.min((cart[product.id] ?? 0) + qty, product.stock);
    if (next === 0) return fail(400, { error: "This product is sold out." });
    cart[product.id] = next;
    writeCart(cookies, cart);
    return { added: qty, inCart: next };
  },
};
