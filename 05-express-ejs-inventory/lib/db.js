import path from "node:path";
import { mkdirSync } from "node:fs";
import { JSONFilePreset } from "lowdb/node";
import bcrypt from "bcryptjs";

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve("data");
export const DB_FILE = path.join(DATA_DIR, "inventory.json");

export const CATEGORIES = ["Fasteners", "Power Tools", "Safety Gear"];

function seed() {
  const now = new Date().toISOString();
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const item = (id, sku, name, category, quantity, reorderLevel, unitPrice, location) => ({
    id, sku, name, category, quantity, reorderLevel, unitPrice, location, updatedAt: now,
  });
  return {
    users: [
      { id: 1, username: "admin", passwordHash: hash("admin123"), role: "admin", createdAt: now },
      { id: 2, username: "clerk", passwordHash: hash("clerk123"), role: "clerk", createdAt: now },
    ],
    items: [
      item(1, "FST-0001", "Hex bolt M8x40 (box of 100)", "Fasteners", 240, 50, 8.9, "A-01-02"),
      item(2, "FST-0002", "Hex nut M8 (box of 200)", "Fasteners", 35, 60, 6.4, "A-01-03"),
      item(3, "FST-0003", "Wood screw 4x50 (box of 500)", "Fasteners", 120, 40, 11.2, "A-02-01"),
      item(4, "FST-0004", "Washer M8 zinc (bag of 500)", "Fasteners", 18, 30, 4.75, "A-02-04"),
      item(5, "FST-0005", "Anchor bolt M12x120", "Fasteners", 410, 100, 1.35, "A-03-01"),
      item(6, "PWT-0101", "Cordless drill 18V", "Power Tools", 14, 5, 129.0, "B-01-01"),
      item(7, "PWT-0102", "Angle grinder 125mm", "Power Tools", 3, 4, 89.5, "B-01-02"),
      item(8, "PWT-0103", "Jigsaw 650W", "Power Tools", 9, 3, 74.0, "B-01-04"),
      item(9, "PWT-0104", "Impact driver 18V (bare)", "Power Tools", 21, 6, 99.0, "B-02-01"),
      item(10, "PWT-0105", "Battery pack 18V 4Ah", "Power Tools", 2, 10, 59.0, "B-02-03"),
      item(11, "SFG-0201", "Safety helmet white", "Safety Gear", 66, 20, 12.5, "C-01-01"),
      item(12, "SFG-0202", "Nitrile gloves L (box of 100)", "Safety Gear", 150, 40, 9.8, "C-01-02"),
      item(13, "SFG-0203", "Safety goggles clear", "Safety Gear", 12, 25, 6.2, "C-01-03"),
      item(14, "SFG-0204", "Hi-vis vest XL", "Safety Gear", 44, 15, 5.5, "C-02-01"),
      item(15, "SFG-0205", "Ear defenders 30dB", "Safety Gear", 7, 10, 18.0, "C-02-02"),
    ],
    nextItemId: 16,
  };
}

/** Opens (or creates + seeds) the lowdb JSON store. */
export async function initDb() {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = await JSONFilePreset(DB_FILE, seed());
  // JSONFilePreset writes the default data only if the file did not exist; make that explicit.
  await db.write();
  return db;
}

export function findUser(db, username) {
  return db.data.users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
}

export function verifyUser(db, username, password) {
  const user = findUser(db, username);
  if (!user) return null;
  return bcrypt.compareSync(String(password), user.passwordHash) ? user : null;
}

export const isLowStock = (item) => item.quantity <= item.reorderLevel;
