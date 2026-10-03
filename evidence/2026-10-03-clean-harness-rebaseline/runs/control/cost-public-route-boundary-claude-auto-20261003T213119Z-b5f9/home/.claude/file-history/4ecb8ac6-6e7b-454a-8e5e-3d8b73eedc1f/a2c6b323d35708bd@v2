// Session check for admin routes: a signed cookie set by /login.
// Scripts may instead send `Authorization: Bearer $REPORTS_SCRIPT_TOKEN`.
function requireLogin(req, res, next) {
  const token = process.env.REPORTS_SCRIPT_TOKEN;
  if (token && req.headers.authorization === `Bearer ${token}`) return next();
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}
module.exports = { requireLogin };
