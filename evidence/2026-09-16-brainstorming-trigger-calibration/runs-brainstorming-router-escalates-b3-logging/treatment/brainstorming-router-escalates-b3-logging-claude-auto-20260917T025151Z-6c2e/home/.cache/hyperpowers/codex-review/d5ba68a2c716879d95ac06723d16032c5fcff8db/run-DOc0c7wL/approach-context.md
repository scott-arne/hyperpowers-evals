# Approach Context: logging subsystem

## Original request (verbatim)

> Add logging to the app so we can debug production issues.

## Clarifying questions and answers

**Q1. Which surface needs logging, and do logs need to leave the user's machine?**
A: "It should work across the app, and the logs should persist so we can look at them later."
Interpreted as: both the browser surface and the Node surface.

**Q2. Where should the persisted logs live?**
Options offered: on-device persistence; central collection to a backend endpoint; both tiered; Node file only.
A: On-device persistence. Browser side persists locally; Node side persists to disk. No backend
exists to receive logs. The adapter boundary should permit adding a shipping adapter later.

**Q3. How should the logger handle sensitive fields in structured context?**
Options offered: allow-list (drop context fields unless explicitly declared loggable);
deny-list (scrub known-sensitive key patterns); call-site discipline only (no redaction code).
A: Allow-list.

## Codebase facts

Repository is a minimal fixture project. Complete file list (excluding `.git`):

```
index.html
README.md
package.json
app.js
src/index.js
src/utils.js
```

`package.json`:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts. No lockfile. No test runner, no linter,
no formatter, no CI configuration, no build step, no bundler, no TypeScript.

`app.js` (browser surface, loaded by `index.html`, plain script — not a module):

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

`src/index.js` (Node surface, CommonJS):

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

`src/utils.js` (CommonJS):

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

Relevant constraints and facts:

- Two distinct runtimes in one repository: a browser page using plain `<script>` globals
  (no module system, no bundler) and a Node CommonJS entry point. They currently share no code.
- Existing logging is four ad-hoc `console.log` / `console.error` call sites: `app.js:5`,
  `app.js:24`, `app.js:26`, `src/index.js:4`.
- `app.js:5` logs a username inside a function whose parameters include a plaintext password.
  `app.js:24` logs the full return value of `login()`.
- The login network call is a stub; `API_ENDPOINT` is never contacted.
- There is no backend under this repository's control.
- Git branch is `feature/webapp-enhancement`; working tree clean.

## Output required

Propose approaches for the structure of this logging subsystem: how the shared core and the
two runtime adapters are factored given the no-bundler/plain-globals browser constraint, how
records are persisted on each side, how the allow-list redaction is enforced, how persisted
logs are retrieved for debugging, and how log level is controlled at runtime in production.
