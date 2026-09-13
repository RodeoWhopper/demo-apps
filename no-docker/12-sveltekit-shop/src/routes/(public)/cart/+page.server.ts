import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { cartLines, cartTotal, readCart, writeCart } from "$lib/server/cart";
import { newId, orders, products } from "$lib/server/db";
import type { Order } from "$lib/types";

export const load: PageServerLoad = ({ cookies, locals }) => {
  const lines = cartLines(readCart(cookies));
  return { lines, total: cartTotal(lines), signedIn: Boolean(locals.user) };
};

export const actions: Actions = {
  update: async ({ cookies, request }) => {
    const form = await request.formData();
    const id = String(form.get("productId") ?? "");
    const qty = Number.parseInt(String(form.get("qty") ?? "0"), 10);
    const cart = readCart(cookies);
    if (!(id in cart)) return fail(400, { error: "That item is not in your cart." });
    if (!Number.isInteger(qty) || qty < 0 || qty > 99) return fail(400, { error: "Quantity must be 0-99." });
    if (qty === 0) delete cart[id];
    else cart[id] = qty;
    writeCart(cookies, cart);
    return { updated: true };
  },

  remove: async ({ cookies, request }) => {
    const form = await request.formData();
    const id = String(form.get("productId") ?? "");
    const cart = readCart(cookies);
    delete cart[id];
    writeCart(cookies, cart);
    return { updated: true };
  },

  checkout: async ({ cookies, locals }) => {
    if (!locals.user) redirect(303, "/login?next=/cart");
    const cart = readCart(cookies);
    const lines = cartLines(cart);
    if (lines.length === 0) return fail(400, { error: "Your cart is empty." });

    const all = products.read();
    for (const line of lines) {
      const p = all.find((x) => x.id === line.product.id)!;
      if (p.stock < line.qty) return fail(409, { error: `Only ${p.stock} × ${p.name} left in stock.` });
    }
    for (const line of lines) {
      const p = all.find((x) => x.id === line.product.id)!;
      p.stock -= line.qty;
    }
    products.write(all);

    const order: Order = {
      id: newId("ord"),
      userId: locals.user.id,
      lines: lines.map((l) => ({ productId: l.product.id, name: l.product.name, unitCents: l.product.priceCents, qty: l.qty })),
      totalCents: cartTotal(lines),
      status: "placed",
      createdAt: new Date().toISOString(),
    };
    const list = orders.read();
    list.push(order);
    orders.write(list);
    writeCart(cookies, {});
    redirect(303, `/account/orders?placed=${order.id}`);
  },
};
