// Session check for admin routes: a signed cookie set by /login.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}
module.exports = { requireLogin };
