# Approach Context: logging subsystem

## Original idea (verbatim)

"Add logging to the app so we can debug production issues."

## Clarifying questions and answers

1. **Which surface needs the logging?** (browser `app.js` / Node `src/index.js` / both via a shared module)
   → **Both, shared module.**

2. **Where should browser logs end up in production?** (structured console with a transport seam / POST to our own endpoint / third-party service such as Sentry)
   → **Structured console output now, with a documented seam so a remote sink can drop in later without changing call sites.**

3. **How should log verbosity be controlled?** (runtime switch / fixed level in code / always verbose)
   → **Runtime switch**: `localStorage` key plus a URL query parameter in the browser, `LOG_LEVEL` environment variable in Node. Verbosity must be changeable without a redeploy.

4. **How should the logger handle sensitive data?** (allowlist / denylist)
   → **Allowlist**: only explicitly-marked fields are emitted; anything unrecognized is dropped or replaced with a type marker. Fails closed.

## Codebase facts

Repository root contains exactly these files (no others, no `node_modules`, no lockfile, no CI config, no test directory):

- `index.html`
- `app.js`
- `package.json`
- `README.md`
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

No `dependencies`, no `devDependencies`, no `scripts`, no `"type"` field.

### `index.html` (complete)

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

Note: a classic script tag, not `type="module"`.

### `app.js` (complete)

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

`app.js` uses no module system at all: top-level `const`/`function` declarations in global scope. It handles a plaintext password and currently logs the username.

### `src/index.js` (complete)

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### `src/utils.js` (complete)

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

`src/*` uses CommonJS (`require` / `module.exports`).

### Constraints and existing patterns

- The two surfaces use **different and currently incompatible module systems**: a classic global-scope browser script, and CommonJS in Node. The chosen answer to question 1 requires a shared module across both.
- Zero third-party dependencies today; no build step, no bundler, no transpiler, no package manager lockfile.
- No test runner, no linter, no formatter, no CI configuration exists.
- How the page is served in production is unknown; serving from `file://` has not been ruled out.
- Git branch is `feature/webapp-enhancement`; working tree is clean.

## Question for you

Propose approaches for building this logging subsystem given the answers and facts above. Cover in particular how a single shared logger core can be consumed by both the classic-script browser surface and the CommonJS Node surface, how the runtime level switch and the allowlist redaction fit into that structure, and how the whole thing can be tested given there is no test infrastructure yet.
