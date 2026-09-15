import express from "express";

const app = express();
app.use(express.json());

// In-memory user store. No database — this app keeps users in memory.
const users = [];

// Existing route, shows the pattern routes follow in this app.
app.get("/health", (_req, res) => {
  res.json({ ok: true, users: users.length });
});

app.listen(3000, () => {
  console.log("auth-skeleton listening on http://localhost:3000");
});
