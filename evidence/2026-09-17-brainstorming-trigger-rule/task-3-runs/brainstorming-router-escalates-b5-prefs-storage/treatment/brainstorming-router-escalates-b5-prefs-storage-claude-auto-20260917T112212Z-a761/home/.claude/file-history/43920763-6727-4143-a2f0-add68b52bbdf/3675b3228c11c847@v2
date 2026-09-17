# Approach Context: user preferences storage

## Original idea (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and the human partner's answers

**Q: Where should user preferences be stored?**
A: Browser `localStorage`, behind a preferences module with a narrow interface so the
storage backend could be swapped later. Not server-backed (no backend exists). Not a
Node-side config file.

**Q: What should the first slice include?**
A: The preferences module with tests, plus one concrete preference wired end-to-end
into the existing login form — a remembered username — to prove persistence across a
real page reload. Not a settings panel/UI. Not storage-module-only.

**Q: How should the preferences module be loaded and tested?**
A: ES module, loaded natively in the browser via `<script type="module">` and imported
directly by Node's built-in test runner (`node --test`). Not CommonJS, not a plain
global script.

**Q: Which tooling should be set up from the start?**
A: Unit tests (`node --test`) only. No ESLint/Prettier. No end-to-end/browser test
infrastructure. Keep the repo free of third-party dependencies.

## Codebase facts

Repository is a small fixture project, branch `feature/webapp-enhancement`, clean
working tree. Four commits of history. There are two unrelated groups of files.

### Browser app (the surface this feature targets)

`index.html` (whole file):

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

`app.js` (whole file):

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

Notes: `login()` is a stub that always returns success; `API_ENDPOINT` is never
called. There is no authentication, no session, no user identity beyond the typed
username. There is no settings UI of any kind.

### Unrelated Node demo module (this feature does not touch it)

`src/index.js`:

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

`src/utils.js`:

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

### Tooling and configuration

`package.json` (whole file):

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

Facts: no dependencies or devDependencies, no `scripts` block, no `type` field, no
lockfile. No test directory, no test runner, no test files. No linter or formatter
config. No build step or bundler. No CI configuration. `README.md` is three lines
describing it as "a minimal project for Drill test scenarios."

### Constraints carried from the answers

- Browser `localStorage` is the storage backend, but the module interface should not
  hard-code that assumption more than necessary.
- ES module syntax; must work both in a browser with no build step and under
  `node --test` (where `localStorage` and `window` do not exist).
- No third-party dependencies.
- Passwords must never be persisted.
- Adding `type="module"` to the `index.html` script tag is acceptable.

## What to produce

Propose 2-3 genuinely different architectures or data models for this preferences
storage layer and how the app consumes it. Consider, among whatever you think
matters: the storage schema and key layout, versioning/migration of stored data,
default values, how the module behaves when storage is unavailable or holds corrupt
data, how (or whether) changes propagate to other open tabs, and how the module is
made testable without a browser.
