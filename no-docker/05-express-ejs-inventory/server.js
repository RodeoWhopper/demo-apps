import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";
import { initDb } from "./lib/db.js";
import { flash } from "./lib/flash.js";
import { csrfProtection } from "./lib/csrf.js";
import { attachUser } from "./lib/auth.js";
import authRoutes from "./routes/auth.js";
import itemRoutes from "./routes/items.js";
import adminRoutes from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3005);
const HOST = process.env.HOST || "0.0.0.0";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-demo-secret-depot";

if (!process.env.SESSION_SECRET) {
  console.warn("[depot] SESSION_SECRET not set - using the insecure demo default");
}

const db = await initDb();
const app = express();

app.disable("x-powered-by");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

// Health check is registered before the session middleware so probes never create sessions.
app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", app: "depot-ninety", items: db.data.items.length, time: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    name: "depot.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);
app.use((req, _res, next) => {
  req.db = db;
  next();
});
app.use(flash);
app.use(attachUser); // sets res.locals.user/currentPath before anything can render a page
app.use(csrfProtection);

app.get("/", (_req, res) => res.redirect("/items"));
app.use(authRoutes);
app.use("/items", itemRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).render("404", { title: "Not found", path: req.originalUrl });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).render("error", { title: "Error", status, message: status === 500 ? "Something went wrong." : err.message });
});

app.listen(PORT, HOST, () => {
  console.log(`[depot] Depot Ninety listening on http://${HOST}:${PORT}`);
});
