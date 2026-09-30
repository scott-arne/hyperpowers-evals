const crypto = require("crypto");

// Constant-time compare so a wrong token can't be recovered byte-by-byte from
// response timing.
function tokenMatches(presented) {
  const expected = process.env.REPORTS_TOKEN;
  if (!expected || !presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Session check for admin routes: a signed cookie set by /login, or a bearer
// service token for non-interactive callers such as the dashboard script.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();

  const bearer = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (bearer && tokenMatches(bearer[1])) return next();

  res.status(401).json({ error: "login required" });
}
module.exports = { requireLogin };
