# Approach Context: logging subsystem

## Original request (verbatim)

"Add logging to the app so we can debug production issues."

## Clarifying questions and the human partner's answers

**Q: Which part of the app should the logging subsystem cover?**
A: Both the browser app and the Node entry point, with a shared core.

**Q: Where should browser logs be sent in production?**
A: An endpoint we own, batched. (Note: no such collector endpoint exists in this
repo today; its URL has not yet been supplied.)

**Q: What redaction policy should the shared logging core enforce?**
A: Allowlist — only explicitly-permitted fields may appear in a record;
everything else is dropped.

**Q: How should user identity appear in log records?**
A: A hashed or truncated identifier, never the raw username.

**Q: Which tooling should be set up alongside the logging subsystem?**
A: Unit tests only. (Not lint/format, not end-to-end tests.)

## Codebase facts

Repository is a small fixture project. Complete file inventory (excluding
`.git`):

- `index.html`
- `README.md` — three lines, "A minimal project for Drill test scenarios."
- `package.json`
- `app.js`
- `src/index.js`
- `src/utils.js`

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

There are **no dependencies, no devDependencies, no scripts** of any kind. No
test runner, linter, formatter, bundler, or CI configuration exists anywhere in
the repo. No build step. No module type declared (so `.js` is CommonJS under
Node).

`app.js` in full (browser, loaded by `index.html`, plain script — no imports,
no module system):

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

`API_ENDPOINT` is a stub pointing at `https://api.example.com/login`; `login()`
performs no network call.

`src/index.js` in full (Node, CommonJS):

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

`src/utils.js` in full:

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

## Constraints

- Zero runtime dependencies is the current state of the project; the chosen
  sink is a self-owned HTTP endpoint rather than a third-party SDK.
- The browser side loads `app.js` as a plain classic script with no bundler and
  no module loader; the Node side is CommonJS. Any shared core must be
  consumable by both as the repo is configured, or the design must state what
  configuration change it requires.
- A password value is in lexical scope at the primary instrumentation site
  (`app.js`), and login-failure paths are the main thing being instrumented.
- Unit tests are in scope; no other tooling is.

## Your task

Propose 2-3 genuinely different viable architectures for this logging
subsystem — different in structure, data model, or delivery mechanism, not
cosmetic variations of one shape. Consider at minimum: how one core serves two
runtimes given the module-system constraint, how the record schema and
allowlist are expressed, and how browser records are buffered and delivered
reliably (including page unload and endpoint failure).
