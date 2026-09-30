# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: What should the userId parameter actually carry — a per-attempt client
correlation ID, a caller-supplied real account ID, or a server-assigned ID
returned rather than passed?**
A: "It should identify the actual user account. Yes, it should work across the
app and persist, and other forms will need it later."

**Q: Where does the real account ID come from, given `login()` currently makes
no network call?**
A: Stub, real-shaped — `login()` stays offline but produces/returns a
synthesized account ID through the same interface a real authentication
response would use, so swapping in real auth later touches one function.
Pinning down a backend contract is out of scope.

**Q: How long should the stored identity survive?**
A: `sessionStorage` — survives reloads and in-session navigation, clears when
the tab closes. No "remember me"/logout-expiry feature requested yet. The
accessor should be written so the backing store is swappable later.

**Q: How is `index.html` opened, and which module style should the identity
code use?**
A: ES modules, with the page served over http. `<script type="module">` is
acceptable; losing `file://` double-click support is acceptable. No bundler.

## Codebase facts

Repository root contains: `index.html`, `app.js`, `README.md`,
`package.json`, `src/index.js`, `src/utils.js`.

### `index.html` (15 lines, verbatim structure)

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

Note: `app.js` is loaded as a **classic script**, not `type="module"`.
The form has exactly two inputs: `#username` and `#password`. There is no
field carrying any user/account identifier.

### `app.js` (29 lines, verbatim)

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

Facts about this file:
- `API_ENDPOINT` is declared but never used. `login()` performs no network
  call and hardcodes `success: true`. There is no failure path.
- `login()` has exactly one call site: the submit handler at line 23.
- Nothing is exported; all three top-level bindings are script-scoped globals.
- There is no logout, no session concept, and no storage access anywhere.

### `src/` (unrelated to the browser app)

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

These use **CommonJS** (`require` / `module.exports`) and are not referenced
by `index.html` or `app.js`. The repo therefore contains two incompatible
module conventions and the browser side currently uses neither.

### `package.json` (verbatim)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

Facts: no `scripts`, no `dependencies`, no `devDependencies`, no `"type"`
field (so `.js` under Node defaults to CommonJS). There is **no test runner,
no linter, no formatter, and no build step** configured anywhere in the repo.

### `README.md` (verbatim)

```
# Test Project

A minimal project for Drill test scenarios.
```

### Git state

Branch `feature/webapp-enhancement`, working tree clean. Recent commits:
`df69c0e Add simple webapp fixture`, `30bc3c3 add entry point`,
`424fba3 add utils module`, `2c4adf4 initial commit`.

## What the design must deliver

1. `login` gains a user-account identifier in its signature/flow, per the
   original request.
2. The identifier identifies the actual user account (not a per-attempt trace
   ID).
3. It is reachable from elsewhere in the app ("works across the app").
4. It persists for the session via `sessionStorage`, behind a swappable
   accessor.
5. Other forms, which do not exist yet, will need to read it later.
6. The authentication itself stays stubbed but shaped like a real response.

## Task

Propose 2-3 genuinely different architectures / data models for this, with
materially different tradeoffs — not variations of one shape.
