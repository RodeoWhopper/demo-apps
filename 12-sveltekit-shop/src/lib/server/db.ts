import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "$env/dynamic/private";
import type { Order, Product, Session, User } from "$lib/types";

// Resolved at runtime so DATA_DIR can point at a mounted volume.
const DATA_DIR = path.resolve(env.DATA_DIR || "data");

function atomicWrite(file: string, data: unknown) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

/** A tiny JSON-file collection: created + seeded on first read, rewritten atomically on every write. */
function collection<T>(name: string, seed: () => T[]) {
  const file = path.join(DATA_DIR, name);
  return {
    file,
    read(): T[] {
      if (!fs.existsSync(file)) {
        const data = seed();
        atomicWrite(file, data);
        return data;
      }
      return JSON.parse(fs.readFileSync(file, "utf8")) as T[];
    },
    write(data: T[]) {
      atomicWrite(file, data);
    },
  };
}

export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(6).toString("hex")}`;

const now = () => new Date().toISOString();

const seedUsers = (): User[] => [
  { id: "u_owner", email: "owner@terracotta.shop", name: "Rosa Alder", passwordHash: bcrypt.hashSync("Owner123!", 10), role: "admin", createdAt: now() },
  { id: "u_shopper", email: "shopper@terracotta.shop", name: "Sam Fern", passwordHash: bcrypt.hashSync("Shop123!", 10), role: "customer", createdAt: now() },
];

const seedProducts = (): Product[] => [
  { id: "p_classic_12", slug: "classic-terracotta-12", name: "Classic Terracotta 12 cm", description: "The everyday pot. Unglazed, breathable clay with a drainage hole and matching saucer.", material: "terracotta", sizeCm: 12, priceCents: 650, stock: 120, color: "#c2410c", featured: true },
  { id: "p_classic_20", slug: "classic-terracotta-20", name: "Classic Terracotta 20 cm", description: "Room for a monstera to stretch. Same clay, more of it.", material: "terracotta", sizeCm: 20, priceCents: 1450, stock: 64, color: "#b45309", featured: false },
  { id: "p_classic_30", slug: "classic-terracotta-30", name: "Classic Terracotta 30 cm", description: "Patio-sized. Frost-resistant fired clay for olives, figs and small citrus.", material: "terracotta", sizeCm: 30, priceCents: 3200, stock: 18, color: "#9a3412", featured: false },
  { id: "p_sage_16", slug: "sage-glazed-16", name: "Sage Glazed 16 cm", description: "Satin sage glaze outside, raw clay inside so roots still breathe.", material: "glazed", sizeCm: 16, priceCents: 1900, stock: 42, color: "#6b7f5e", featured: true },
  { id: "p_ocean_22", slug: "ocean-glazed-22", name: "Ocean Glazed 22 cm", description: "Deep blue reactive glaze; every pot fires a little differently.", material: "glazed", sizeCm: 22, priceCents: 2900, stock: 9, color: "#1e5f74", featured: true },
  { id: "p_cream_14", slug: "cream-ceramic-14", name: "Cream Ceramic 14 cm", description: "Smooth stoneware in warm cream with a hidden drainage tray.", material: "ceramic", sizeCm: 14, priceCents: 1600, stock: 55, color: "#e8dcc8", featured: false },
  { id: "p_charcoal_18", slug: "charcoal-ceramic-18", name: "Charcoal Ceramic 18 cm", description: "Matte charcoal stoneware that makes variegated foliage pop.", material: "ceramic", sizeCm: 18, priceCents: 2400, stock: 27, color: "#3f3a36", featured: true },
  { id: "p_concrete_10", slug: "mini-concrete-10", name: "Mini Concrete 10 cm", description: "Hand-cast concrete for succulents and cacti. Sold with a cork mat.", material: "concrete", sizeCm: 10, priceCents: 900, stock: 200, color: "#8c8680", featured: false },
  { id: "p_concrete_25", slug: "concrete-cylinder-25", name: "Concrete Cylinder 25 cm", description: "Sealed concrete cylinder for indoor trees. Heavy - ships on a pallet.", material: "concrete", sizeCm: 25, priceCents: 4800, stock: 6, color: "#6b665f", featured: false },
  { id: "p_hanging_15", slug: "hanging-terracotta-15", name: "Hanging Terracotta 15 cm", description: "Three-string jute hanger and a lipped rim for trailing pothos.", material: "terracotta", sizeCm: 15, priceCents: 1250, stock: 0, color: "#d97706", featured: false },
];

export const users = collection<User>("users.json", seedUsers);
export const products = collection<Product>("products.json", seedProducts);
export const orders = collection<Order>("orders.json", () => []);
export const sessionsFile = collection<Session>("sessions.json", () => []);

export const findUserByEmail = (email: string) =>
  users.read().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
export const findUserById = (id: string) => users.read().find((u) => u.id === id);
export const findProductBySlug = (slug: string) => products.read().find((p) => p.slug === slug);
export const findProductById = (id: string) => products.read().find((p) => p.id === id);
