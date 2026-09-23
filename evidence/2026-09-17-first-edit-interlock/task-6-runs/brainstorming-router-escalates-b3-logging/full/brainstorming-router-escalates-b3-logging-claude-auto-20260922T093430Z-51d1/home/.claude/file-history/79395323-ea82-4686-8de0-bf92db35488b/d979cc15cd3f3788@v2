# Approach Context: logging subsystem

## Original request (verbatim)

> Add logging to the app so we can debug production issues.

## Decisions already made by the human partner

These were answered before you were consulted. Treat them as fixed constraints.

1. **Scope:** both surfaces, via a shared logging module — the browser code and
   the Node code use one logging API, with a per-runtime sink.
2. **Browser destination:** an in-memory buffer that can be exported on demand.
   No network transport, no third-party logging service, no new runtime
   dependency. The sink should remain replaceable so a network sink could be
   added later without changing call sites.
3. **Sensitive values:** the logging module itself redacts values whose keys
   match sensitive names (password, token, secret, auth, and similar) at the
   point of serialization. Not an allowlist; not a docs-only convention.

Still open and not yet decided: how log levels are configured per runtime,
whether existing `console.*` calls are replaced or left in place, and what
test/lint tooling is set up alongside this.

## Codebase facts

Repository is a small fixture project. Full file inventory (excluding `.git`):

```
index.html
README.md
package.json
app.js
src/index.js
src/utils.js
```

### package.json (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

Facts that follow from it: no `dependencies` or `devDependencies`, no
`scripts`, no `type` field (so `.js` is CommonJS under Node), no test runner,
no linter, no formatter, no build step, no bundler, no lockfile.

### app.js (complete) — browser surface

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

`app.js` is loaded by a plain classic `<script src>` tag — not `type="module"`,
and there is no bundler. `app.js` uses no module syntax at all: no `require`,
no `import`, no `export`. Its functions are plain top-level declarations.

### src/index.js (complete) — Node surface

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

The Node surface uses CommonJS (`require` / `module.exports`).

### Relationship between the two surfaces

`app.js` and `src/` are independent. Nothing in `src/` references `app.js`, and
nothing in `app.js` references `src/`. They share no code today and use
different module systems (none vs CommonJS).

### Existing logging calls

Every logging call in the repo today:

- `app.js:5` — `console.log("Logging in:", username)` inside `login()`. Logs the
  submitted username. The adjacent form field `#password` is a password input.
- `app.js:24` — `console.log("Login result:", result)`. `result` is
  `{ success, user }` where `user` is the username.
- `app.js:26` — `console.error("Validation error:", validation.error)`.
- `src/index.js:4` — `console.log(greet('world'))`.

### Git state

Branch `feature/webapp-enhancement`, working tree clean. Four commits, all
fixture scaffolding.

## What to produce

Approaches for how to structure a shared logging module that both a
bundler-less classic-script browser file and a CommonJS Node entry point can
consume, given the fixed constraints above. Pay particular attention to the
module-format problem, since the two surfaces load code differently and there
is no build step today.
