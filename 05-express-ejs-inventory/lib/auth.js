export function attachUser(req, res, next) {
  res.locals.user = req.session.user ?? null;
  res.locals.currentPath = req.path;
  next();
}

export function requireLogin(req, res, next) {
  if (req.session.user) return next();
  req.session.returnTo = req.originalUrl;
  req.flash("warning", "Please sign in first.");
  res.redirect("/login");
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return requireLogin(req, res, next);
    if (req.session.user.role !== role) {
      return res.status(403).render("error", {
        status: 403,
        title: "Forbidden",
        message: `This area requires the "${role}" role. You are signed in as "${req.session.user.role}".`,
      });
    }
    next();
  };
}
