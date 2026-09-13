import type { Cookies } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { products } from "./db";
import type { Cart, Product } from "$lib/types";

export const CART_COOKIE = "tc_cart";

export function readCart(cookies: Cookies): Cart {
  try {
    const raw = cookies.get(CART_COOKIE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const cart: Cart = {};
    for (const [id, qty] of Object.entries(parsed)) {
      const n = Number(qty);
      if (Number.isInteger(n) && n > 0 && n <= 99) cart[id] = n;
    }
    return cart;
  } catch {
    return {};
  }
}

export function writeCart(cookies: Cookies, cart: Cart) {
  const clean = Object.fromEntries(Object.entries(cart).filter(([, q]) => q > 0));
  if (Object.keys(clean).length === 0) {
    cookies.delete(CART_COOKIE, { path: "/", secure: env.COOKIE_SECURE === "true" });
    return;
  }
  cookies.set(CART_COOKIE, JSON.stringify(clean), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE === "true",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export interface CartLine {
  product: Product;
  qty: number;
  lineCents: number;
}

export function cartLines(cart: Cart): CartLine[] {
  const all = products.read();
  const lines: CartLine[] = [];
  for (const [id, qty] of Object.entries(cart)) {
    const product = all.find((p) => p.id === id);
    if (product) lines.push({ product, qty, lineCents: product.priceCents * qty });
  }
  return lines;
}

export const cartCount = (cart: Cart) => Object.values(cart).reduce((a, b) => a + b, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((s, l) => s + l.lineCents, 0);
