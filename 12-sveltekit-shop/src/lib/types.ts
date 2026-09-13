export type Role = "admin" | "customer";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export type SafeUser = Omit<User, "passwordHash">;

export type Material = "terracotta" | "glazed" | "concrete" | "ceramic";
export const MATERIALS: Material[] = ["terracotta", "glazed", "concrete", "ceramic"];

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  material: Material;
  sizeCm: number;
  priceCents: number;
  stock: number;
  color: string;
  featured: boolean;
}

export interface OrderLine {
  productId: string;
  name: string;
  unitCents: number;
  qty: number;
}

export interface Order {
  id: string;
  userId: string;
  lines: OrderLine[];
  totalCents: number;
  status: "placed" | "shipped";
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

/** productId -> quantity, stored as JSON in the `tc_cart` cookie. */
export type Cart = Record<string, number>;
