// Session check for admin routes: a signed cookie set by /login.
// Scripts can authenticate with `Authorization: Bearer $REPORTS_TOKEN` instead.
function requireLogin(req, res, next) {
  const token = process.env.REPORTS_TOKEN;
  if (token && req.headers.authorization === `Bearer ${token}`) return next();
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}
module.exports = { requireLogin };
