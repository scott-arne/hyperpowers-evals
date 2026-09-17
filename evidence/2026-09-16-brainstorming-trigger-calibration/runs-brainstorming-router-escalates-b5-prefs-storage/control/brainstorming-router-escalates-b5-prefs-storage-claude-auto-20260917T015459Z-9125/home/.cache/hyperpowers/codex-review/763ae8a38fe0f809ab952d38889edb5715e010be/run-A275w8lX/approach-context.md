# Approach Context: user preferences storage

## Original idea (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and answers

**Q: Which runtime should preferences storage serve?**
A: Browser. localStorage-backed, serving the login page in index.html/app.js.
Synchronous API, per-device data. (Rejected: a Node-side JSON file for
`src/index.js`; and a dual-backend module with pluggable localStorage/fs
adapters.)

**Q: Which preferences should the first version store?**
A: Two, both: (1) remembered username, pre-filling the username field on
return visits, toggled by a "Remember me" checkbox; (2) theme (light/dark),
a toggle whose choice survives reload. (Rejected: last-visit timestamp.)

**Q: What tooling should be set up alongside this?**
A: Unit tests only — a runner plus a first passing test for the preferences
module. (Rejected: ESLint+Prettier; Playwright end-to-end tests; and
shipping with no test infrastructure.)

## Codebase facts

Repository is a small fixture project. Complete file inventory (excluding
.git):

- `index.html`
- `app.js`
- `package.json`
- `README.md`
- `src/index.js`
- `src/utils.js`

### `index.html` (15 lines, verbatim)

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

### `app.js` (28 lines, verbatim)

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

### `package.json` (verbatim)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

### `src/index.js` and `src/utils.js`

```js
// src/index.js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

```js
// src/utils.js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

### Constraints and existing patterns

- No dependencies of any kind. `package.json` has no `dependencies`,
  `devDependencies`, or `scripts` block. No lockfile. No `node_modules`.
- No build step, bundler, or transpiler. `index.html` loads `app.js` through
  a plain `<script src>` tag — not `type="module"`.
- Two disconnected halves that share no code: the browser pair
  (`index.html` + `app.js`) and the Node CommonJS pair (`src/index.js` +
  `src/utils.js`). `app.js` sits at the repo root, not in `src/`.
- Module systems differ by half: `src/` uses CommonJS
  (`require` / `module.exports`); `app.js` uses none at all — its functions
  are bare top-level declarations sharing global scope.
- `app.js` runs its DOM wiring at top-level on load, with no DOMContentLoaded
  guard and no exported entry point.
- There is no existing settings, config, preferences, or storage code
  anywhere in the repo, and no persistence of any kind.
- There is no test runner, no test directory, and no existing test file.
- No CI configuration, no linter config, no formatter config.
- Git: branch `feature/webapp-enhancement`, clean tree, 4 commits, all
  fixture scaffolding.

### Decided constraint carried into the design

The password is never persisted. localStorage is readable by any script on
the origin and persists indefinitely, so "Remember me" covers the username
only.

## Your task

Propose 2-3 genuinely different viable architectures, algorithms, or data
models for this preferences storage subsystem, with materially different
tradeoffs — not variations of a single shape. Consider at least: the storage
data model (one serialized blob under a single key vs. one key per
preference vs. something else), how defaults and unknown/corrupt stored
values are handled, schema evolution as preferences are added or renamed,
the module/consumer boundary given there is no bundler and no module system
in the browser half, and how the design stays unit-testable given
localStorage is a browser global absent in Node.

Output exactly this shape:

```markdown
Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
```

Do not edit anything.
