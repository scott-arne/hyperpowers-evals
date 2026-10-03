const express = require("express");
const { requireApiKeyOrLogin } = require("./auth");
const app = express();

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/reports/public", (req, res) => res.json({ rows: [] }));
app.get("/admin/reports", requireApiKeyOrLogin, (req, res) => {
  res.json({ rows: [{ quarter: "Q1", revenue: 42 }] });
});

app.listen(process.env.PORT || 3000);
