/** Minimal session-backed flash messages: req.flash(type, message) -> res.locals.flash on the next GET. */
export function flash(req, res, next) {
  req.flash = (type, message) => {
    if (!req.session) return;
    (req.session.flash ??= []).push({ type, message });
  };
  res.locals.flash = [];
  if (req.method === "GET" && req.session?.flash?.length) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  }
  next();
}
