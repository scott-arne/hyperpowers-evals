#!/usr/bin/env bash
set -euo pipefail
# Fixture: an existing settings page (public/settings.html) rendered as one long
# flat list of fields, on a feature branch. The agent receives a brief that is
# CLEARLY bounded (relayout a page that already exists here) but whose open
# question is genuinely VISUAL (what would the regrouped layout actually look
# like). Exercises the brainstorming visual companion on the BOUNDED path: the
# companion's trigger is path-independent, so a layout question must open it
# even though the task never escalates past a short in-chat design.
#
# Regression guard for the three-path router (69a703a), which scoped the
# companion step into the architectural checklist only and left bounded — the
# modal path for work in an existing repo — with no mention of it at all.

setup-helpers run create_base_repo
git checkout -b feature/settings-layout

mkdir -p public

cat > public/settings.html <<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Settings</title>
  <link rel="stylesheet" href="settings.css">
</head>
<body>
  <main class="settings">
    <h1>Settings</h1>

    <form id="settings-form">
      <label>Display name <input type="text" name="displayName"></label>
      <label>Email <input type="email" name="email"></label>
      <label>Avatar URL <input type="url" name="avatarUrl"></label>
      <label>Time zone <input type="text" name="timeZone"></label>
      <label>Language <input type="text" name="language"></label>
      <label>Theme <input type="text" name="theme"></label>
      <label>Email notifications <input type="checkbox" name="notifyEmail"></label>
      <label>Push notifications <input type="checkbox" name="notifyPush"></label>
      <label>Weekly digest <input type="checkbox" name="notifyDigest"></label>
      <label>Two-factor auth <input type="checkbox" name="twoFactor"></label>
      <label>Session timeout (minutes) <input type="number" name="sessionTimeout"></label>
      <label>API token <input type="text" name="apiToken"></label>

      <button type="submit">Save</button>
    </form>
  </main>
  <script src="settings.js"></script>
</body>
</html>
HTML

cat > public/settings.css <<'CSS'
body {
  font-family: system-ui, sans-serif;
  margin: 0;
  background: #f6f7f9;
}

.settings {
  max-width: 640px;
  margin: 3rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 8px;
}

.settings h1 {
  margin-top: 0;
  font-size: 1.5rem;
}

#settings-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

#settings-form label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

#settings-form button {
  align-self: flex-start;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
}
CSS

cat > public/settings.js <<'JS'
// Collects the settings form into a plain object and POSTs it.
document.getElementById('settings-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
});
JS

git add public
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Add settings page"
