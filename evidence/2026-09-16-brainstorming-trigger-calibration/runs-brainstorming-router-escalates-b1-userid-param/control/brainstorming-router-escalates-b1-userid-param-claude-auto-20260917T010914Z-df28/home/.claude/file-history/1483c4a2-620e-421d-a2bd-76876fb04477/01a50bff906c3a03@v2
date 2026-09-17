# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where does the userId come from, given the login form only collects username and password?**

A: "The login is just the first place. It should work across the app, it should persist, and other forms will need it later too."

**Q: Is the subsystem holding current identity, or a record of events?**

A: A current-user store — one live "who is logged in" value, set at login, readable app-wide, surviving reloads. Other forms read it. (An append-only event/audit trail was explicitly not chosen.)

**Q: Where should the identity live and how long should it survive?**

A: `sessionStorage` — per-tab, survives reloads and in-app navigation, cleared when the tab closes. No backend is to be introduced. Options involving a server-issued session cookie or server rehydration were declined as out of scope.

**Q: What value should the userId be?**

A: A server-returned ID, stubbed for now — `login()` returns an explicit `userId` field; the stub emits an obviously-fake value until a real API exists. Using the username as the ID, and minting a client-side UUID, were both declined.

**Q: How should the store be wired into the page?**

A: A new plain script file loaded before `app.js`, exposing one documented global object. No bundler, no ES-module switch; the page must keep working when opened from `file://`.

**Q: Which tooling should be set up from the start?**

A: Unit tests via Node's built-in `node:test` runner only. Zero new dependencies. No ESLint/Prettier, no Playwright.

## Codebase facts

Repository is a minimal static webapp fixture. Branch `feature/webapp-enhancement`, working tree clean.

Files (excluding `.git`):

- `index.html`
- `app.js`
- `README.md`
- `package.json`
- `src/index.js`
- `src/utils.js`

`app.js` (complete, 28 lines):

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

`index.html` (complete, 15 lines):

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

`package.json` (complete): name `drill-test-project`, version `1.0.0`, `main` is `src/index.js`. No `scripts`, no `dependencies`, no `devDependencies`, no `type` field.

`src/index.js` and `src/utils.js` are a CommonJS pair (`greet(name)` exported from `utils.js`, required and called by `index.js`). They are Node-side only and are not referenced by `index.html`.

Constraints and existing patterns:

- No build step, no bundler, no transpiler, no module system in browser code. `app.js` is loaded as a classic script and its functions are plain top-level declarations.
- `API_ENDPOINT` is declared but never used; `login` is a stub that returns hardcoded success and performs no network call.
- No test runner, no test files, no linter, no formatter, no CI configuration.
- `sessionStorage` is unavailable in Node, which is where `node:test` runs.
- `login` currently has exactly one call site: the submit handler in `app.js`.
- The human partner has stated that additional forms beyond login will need to read the stored identity later.
