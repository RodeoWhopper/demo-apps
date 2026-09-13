import { Router } from "express";
import { CATEGORIES, isLowStock } from "../lib/db.js";
import { requireLogin, requireRole } from "../lib/auth.js";

const router = Router();
router.use(requireLogin);

function validate(body, items, currentId = null) {
  const errors = [];
  const sku = String(body.sku ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim();
  const category = String(body.category ?? "");
  const location = String(body.location ?? "").trim();
  const quantity = Number.parseInt(body.quantity, 10);
  const reorderLevel = Number.parseInt(body.reorderLevel, 10);
  const unitPrice = Number.parseFloat(body.unitPrice);

  if (!/^[A-Z]{3}-\d{4}$/.test(sku)) errors.push("SKU must look like ABC-1234.");
  if (items.some((i) => i.sku === sku && i.id !== currentId)) errors.push("SKU already exists.");
  if (name.length < 2 || name.length > 80) errors.push("Name must be 2-80 characters.");
  if (!CATEGORIES.includes(category)) errors.push("Choose a valid category.");
  if (!Number.isInteger(quantity) || quantity < 0) errors.push("Quantity must be a whole number >= 0.");
  if (!Number.isInteger(reorderLevel) || reorderLevel < 0) errors.push("Reorder level must be a whole number >= 0.");
  if (!Number.isFinite(unitPrice) || unitPrice < 0) errors.push("Unit price must be a number >= 0.");
  if (location.length > 20) errors.push("Location is too long.");

  return { errors, values: { sku, name, category, location, quantity, reorderLevel, unitPrice } };
}

router.get("/", (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const category = String(req.query.category ?? "");
  const onlyLow = req.query.low === "1";
  let items = req.db.data.items;
  if (q) items = items.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
  if (CATEGORIES.includes(category)) items = items.filter((i) => i.category === category);
  if (onlyLow) items = items.filter(isLowStock);
  items = [...items].sort((a, b) => a.sku.localeCompare(b.sku));
  res.render("items/index", {
    title: "Inventory",
    items,
    categories: CATEGORIES,
    filters: { q, category, low: onlyLow },
    lowCount: req.db.data.items.filter(isLowStock).length,
    isLowStock,
  });
});

router.get("/new", (req, res) => {
  res.render("items/form", {
    title: "New item",
    item: { sku: "", name: "", category: CATEGORIES[0], location: "", quantity: 0, reorderLevel: 0, unitPrice: 0 },
    categories: CATEGORIES,
    errors: [],
    action: "/items",
    mode: "create",
  });
});

router.post("/", async (req, res) => {
  const { errors, values } = validate(req.body, req.db.data.items);
  if (errors.length) {
    return res.status(422).render("items/form", { title: "New item", item: values, categories: CATEGORIES, errors, action: "/items", mode: "create" });
  }
  const id = req.db.data.nextItemId++;
  req.db.data.items.push({ id, ...values, updatedAt: new Date().toISOString() });
  await req.db.write();
  req.flash("success", `Created ${values.sku} - ${values.name}.`);
  res.redirect("/items");
});

router.get("/:id/edit", (req, res, next) => {
  const item = req.db.data.items.find((i) => i.id === Number(req.params.id));
  if (!item) return next();
  res.render("items/form", { title: `Edit ${item.sku}`, item, categories: CATEGORIES, errors: [], action: `/items/${item.id}`, mode: "edit" });
});

router.post("/:id", async (req, res, next) => {
  const item = req.db.data.items.find((i) => i.id === Number(req.params.id));
  if (!item) return next();
  const { errors, values } = validate(req.body, req.db.data.items, item.id);
  if (errors.length) {
    return res.status(422).render("items/form", { title: `Edit ${item.sku}`, item: { ...item, ...values }, categories: CATEGORIES, errors, action: `/items/${item.id}`, mode: "edit" });
  }
  Object.assign(item, values, { updatedAt: new Date().toISOString() });
  await req.db.write();
  req.flash("success", `Updated ${item.sku}.`);
  res.redirect("/items");
});

router.post("/:id/delete", requireRole("admin"), async (req, res, next) => {
  const idx = req.db.data.items.findIndex((i) => i.id === Number(req.params.id));
  if (idx === -1) return next();
  const [removed] = req.db.data.items.splice(idx, 1);
  await req.db.write();
  req.flash("success", `Deleted ${removed.sku}.`);
  res.redirect("/items");
});

export default router;
