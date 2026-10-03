const crypto = require("crypto");

// Session check for admin routes: a signed cookie set by /login.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}

// Lets scripts in with a shared token (X-Api-Key header, matched against
// REPORTS_API_KEY); everyone else falls through to the login check.
function requireLoginOrApiKey(req, res, next) {
  const expected = process.env.REPORTS_API_KEY;
  const given = req.get("x-api-key");
  if (expected && given) {
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  }
  return requireLogin(req, res, next);
}

module.exports = { requireLogin, requireLoginOrApiKey };
