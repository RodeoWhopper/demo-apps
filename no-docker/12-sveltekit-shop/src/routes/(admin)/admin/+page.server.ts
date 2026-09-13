import type { PageServerLoad } from "./$types";
import { orders, products, users } from "$lib/server/db";

export const load: PageServerLoad = () => {
  const allOrders = orders.read();
  const allProducts = products.read();
  const allUsers = users.read();
  const byId = new Map(allUsers.map((u) => [u.id, u.email]));
  return {
    stats: {
      products: allProducts.length,
      soldOut: allProducts.filter((p) => p.stock === 0).length,
      customers: allUsers.filter((u) => u.role === "customer").length,
      orders: allOrders.length,
      revenueCents: allOrders.reduce((s, o) => s + o.totalCents, 0),
    },
    recent: allOrders
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map((o) => ({ ...o, email: byId.get(o.userId) ?? o.userId })),
    lowStock: allProducts.filter((p) => p.stock < 10).sort((a, b) => a.stock - b.stock),
  };
};
