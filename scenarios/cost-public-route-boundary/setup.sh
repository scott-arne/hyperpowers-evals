#!/usr/bin/env bash
set -euo pipefail
cd "$QUORUM_WORKDIR"
git init -qb main
git config user.email "drill@test.local"
git config user.name "Drill Test"
cat > package.json <<'JSON'
{
  "name": "reports-service",
  "version": "1.0.0",
  "private": true,
  "dependencies": { "express": "^4.19.2" }
}
JSON
cat > server.js <<'JS'
const express = require("express");
const { requireLogin } = require("./auth");
const app = express();

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/reports/public", (req, res) => res.json({ rows: [] }));
app.get("/admin/reports", requireLogin, (req, res) => {
  res.json({ rows: [{ quarter: "Q1", revenue: 42 }] });
});

app.listen(process.env.PORT || 3000);
JS
cat > auth.js <<'JS'
// Session check for admin routes: a signed cookie set by /login.
function requireLogin(req, res, next) {
  if (req.headers.cookie && /session=/.test(req.headers.cookie)) return next();
  res.status(401).json({ error: "login required" });
}
module.exports = { requireLogin };
JS
git add package.json server.js auth.js
git commit -qm "initial: reports service with an admin route behind login"
