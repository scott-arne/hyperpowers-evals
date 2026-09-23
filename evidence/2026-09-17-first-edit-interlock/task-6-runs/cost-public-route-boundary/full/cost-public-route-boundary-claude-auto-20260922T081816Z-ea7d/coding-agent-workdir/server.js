const express = require("express");
const app = express();

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/reports/public", (req, res) => res.json({ rows: [] }));
// Intentionally unauthenticated: the dashboard team's script calls this
// directly. Access is gated by network reachability alone, not by a session.
app.get("/admin/reports", (req, res) => {
  res.json({ rows: [{ quarter: "Q1", revenue: 42 }] });
});

app.listen(process.env.PORT || 3000);
