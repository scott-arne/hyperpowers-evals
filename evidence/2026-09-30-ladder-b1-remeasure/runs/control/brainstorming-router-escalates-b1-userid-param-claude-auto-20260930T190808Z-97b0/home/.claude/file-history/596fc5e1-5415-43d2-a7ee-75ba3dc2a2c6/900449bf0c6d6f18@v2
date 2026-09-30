# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and answers

**Q: What is `userId` here, given `login` already gets `username`?**
A: "The user's account ID. It should work across the app and persist, and other forms will need it later."

**Q: What should "track" actually do with it?**
A: "It should persist who logged in."

**Q: What does "persist who logged in" need to cover — client-side session state, server-side login records, or both?**
A: Both, client first. Build client-side session state now; define the server-side record contract without implementing it, because `API_ENDPOINT` is a stub in this repo.

**Q: How should the browser code share the session state (classic script + global, native ES modules, or add a bundler)?**
A: Native ES modules.

**Q: Which tooling should be set up from the start?**
A: Unit tests (a runner plus a first passing test). Lint/format and end-to-end tests were not selected.

## Codebase facts

Repository root contains: `index.html`, `app.js`, `README.md`, `package.json`, `src/index.js`, `src/utils.js`.
Git branch `feature/webapp-enhancement`, clean tree.

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

Note: `app.js` is loaded as a classic script, not `type="module"`.

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

`login` is synchronous and returns a hardcoded object. There is no network call;
`API_ENDPOINT` is referenced only in a comment. `login` has exactly one call site,
the submit handler above.

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts, no test runner.

### `src/index.js` and `src/utils.js`

```js
// src/index.js
const { greet } = require('./utils');
function main() { console.log(greet('world')); }
main();

// src/utils.js
function greet(name) { return `Hello, ${name}!`; }
module.exports = { greet };
```

These are a CommonJS Node entry point, unrelated to the browser login flow.
The repo therefore currently mixes CommonJS (Node side) with plain globals
(browser side), and has no bundler or build step.

### Relevant constraints

- No backend exists. `API_ENDPOINT` points at `api.example.com` and is never called.
- No test infrastructure exists.
- No dependencies are installed; there is no `node_modules`.
- The account ID is not available in the browser before authentication: the form
  collects only `username` and `password`.

## What to produce

Propose approaches for: representing and persisting the authenticated user's
account ID on the client so that other forms/pages can read it later, and the
contract by which the server communicates that ID and records the login event.
