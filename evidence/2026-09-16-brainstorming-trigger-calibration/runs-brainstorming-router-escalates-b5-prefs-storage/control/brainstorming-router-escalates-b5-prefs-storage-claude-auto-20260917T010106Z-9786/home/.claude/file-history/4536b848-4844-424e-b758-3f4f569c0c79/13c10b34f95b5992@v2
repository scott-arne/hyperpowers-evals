# Approach context: user preferences storage

## Original idea (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and answers

**Q: Where should preferences persist?**
Options offered: (a) device-local browser `localStorage` with a single shared
key, no backend; (b) `localStorage` namespaced by the logged-in username;
(c) server-backed per account, requiring a real backend and real auth.

**A: (a) device-local `localStorage`, single shared key, no backend.**

**Q: What preferences should this store to start?** (multi-select)
Options offered: remember-username (prefill the login form on return);
theme light/dark (preference plus toggle control plus CSS); generic store
only with no settings wired yet.

**A: Both "remember username" and "theme (light/dark)".** So the work
includes user-visible UI, not only a storage module.

## Codebase facts

Repository is a small fixture. Full file inventory outside `.git`:

- `index.html`
- `app.js`
- `README.md`
- `package.json`
- `src/index.js`
- `src/utils.js`

### `index.html` (complete)

```html
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
```

Note: classic `<script src="app.js">`, no `type="module"`. No CSS file and no
`<style>` block anywhere in the repo. No `<link>` tags.

### `app.js` (complete)

```js
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
```

Facts: `login()` is a stub that never calls `API_ENDPOINT`; it returns
`{success: true}` unconditionally. There is no session, token, cookie, or
persisted state of any kind. The submit handler is registered at top level on
script load. Functions are plain globals; there is no module system, no
exports, no IIFE.

### `src/index.js` (complete)

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### `src/utils.js` (complete)

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

Facts: `src/` is a Node CommonJS CLI that prints a greeting. It is unrelated
to the browser app — nothing imports across the boundary in either direction.
The repo therefore already contains two different module conventions: classic
browser globals in `app.js`, CommonJS in `src/`.

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

Facts: no `dependencies`, no `devDependencies`, no `scripts`, no `type` field
(so `.js` is CommonJS for Node). There is no test runner, no linter, no
formatter, no bundler, no build step, and no CI configuration anywhere in the
repo. There are no test files and no `test/` directory.

### `README.md` (complete)

```markdown
# Test Project

A minimal project for Drill test scenarios.
```

### Git state

Branch `feature/webapp-enhancement`, working tree clean. Recent commits:
`Add simple webapp fixture`, `add entry point`, `add utils module`,
`initial commit`.

## What to produce

Independent approaches for adding device-local persisted user preferences
(remember-username and light/dark theme) to this codebase. Consider, among
whatever dimensions you find load-bearing: how the preferences module is
structured and loaded given the classic-script browser app and the separate
CommonJS `src/` tree; the shape of what is written to `localStorage` and how
unknown/absent/corrupt stored values and disabled-storage environments are
handled; how defaults are expressed; how theme is applied to a page that
currently has no CSS; and what testing is feasible given there is no test
infrastructure today.
