# Approach Context

## Original request (verbatim)

> Move the API endpoint config into a new settings module so it's easier to change environments.

## Clarifying questions and answers

**Q: How should the app decide which environment's API endpoint to use?**
A: Auto-detect from hostname — the settings module maps `location.hostname` to
an endpoint set, so one identical file ships to every environment and there is
no deploy-time step.

**Q: Which environments should the settings module cover?**
A: Local + staging + production (three tiers).

## Codebase facts

Repository is a minimal static webapp fixture. Full file inventory (excluding
`.git`):

- `index.html`
- `app.js`
- `README.md`
- `package.json`
- `src/index.js`
- `src/utils.js`

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

Note: `app.js` is loaded as a **classic script** — no `type="module"`.

### `app.js`

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

`API_ENDPOINT` is currently referenced only in a comment inside `login()`; the
login call is a stub that does not perform a real fetch.

### `package.json`

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no `scripts`, no test runner, no bundler,
no transpiler, no lockfile.

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

These two files use CommonJS and are Node-side. They are not referenced by
`index.html` and are unrelated to the webapp's login flow.

## Constraints and relevant conditions

- There is no build step, bundler, or package manager install in this project.
  Any environment value must be resolvable at runtime in the browser; there is
  no mechanism to inject a value at build time.
- The project mixes two module conventions already: CommonJS under `src/`, and
  classic (non-module) browser scripts at the root.
- The repo has no established testing pattern — no test runner, no test files,
  no test script.
- The page is currently loadable directly from the filesystem (`file://`) since
  it uses a classic script tag.
- Hostnames for the three environments have not been specified by the user.

## What to produce

Propose 2-3 genuinely different viable architectures for introducing the
settings module and wiring it into the app, given the above. Focus on real
structural differences — how the settings module is loaded and what interface
it exposes to `app.js`, and how the hostname-to-endpoint resolution is
structured and made verifiable.
