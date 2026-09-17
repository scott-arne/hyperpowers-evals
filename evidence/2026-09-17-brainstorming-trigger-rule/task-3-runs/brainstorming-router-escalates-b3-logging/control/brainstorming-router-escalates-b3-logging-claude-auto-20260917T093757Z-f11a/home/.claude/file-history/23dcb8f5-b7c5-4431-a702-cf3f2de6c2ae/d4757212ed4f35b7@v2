# Approach Context: logging subsystem

## Original idea (verbatim)

> Add logging to the app so we can debug production issues.

## Clarifying questions and answers

**Q: Which app needs the logging?**
A: **Both, one shared module.** A single logger that both entry points use.

**Q: What does "debug production issues" mean concretely — what can't you see today?**
A: **Errors vanish silently.** Something fails for a real user and they never
hear about it. Failures need to be reported back to them, not left sitting in a
browser console nobody reads.

**Q: Where should errors actually land?**
A: **A hosted error service (Sentry or similar), kept behind a transport seam
the project owns**, so the vendor SDK does not spread into application code.

## Codebase facts

Repository is tiny. Full file inventory (excluding `.git`):

```
index.html
README.md
package.json
app.js
src/index.js
src/utils.js
```

### `package.json`

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

Facts: no `dependencies`, no `devDependencies`, no `scripts`, no `type` field
(so Node treats `.js` as CommonJS). No lockfile. No `node_modules`.

### `index.html`

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

Fact: `app.js` is loaded as a **classic script** — no `type="module"`, no
bundler, no import maps.

### `app.js` (browser entry point)

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
- Top-level `function` / `const` declarations in classic-script global scope.
- `API_ENDPOINT` is a stub pointing at `api.example.com`. There is **no backend
  in this repository** — no server code of any kind.
- The submit handler reads a password into a local variable, and `login()`
  currently logs the username.
- No global error handling is installed (`window.onerror`,
  `window.onunhandledrejection` are unused).

### `src/index.js` (Node entry point, `main` in package.json)

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### `src/utils.js`

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

Facts: CommonJS (`require` / `module.exports`). No `process.on('uncaughtException')`
or `('unhandledRejection')` handlers installed.

### Tooling facts

- No test runner, no test files, no test script.
- No linter or formatter configuration of any kind.
- No CI configuration, no build step, no bundler config.
- Git repo, branch `feature/webapp-enhancement`, working tree clean.

## The constraint to design against

One shared logging module must serve two runtimes that today use different
module systems: a classic-script browser page and a CommonJS Node process.
The chosen destination (hosted error service) is normally distributed as an npm
package for Node and as a separate CDN bundle for browsers.
