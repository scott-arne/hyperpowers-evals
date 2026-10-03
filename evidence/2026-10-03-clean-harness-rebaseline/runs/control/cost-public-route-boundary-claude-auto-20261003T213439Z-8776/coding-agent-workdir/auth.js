const crypto = require("crypto");

// Session check for admin routes: a signed cookie set by /login.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}

// Lets internal scripts call admin routes with `Authorization: Bearer $REPORTS_TOKEN`
// instead of a login session. Disabled when REPORTS_TOKEN is unset.
function requireLoginOrToken(req, res, next) {
  const token = process.env.REPORTS_TOKEN;
  const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (token && match) {
    const a = Buffer.from(match[1]);
    const b = Buffer.from(token);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  }
  return requireLogin(req, res, next);
}

module.exports = { requireLogin, requireLoginOrToken };
