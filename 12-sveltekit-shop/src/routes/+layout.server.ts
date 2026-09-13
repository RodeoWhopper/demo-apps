import type { LayoutServerLoad } from "./$types";
import { cartCount, readCart } from "$lib/server/cart";

export const load: LayoutServerLoad = ({ locals, cookies }) => ({
  user: locals.user,
  cartCount: cartCount(readCart(cookies)),
});
