# Approach Context

## Original request (verbatim)

> Add logging to the app so we can debug production issues.

## Clarifying questions and the human partner's answers

1. **Where do log records need to end up for you to debug a production issue?**
   Options offered: structured console output behind a pluggable sink seam; ship
   to our own remote collector; third-party SDK (Sentry etc.).
   **Answer: structured console output with a pluggable sink seam.** No remote
   shipping now; the seam exists so remote shipping can be added later without
   rewriting call sites. No new dependencies, no backend.

2. **Which runtime should the logger cover?**
   Options offered: browser only; both browser and Node via a shared ESM module
   (requires converting the repo to ESM); both with two separate loggers sharing
   a record shape.
   **Answer: browser only.** `src/index.js` keeps its existing `console.log`.
   No ESM conversion.

3. **How should the logger handle sensitive values like the password field?**
   Options offered: deny-list scrub inside the logger; allow-list of permitted
   fields; call-site discipline with no central enforcement.
   **Answer: deny-list scrub.** The logger recursively replaces values under
   known sensitive keys (`password`, `token`, `secret`, `authorization`,
   `apiKey`) with `[redacted]`. Username is logged in full for now.

4. **How much should the logger instrument?**
   Options offered: existing call sites only; existing call sites plus global
   error capture plus a session ID; all of that plus lifecycle/timing records.
   **Answer: existing call sites + global error capture (`window.onerror`,
   `unhandledrejection`) + a per-page-load session ID stamped on every record.**
   Timing instrumentation explicitly excluded.

5. **Which tooling should I set up as part of this work?**
   Options offered: unit tests via `node:test`; lint + format; browser E2E;
   none.
   **Answer: unit tests via `node:test` only.** Keeps the repo at zero runtime
   and dev dependencies. No linter, no E2E.

## Codebase facts

Repository root contains: `README.md`, `app.js`, `index.html`, `package.json`,
`src/index.js`, `src/utils.js`. Branch `feature/webapp-enhancement`, clean
working tree. Four commits total; the most recent is "Add simple webapp
fixture".

`package.json` (complete):

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `dependencies`, no `devDependencies`, no `scripts`, no `type` field. No
lockfile, no `node_modules`, no bundler, no build step, no test runner, no
linter config anywhere in the repo.

`index.html` (complete) loads `app.js` as a classic script:

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

`app.js` (complete, 28 lines) — a classic script, no imports/exports, four
`console.*` call sites:

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

`login()` is a stub that returns a hardcoded success object; it never contacts
`API_ENDPOINT`. `validateForm` receives an object containing the plaintext
password.

`src/index.js` (complete) — CommonJS, a separate Node entry point unrelated to
the browser app:

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

`src/utils.js` (complete):

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

## Constraints derived from the answers

- Browser-targeted code must run as a classic script (no ESM, no bundler,
  no build step), because `index.html` loads `app.js` with a plain
  `<script src>` tag and the answer to Q2 ruled out converting the repo.
- Test code runs under Node's built-in `node:test` runner, so whatever holds
  the logger's logic must be loadable from Node without a build step.
- Zero dependencies, runtime and dev.
- Redaction must be enforced centrally inside the logger, not at call sites.

## What to produce

Propose 2-3 genuinely different architectures for how the logging code is
structured and wired into this repo given the constraints above — how the
logger's code is organized, how browser code obtains it, how records are
shaped, how the sink seam is expressed, and how the logic is made reachable
from Node's test runner. Do not propose alternatives to the five decisions
already made above; those are settled.
