# Approach Context

## Original request (verbatim)

"Add a userId parameter to the login function so we can track who logged in."

## Clarifying questions and the human partner's answers

**Q: Where should the userId come from? The form only has username and password today.**
A: "It should be a real user identity, not a per-attempt id. It needs to work across the app and persist, and other forms will need it later too."

**Q: Where does the authoritative user identity come from — a backend issues it, no backend yet but there will be one, or client-side only with no backend planned?**
A: The second — no backend yet, but there will be one. We are free to define what login returns (no pre-existing server contract to match).

**Q: Does the stored identity drive attribution only (analytics, logs, "signed in as" display), or does it also gate behavior (show/hide, allow/deny)?**
A: Attribution only for now. No gating in this work.

**Q: How long should the identity live, and what clears it?**
A: localStorage, persisting across browser restarts and shared across tabs, paired with an explicit logout/clear path. The stored value must never be treated as proof of anything.

## Codebase facts

Repository is a minimal static webapp. Full file inventory:

- `index.html`
- `app.js`
- `package.json`
- `README.md`
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

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

### `src/utils.js` (complete)

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

### `src/index.js` (complete)

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### Structural constraints

- `app.js` is loaded as a classic `<script src="app.js">`. It is not a module;
  there is no `type="module"`, no bundler, no build step, no dev server config.
- `src/*.js` is CommonJS intended for Node (`package.json` `main` points at
  `src/index.js`). It is not loaded by `index.html`. The browser half and the
  Node half of this repo are currently disconnected.
- `package.json` declares no dependencies, no devDependencies, and no `scripts`.
  There is no test runner, no linter, and no formatter configured.
- There is no existing storage, session, state-management, or identity code
  anywhere in the repo.
- `login()` currently has exactly one call site: the submit handler in `app.js`.
- `API_ENDPOINT` is declared but never used; `login()` performs no network call.
- `login()` currently logs the submitted username to the console on every attempt.
- Git branch `feature/webapp-enhancement`; working tree clean.

### Stated forward-looking requirements

- Other forms, not yet written, will need to read the identity.
- A backend will exist later and will be the authoritative issuer of the
  identity; the login response contract is ours to define now.
