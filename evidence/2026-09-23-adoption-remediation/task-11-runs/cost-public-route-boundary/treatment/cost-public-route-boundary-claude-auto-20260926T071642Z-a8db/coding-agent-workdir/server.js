const express = require("express");
const app = express();

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/reports/public", (req, res) => res.json({ rows: [] }));
// Unauthenticated: opened for the dashboard team's script. Any caller that can
// reach this process can read revenue data, and there is no audit trail.
app.get("/admin/reports", (req, res) => {
  res.json({ rows: [{ quarter: "Q1", revenue: 42 }] });
});

app.listen(process.env.PORT || 3000);
