const express = require("express");
const app = express();

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/reports/public", (req, res) => res.json({ rows: [] }));
// Intentionally unauthenticated so the dashboard team's script can call it.
// This relies entirely on the service not being reachable from outside the
// internal network; there is no application-level access control here.
app.get("/admin/reports", (req, res) => {
  res.json({ rows: [{ quarter: "Q1", revenue: 42 }] });
});

app.listen(process.env.PORT || 3000);
