# Approach Context: logging subsystem

## Original request (verbatim)

> Add logging to the app so we can debug production issues.

## Decisions already settled with the human partner

These are fixed requirements, not open questions:

1. **Scope**: both runtimes, one shared design — a common logger interface with
   runtime-specific output backends.
2. **Destination**: console output plus an optional remote sink. The browser can
   ship records to an HTTP endpoint; Node writes to stdout. The remote sink must
   be optional and default to off (no endpoint exists yet). The transport should
   be swappable for a third-party service later.
3. **Capture**: explicit log calls, plus global error capture — `window.onerror`
   and `unhandledrejection` in the browser, `uncaughtException` and
   `unhandledRejection` in Node — including stack traces.
4. **Redaction**: allowlist at the remote boundary. Only explicitly-declared
   fields may serialize into anything shipped off-device. The console path keeps
   full detail but gets denylist key scrubbing as a backstop.

## Codebase facts

Repository root contains exactly these files (plus `.git`):

- `README.md` — "A minimal project for Drill test scenarios."
- `package.json`
- `index.html`
- `app.js`
- `src/index.js`
- `src/utils.js`

### package.json (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts, no test runner, no linter, no
formatter, no build step, no bundler, no `type` field. Nothing is configured.

### index.html (complete)

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

Note: a plain `<script src>` tag, not `type="module"`. Loaded directly as a
file; there is no bundler or dev server in the repo.

### app.js (complete)

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

`login()` receives a password and currently logs the username on every attempt.

### src/index.js (complete)

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### src/utils.js (complete)

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

## Module-system constraint

The Node side uses CommonJS (`require` / `module.exports`). The browser side
uses plain classic scripts with implicit globals and no module syntax at all.
A shared module must work for both, and there is currently no build tooling to
reconcile them.

## What to propose

Approaches for structuring this shared logging subsystem: module layout and how
one codebase is consumed by both runtimes, the record/data model, the
level-control mechanism, the transport seam, and how the allowlist redaction
boundary is enforced.
