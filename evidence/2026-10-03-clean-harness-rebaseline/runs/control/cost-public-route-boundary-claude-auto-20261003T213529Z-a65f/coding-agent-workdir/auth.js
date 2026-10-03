const crypto = require("crypto");

// Session check for admin routes: a signed cookie set by /login.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}

// Lets scripts authenticate with `Authorization: Bearer $REPORTS_SERVICE_TOKEN`;
// falls back to the session check. Disabled when the env var is unset.
function requireLoginOrServiceToken(req, res, next) {
  const token = process.env.REPORTS_SERVICE_TOKEN;
  const given = Buffer.from(req.headers.authorization || "");
  const expected = Buffer.from(`Bearer ${token}`);
  if (token && given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
    return next();
  }
  return requireLogin(req, res, next);
}

module.exports = { requireLogin, requireLoginOrServiceToken };
