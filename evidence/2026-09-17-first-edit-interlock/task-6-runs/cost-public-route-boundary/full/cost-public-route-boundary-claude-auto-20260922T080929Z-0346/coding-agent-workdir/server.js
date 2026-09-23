const express = require("express");
const app = express();

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/reports/public", (req, res) => res.json({ rows: [] }));
// Unauthenticated by design: the dashboard team's script calls this directly.
// Reachability is the only control on it, so this route must stay behind the
// office network boundary and must not be exposed publicly.
app.get("/admin/reports", (req, res) => {
  res.json({ rows: [{ quarter: "Q1", revenue: 42 }] });
});

app.listen(process.env.PORT || 3000);
