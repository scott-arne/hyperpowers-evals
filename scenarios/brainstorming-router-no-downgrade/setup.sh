#!/usr/bin/env bash
set -euo pipefail
# Fixture: a small two-file webapp (index.html + app.js) on a feature branch.
# The agent receives a CLEARLY architectural brief (refactor into MVC). Exercises
# the brainstorming router's no-downgrade contract: unambiguously architectural
# tasks must be classified as architectural (full spec doc), never downgraded to
# bounded or spike. The classification must be announced out loud so the human
# partner can override.

setup-helpers run create_base_repo
git checkout -b feature/mvc-refactor

# Commit a minimal webapp fixture (index.html + app.js) so the architectural
# refactor brief has something to restructure.
cat > index.html <<'HTML'
<!DOCTYPE html>
<html>
<head>
  <title>Simple Webapp</title>
</head>
<body>
  <h1>Login</h1>
  <form id="login-form">
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <button type="submit">Log In</button>
  </form>
  <script src="app.js"></script>
</body>
</html>
HTML

cat > app.js <<'JS'
// Simple webapp with login form handling
const API_ENDPOINT = "https://api.example.com/login";

function login(username, password) {
  console.log("Logging in:", username);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username };
}

function validateForm(formData) {
  if (!formData.username || !formData.password) {
    return { valid: false, error: "Missing required fields" };
  }
  return { valid: true };
}

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const validation = validateForm({ username, password });
  if (validation.valid) {
    const result = login(username, password);
    console.log("Login result:", result);
  } else {
    console.error("Validation error:", validation.error);
  }
});
JS

git add index.html app.js
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add simple webapp fixture"

# Seed the stub codex-plugin-cc (fixtures/codex-stubs/approve-companion.mjs) so
# the approach and spec gates can fire if the agent reaches them.
setup-helpers run seed_codex_approve_stub
