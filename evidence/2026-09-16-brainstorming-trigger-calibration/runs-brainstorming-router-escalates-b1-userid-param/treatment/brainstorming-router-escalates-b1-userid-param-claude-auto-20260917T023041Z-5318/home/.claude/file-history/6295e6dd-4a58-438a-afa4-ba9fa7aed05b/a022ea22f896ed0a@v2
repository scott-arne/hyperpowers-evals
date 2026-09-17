# Approach Context

## Original idea (verbatim)

"Add a userId parameter to the login function so we can track who logged in."

## Clarifying questions and the human partner's answers

**Q: Where should the userId value come from, given the form only collects username and password?**
A: "It should be a real user identifier, it should persist, it should work across the app, and other forms will need it later too."

**Q: Who mints the canonical user ID — and is it known before or after authentication?**
A: Server returns it on login. (The login API responds with the canonical userId; the app persists it and other parts read it.)

**Q: Does this work include wiring login() to the real API endpoint, or does the stub stay?**
A: Keep the stub, define the contract. `login()` stays local but returns a userId in the exact shape the real endpoint will use; swap in `fetch` later in one place.

**Q: How long should the stored userId live?**
A: localStorage + explicit logout. Survives reloads, new tabs, and browser restarts. Requires a clear() path and a staleness rule so a stale ID cannot leak to the next person on a shared machine.

**Q: Can the app move to ES modules, or must it stay a no-build plain-script page?**
A: Move to ES modules (`<script type="module">`, real import/export, no bundler). Serving over http rather than `file://` is acceptable.

## Codebase facts

Repository is a minimal fixture webapp. Full file inventory (excluding `.git`):
`index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`, `src/utils.js`.

### `app.js` (entire file)

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

### `index.html` (entire file)

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

### `src/index.js` and `src/utils.js`

CommonJS Node files unrelated to the browser page:

```js
// src/index.js
const { greet } = require('./utils');
function main() { console.log(greet('world')); }
main();

// src/utils.js
function greet(name) { return `Hello, ${name}!`; }
module.exports = { greet };
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

- There is no test framework, no test directory, no test script, and no dependencies declared.
- There is no linter, formatter, bundler, or build step configured.
- `app.js` is loaded as a classic script; `login` and `validateForm` are plain globals. Nothing imports them.
- `login()` never calls `API_ENDPOINT`; it synthesizes `{ success: true, user: username }` locally.
- `login()` is synchronous and has exactly one call site (the submit handler in `app.js`).
- `login()` currently writes the identity to the browser console via `console.log`.
- There is no logout affordance anywhere in `index.html` or `app.js`.
- There is no existing storage, session, state-management, or identity module in the repo.
- `src/` (CommonJS/Node) and `app.js` (browser) currently share no code.
- Git branch is `feature/webapp-enhancement`; working tree is clean.

## What to produce

Approaches for structuring a persistent, cross-app user-identity capability for
this page, given the answers above.
