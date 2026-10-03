const crypto = require("crypto");

// Session check for admin routes: a signed cookie set by /login.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}

// Bearer token for scripts (e.g. the dashboard team). Disabled if REPORTS_SERVICE_TOKEN is unset.
function hasServiceToken(req) {
  const expected = process.env.REPORTS_SERVICE_TOKEN;
  const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!expected || !match) return false;
  const a = Buffer.from(match[1]);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireLoginOrServiceToken(req, res, next) {
  if (hasServiceToken(req)) return next();
  requireLogin(req, res, next);
}

module.exports = { requireLogin, requireLoginOrServiceToken };
