# Approach Context: logging subsystem

## Original idea (verbatim)

> Add logging to the app so we can debug production issues.

## Clarifying questions and answers

1. **Which surface does the logging need to cover?** (browser `app.js` only / Node `src/index.js` only / both with a shared core)
   Answer: "It should work across the app, wherever we have code running." — i.e. both runtimes, shared core.

2. **Where should browser logs land in production?** (app-owned POST endpoint / third-party service / console only with sink deferred)
   Answer: app-owned POST endpoint. Console transport by default, remote HTTP transport enabled by config.

3. **What redaction policy should the remote transport enforce?** (deny-by-default allowlist / denylist key scrubbing / none)
   Answer: deny-by-default allowlist. Only explicitly declared-safe fields are serialized and sent; console transport may stay verbose locally.

4. **What should generate log records?** (global error handlers + explicit call sites / explicit call sites only / also wrap fetch)
   Answer: global handlers (`window.onerror`, `unhandledrejection` in the browser; `uncaughtException`, `unhandledRejection` in Node) plus converting existing `console` calls. No fetch instrumentation for now.

## Codebase facts

Repository root contains exactly these non-git files:

- `index.html`
- `README.md` (3 lines, "A minimal project for Drill test scenarios.")
- `package.json`
- `app.js`
- `src/index.js`
- `src/utils.js`

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

Facts: no `dependencies`, no `devDependencies`, no `scripts` (so no test script,
no build step, no lint config). No `"type": "module"` field. No lockfile, no
`node_modules`, no bundler config, no CI config, no test directory, no
`.editorconfig`, no linter config files.

### `app.js` (complete, 28 lines)

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

Facts:
- Browser-targeted. Uses `document`, no `require`/`import`, no exports. Declares
  top-level `const`/`function` in global script scope.
- `API_ENDPOINT` points at `https://api.example.com/login` and is never used;
  `login()` is a stub that returns a literal and performs no network call.
- Currently logs the username in plaintext on every login attempt, and `login()`
  receives the password as its second argument.
- No module system available to it as the repo stands (no bundler, no build).

### `src/index.js` (complete, 7 lines)

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### `src/utils.js` (complete, 5 lines)

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

Facts: Node, CommonJS (`require` / `module.exports`). Runs to completion and
exits; it is not a long-lived server process.

### `index.html`

Present in the repo; `app.js` binds to elements with ids `login-form`,
`username`, and `password`, so the markup supplies those.

### Repository / VCS facts

- Git repo, current branch `feature/webapp-enhancement`, working tree clean.
- Commit history: `initial commit`, `add utils module`, `add entry point`,
  `Add simple webapp fixture`.

### Constraints derived from the above

- The two entry points are different runtimes (browser global-script vs Node
  CommonJS) with no shared module loader between them today.
- Adding a bundler or a runtime dependency would be a new class of change for
  this repo; it currently has zero dependencies and no build step.
- There is no established testing pattern to follow — nothing to extend, and any
  test infrastructure would be introduced by this change.
- There is no confirmed backend: the only endpoint referenced is a stub pointing
  at `api.example.com`.

## Your task

Propose 2-3 genuinely different viable architectures for this logging subsystem
given the constraints and the answered decisions above. Focus on how one logger
core is shared (or deliberately not shared) across the browser global-script and
Node CommonJS runtimes with no build step, how transports are structured, and how
the deny-by-default allowlist is enforced at the boundary.
