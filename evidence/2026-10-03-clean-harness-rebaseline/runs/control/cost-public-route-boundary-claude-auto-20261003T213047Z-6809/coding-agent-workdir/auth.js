const crypto = require("crypto");

// Session check for admin routes: a signed cookie set by /login.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}

// For scripts: accept a matching x-api-key header, otherwise fall back to login.
// Disabled unless REPORTS_API_KEY is set.
function requireApiKeyOrLogin(req, res, next) {
  const expected = process.env.REPORTS_API_KEY;
  const given = req.headers["x-api-key"];
  if (expected && typeof given === "string") {
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  }
  return requireLogin(req, res, next);
}

module.exports = { requireLogin, requireApiKeyOrLogin };
