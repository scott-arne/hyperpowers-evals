# Approach Context

## Original idea (verbatim from the human partner)

> Add logging to the app so we can debug production issues.

Follow-up, verbatim:

> Yes, it should work across the app. And yes, logs should persist.

## Clarifying questions and answers

**Q1. Scope — which program is "the app"?** The repo contains two separate
programs: a browser login page (`app.js` + `index.html`) and a Node entry
point (`src/index.js` + `src/utils.js`).

**A1.** Both. The logging must work across the whole app, and logs must
persist.

**Q2. Where should browser logs durably land?** Options presented: (a) capped
on-device buffer (IndexedDB) plus a user/support export flow; (b) batched
shipping to a first-party ingest endpoint; (c) a third-party error/log
service SDK.

**A2.** (a) On-device buffer plus export. No backend, no vendor, no automatic
network egress. A network sink may be added later.

**Q3. How should the logger handle sensitive data in logged payloads?**
Options presented: (a) allow-list — only declared fields recorded, everything
else redacted by default; (b) deny-list — redact known-sensitive key patterns;
(c) no structured redaction, callers are responsible.

**A3.** (a) Allow-list.

## Codebase facts

Repository: a small fixture project. Git branch `feature/webapp-enhancement`,
clean working tree. Four commits, most recent "Add simple webapp fixture".

### Files

`package.json` (complete contents):

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no `scripts` block. No lockfile. No
test runner, no linter, no formatter, no bundler, no TypeScript, no CI
configuration present anywhere in the repo.

`app.js` (complete contents):

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

`index.html` loads `app.js` with a plain `<script src="app.js">` tag — no
module type, no build step. The form has `#username` (text), `#password`
(password), and a submit button.

`src/index.js` (complete contents):

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

`src/utils.js` (complete contents):

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

`README.md`: "A minimal project for Drill test scenarios."

### Constraints and existing patterns

- Two different module systems are in play: `src/` uses CommonJS (`require`
  / `module.exports`); `app.js` is a classic browser script with no module
  system at all and relies on top-level function declarations plus direct
  DOM access at load time.
- There is no shared code between the browser half and the Node half today,
  and no directory that both currently import from.
- There is no backend. `API_ENDPOINT` points at `https://api.example.com/login`
  and the `login()` function is an explicit stub that performs no network I/O.
- Existing logging is five ad-hoc `console.log` / `console.error` calls, four
  of them in `app.js`.
- `app.js` currently logs the submitted username on every login attempt, and
  reads a password value in the same handler scope.
- No persistence of any kind exists in either half today (no file writes, no
  storage APIs).
- Node version is unpinned (no `engines` field, no `.nvmrc`).

## What to propose

Approaches for a logging subsystem that: serves both the browser half and the
Node half through one shared API; persists logs durably on each side; and
enforces allow-list redaction. Address how the shared core is packaged and
consumed given the CommonJS/classic-script split above, how persistence works
on each side, and how log records are structured.
