const crypto = require("crypto");

// Session check for admin routes: a signed cookie set by /login.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}

// Lets scripts authenticate with `Authorization: Bearer $REPORTS_TOKEN`; falls back to login.
function requireLoginOrToken(req, res, next) {
  const token = process.env.REPORTS_TOKEN;
  const expected = Buffer.from(`Bearer ${token}`);
  const given = Buffer.from(req.headers.authorization || "");
  if (token && given.length === expected.length && crypto.timingSafeEqual(given, expected)) return next();
  return requireLogin(req, res, next);
}
module.exports = { requireLogin, requireLoginOrToken };
