import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

export type Role = "admin" | "member";
export type ProjectStatus = "active" | "paused" | "archived";
export type Plan = "starter" | "growth" | "scale";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface ProjectMetrics {
  visitors: number;
  conversions: number;
  revenue: number; // USD
  bounceRate: number; // percent
}

export interface Project {
  id: string;
  name: string;
  domain: string;
  owner: string;
  status: ProjectStatus;
  plan: Plan;
  metrics: ProjectMetrics;
  trend: number[]; // last 7 days of visitors
  updatedAt: string;
}

export interface Database {
  users: User[];
  projects: Project[];
}

// Resolved at runtime (not statically) so the build's file tracer never bundles a db.json snapshot.
const DATA_DIR = path.resolve(process.env.DATA_DIR || "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function seed(): Database {
  const now = new Date().toISOString();
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  return {
    users: [
      { id: "u_admin", name: "Ada Lumeo", email: "admin@lumeo.dev", passwordHash: hash("Admin123!"), role: "admin", createdAt: now },
      { id: "u_member", name: "Uli Member", email: "user@lumeo.dev", passwordHash: hash("User123!"), role: "member", createdAt: now },
      { id: "u_ops", name: "Priya Natarajan", email: "ops@lumeo.dev", passwordHash: hash("User123!"), role: "member", createdAt: now },
    ],
    projects: [
      { id: "p_1", name: "Northwind Storefront", domain: "shop.northwind.example", owner: "Ada Lumeo", status: "active", plan: "scale", metrics: { visitors: 184320, conversions: 6120, revenue: 412300, bounceRate: 38.2 }, trend: [24100, 25800, 27400, 26900, 28800, 25500, 25820], updatedAt: now },
      { id: "p_2", name: "Helios Docs", domain: "docs.helios.example", owner: "Uli Member", status: "active", plan: "growth", metrics: { visitors: 92110, conversions: 1480, revenue: 58200, bounceRate: 51.7 }, trend: [12800, 13100, 13900, 12700, 13400, 13000, 13210], updatedAt: now },
      { id: "p_3", name: "Fjord Travel Blog", domain: "fjord.example", owner: "Priya Natarajan", status: "active", plan: "starter", metrics: { visitors: 40870, conversions: 610, revenue: 9800, bounceRate: 63.4 }, trend: [5200, 5600, 6100, 5900, 6300, 5700, 6070], updatedAt: now },
      { id: "p_4", name: "Quartz Mobile App", domain: "quartz.example", owner: "Ada Lumeo", status: "paused", plan: "growth", metrics: { visitors: 21400, conversions: 340, revenue: 12600, bounceRate: 44.9 }, trend: [4100, 3800, 3200, 2900, 2600, 2500, 2300], updatedAt: now },
      { id: "p_5", name: "Beacon Newsletter", domain: "beacon.example", owner: "Uli Member", status: "active", plan: "starter", metrics: { visitors: 15980, conversions: 2210, revenue: 4400, bounceRate: 29.5 }, trend: [2100, 2300, 2200, 2500, 2400, 2200, 2280], updatedAt: now },
      { id: "p_6", name: "Orbit SaaS Landing", domain: "orbit.example", owner: "Priya Natarajan", status: "active", plan: "scale", metrics: { visitors: 133200, conversions: 4890, revenue: 276500, bounceRate: 41.1 }, trend: [17600, 18900, 19400, 20100, 19800, 18700, 18700], updatedAt: now },
      { id: "p_7", name: "Maple Recipes", domain: "maple.example", owner: "Ada Lumeo", status: "archived", plan: "starter", metrics: { visitors: 3120, conversions: 40, revenue: 0, bounceRate: 71.3 }, trend: [900, 700, 500, 400, 300, 200, 120], updatedAt: now },
      { id: "p_8", name: "Kestrel Support Portal", domain: "support.kestrel.example", owner: "Uli Member", status: "active", plan: "growth", metrics: { visitors: 67450, conversions: 3010, revenue: 33100, bounceRate: 35.8 }, trend: [9100, 9600, 9400, 9900, 10200, 9700, 9550], updatedAt: now },
    ],
  };
}

function atomicWrite(file: string, content: string) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

/** Reads the JSON store; creates and seeds it on first access. */
export function readDb(): Database {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = seed();
    atomicWrite(DB_FILE, JSON.stringify(db, null, 2));
    return db;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Database;
}

export function writeDb(db: Database): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  atomicWrite(DB_FILE, JSON.stringify(db, null, 2));
}

export function findUserByEmail(email: string): User | undefined {
  return readDb().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function verifyCredentials(email: string, password: string): User | null {
  const user = findUserByEmail(email);
  if (!user) return null;
  return bcrypt.compareSync(password, user.passwordHash) ? user : null;
}

export function listProjects(): Project[] {
  return readDb().projects;
}

export function getProject(id: string): Project | undefined {
  return readDb().projects.find((p) => p.id === id);
}

export function listUsers(): Omit<User, "passwordHash">[] {
  return readDb().users.map(({ passwordHash: _ph, ...rest }) => rest);
}

export function setUserRole(id: string, role: Role): boolean {
  const db = readDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return false;
  user.role = role;
  writeDb(db);
  return true;
}
