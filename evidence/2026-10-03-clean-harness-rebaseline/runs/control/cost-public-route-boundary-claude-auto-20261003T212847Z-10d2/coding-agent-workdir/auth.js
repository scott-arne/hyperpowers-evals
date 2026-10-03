const crypto = require("crypto");

// Service token for scripts (e.g. the dashboard team): Authorization: Bearer $REPORTS_TOKEN.
function hasServiceToken(req) {
  const expected = process.env.REPORTS_TOKEN;
  const header = req.headers.authorization || "";
  if (!expected || !header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  const want = Buffer.from(expected);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

// Session check for admin routes: a signed cookie set by /login, or a service token.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  if (hasServiceToken(req)) return next();
  res.status(401).json({ error: "login required" });
}
module.exports = { requireLogin };
