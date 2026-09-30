# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId value come from?**
A: "It should identify the actual user, work across the app, and persist. Other forms will need it later."

**Q: Where does the canonical user identifier originate?**
A: Server-issued — the login response returns the account ID; the client stores it. The backend contract does not exist yet and must be treated as an assumption to validate.

**Q: What does the persisted client-side identity contain?**
A: Identifier only (account ID, optionally a display name). The authentication credential is to be handled as an httpOnly cookie owned by the backend, not stored in JavaScript-readable storage.

**Q: How should the shared identity module be delivered to the browser?**
A: ES modules — `<script type="module">` with native `import`/`export`. No bundler, no build step.

**Q: How long should the stored identifier survive?**
A: `localStorage` — survives browser restarts and is shared across tabs. An explicit clear path on logout is required.

## Codebase facts

Repository is a minimal static webapp fixture. Full file list (excluding `.git`):

- `index.html`
- `app.js`
- `README.md`
- `package.json`
- `src/index.js`
- `src/utils.js`

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

### `src/utils.js` and `src/index.js`

```js
// src/utils.js
function greet(name) {
  return `Hello, ${name}!`;
}
module.exports = { greet };

// src/index.js
const { greet } = require('./utils');
function main() {
  console.log(greet('world'));
}
main();
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

### Constraints and existing-state facts

- `login()` currently has exactly one caller: the submit handler in `app.js`. No other file references it.
- `login()` is a stub. It never contacts `API_ENDPOINT`; it returns `{ success: true, user: username }` synchronously.
- The browser side (`app.js`) is a classic script, not a module. The Node side (`src/`) uses CommonJS. There is no shared module system between them.
- `src/index.js` and `src/utils.js` are unrelated to login (a greet demo) and are the declared `main` of the package.
- No test runner, no test files, no linter, no formatter, no dependencies, and no `scripts` section in `package.json`.
- No storage, session, identity, routing, or state-management code exists anywhere in the repo.
- The form collects only `username` and `password`. Nothing in the app currently holds any account identifier.
- Git branch is `feature/webapp-enhancement`; working tree clean.

## What to produce

Propose 2-3 genuinely different architectures for introducing a persisted,
server-issued user identifier that `login()` participates in and that future
forms elsewhere in the app can read. Focus on the shape of the identity layer,
its interface, how `login()` becomes asynchronous (or not), how consumers
observe identity changes, and how the assumed backend contract is isolated so
it can be swapped when the real endpoint exists.
