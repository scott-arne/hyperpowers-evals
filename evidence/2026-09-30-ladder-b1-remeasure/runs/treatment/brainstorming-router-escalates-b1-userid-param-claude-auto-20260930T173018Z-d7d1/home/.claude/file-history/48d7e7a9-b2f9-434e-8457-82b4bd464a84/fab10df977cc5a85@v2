# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: There's no userId in this codebase today — where should it come from?**
A: "It should persist and work across the app — other forms will need it later."

**Q: What kind of identifier is this userId meant to be?**
A: Both, kept separate — a correlation id for analytics plus an auth identity
for anything that gates behavior.

**Q: Is a real backend coming, or does this stay client-only?**
A: Unsure / not decided.

**Q: How long should the auth identity survive?**
A: `sessionStorage` — survives navigation between pages in the tab, cleared on
tab close.

## Codebase facts

Repository is a minimal static web project. Full file inventory (excluding
`.git`):

- `index.html`
- `app.js`
- `README.md`
- `package.json`
- `src/index.js`
- `src/utils.js`

### `app.js` (complete)

```javascript
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

### `src/index.js` and `src/utils.js` (complete)

```javascript
// src/index.js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

```javascript
// src/utils.js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

### Structural constraints and existing patterns

- No build step, no bundler, no transpiler. `index.html` loads `app.js` with a
  plain `<script src="app.js">` tag (classic script, not `type="module"`).
- `app.js` uses no module system at all — bare function declarations in global
  scope. `src/*.js` uses CommonJS (`require` / `module.exports`) and is a
  separate, unrelated Node entry point (`package.json` `main`); `src/` is not
  loaded by the browser page and shares no code with `app.js`.
- No dependencies, no `node_modules`, no lockfile. `package.json` declares no
  `scripts`, no `dependencies`, no `devDependencies`.
- No test framework, no test files, no test runner configured.
- No linter or formatter configured.
- `API_ENDPOINT` is declared but never used. `login` is a stub: it does not
  perform any network call and returns a hardcoded
  `{ success: true, user: username }` regardless of input. No server currently
  issues any identifier.
- `login` has exactly one call site: the submit handler in `app.js`. That
  handler has access only to the two form field values (`username`,
  `password`).
- `index.html` is currently the only page. The human partner has stated that
  "other forms will need it later", so additional pages/forms are anticipated
  but do not exist yet.
- Nothing in the repo currently reads or writes `localStorage`,
  `sessionStorage`, cookies, or any other persistence mechanism.
- Current "tracking" consists solely of `console.log` calls.

## What the design must deliver

1. A place where the current user's identity lives that survives navigation
   between pages.
2. A way `login` writes it there.
3. A way other forms/pages read it.
4. A lifetime rule and a teardown (logout) path.
5. Two separate identifiers: a long-lived correlation id for analytics, and an
   auth identity scoped per the answer above.
6. A seam such that a future server can take over issuing the auth identity.

## Output required

Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
