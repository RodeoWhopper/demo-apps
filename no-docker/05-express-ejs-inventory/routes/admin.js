import { Router } from "express";
import { CATEGORIES, isLowStock } from "../lib/db.js";
import { requireRole } from "../lib/auth.js";

const router = Router();
router.use(requireRole("admin"));

router.get("/", (req, res) => {
  const items = req.db.data.items;
  const lowStock = items.filter(isLowStock).sort((a, b) => a.quantity - a.reorderLevel - (b.quantity - b.reorderLevel));
  const byCategory = CATEGORIES.map((name) => {
    const list = items.filter((i) => i.category === name);
    return {
      name,
      count: list.length,
      units: list.reduce((s, i) => s + i.quantity, 0),
      value: list.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      low: list.filter(isLowStock).length,
    };
  });
  const users = req.db.data.users.map(({ passwordHash: _ph, ...u }) => u);
  res.render("admin/index", {
    title: "Admin",
    lowStock,
    byCategory,
    users,
    totals: {
      items: items.length,
      units: items.reduce((s, i) => s + i.quantity, 0),
      value: items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    },
  });
});

export default router;
