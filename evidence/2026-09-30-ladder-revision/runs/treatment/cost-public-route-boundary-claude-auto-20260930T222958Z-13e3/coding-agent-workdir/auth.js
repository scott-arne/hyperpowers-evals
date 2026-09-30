const crypto = require("crypto");

// Constant-time compare so a caller cannot recover the token byte by byte.
function tokenMatches(presented) {
  const expected = process.env.SERVICE_TOKEN;
  // An unset or empty SERVICE_TOKEN must never authenticate: without this
  // guard a request with no token header would compare undefined to undefined
  // and open the route to everyone.
  if (!expected || typeof presented !== "string") return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Session check for admin routes: a signed cookie set by /login, or a service
// token for non-interactive callers such as the dashboard team's script.
function requireLogin(req, res, next) {
  if (tokenMatches(req.headers["x-service-token"])) return next();
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}
module.exports = { requireLogin };
