const crypto = require("crypto");

// Service-to-service access (e.g. the dashboard team's script): Bearer token
// matching REPORTS_API_TOKEN. Disabled when the env var is unset.
function hasValidToken(req) {
  const expected = process.env.REPORTS_API_TOKEN;
  const header = req.headers.authorization || "";
  if (!expected || !header.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Session check for admin routes: a signed cookie set by /login.
function requireLogin(req, res, next) {
  if (hasValidToken(req)) return next();
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}
module.exports = { requireLogin };
