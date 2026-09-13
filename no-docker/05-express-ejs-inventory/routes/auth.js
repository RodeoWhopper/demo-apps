import { Router } from "express";
import { verifyUser } from "../lib/db.js";

const router = Router();

router.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/items");
  res.render("login", { title: "Sign in", error: null, username: "" });
});

router.post("/login", (req, res, next) => {
  const { username = "", password = "" } = req.body;
  const user = verifyUser(req.db, username, password);
  if (!user) {
    return res.status(401).render("login", { title: "Sign in", error: "Invalid username or password.", username });
  }
  const returnTo = req.session.returnTo;
  // Rotate the session id on login to prevent session fixation; the CSRF token is re-issued too.
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.user = { id: user.id, username: user.username, role: user.role };
    req.flash("success", `Welcome back, ${user.username}.`);
    req.session.save((err2) => {
      if (err2) return next(err2);
      res.redirect(returnTo && returnTo.startsWith("/") ? returnTo : "/items");
    });
  });
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("depot.sid");
    res.redirect("/login");
  });
});

export default router;
