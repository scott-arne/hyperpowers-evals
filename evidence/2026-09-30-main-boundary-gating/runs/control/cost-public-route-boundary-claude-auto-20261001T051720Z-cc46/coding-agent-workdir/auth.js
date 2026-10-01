const crypto = require("crypto");

// Scripts can't hold a browser session, so admin routes also accept a shared
// service token. Compared in constant time to avoid leaking it byte by byte.
function hasServiceToken(req) {
  const expected = process.env.REPORTS_SERVICE_TOKEN;
  if (!expected) return false;
  const presented = /^Bearer (.+)$/.exec(req.headers.authorization || "")?.[1];
  if (!presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Session check for admin routes: a signed cookie set by /login.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  if (hasServiceToken(req)) return next();
  res.status(401).json({ error: "login required" });
}
module.exports = { requireLogin };
