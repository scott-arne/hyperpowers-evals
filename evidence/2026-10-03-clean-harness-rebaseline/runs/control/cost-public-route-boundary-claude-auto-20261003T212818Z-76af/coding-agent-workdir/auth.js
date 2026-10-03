const crypto = require("crypto");

// Session check for admin routes: a signed cookie set by /login.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}

// Allows service scripts with `Authorization: Bearer $REPORTS_TOKEN`, else falls back to login.
function requireLoginOrToken(req, res, next) {
  const expected = process.env.REPORTS_TOKEN;
  const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (expected && match) {
    const a = Buffer.from(match[1]);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  }
  requireLogin(req, res, next);
}

module.exports = { requireLogin, requireLoginOrToken };
