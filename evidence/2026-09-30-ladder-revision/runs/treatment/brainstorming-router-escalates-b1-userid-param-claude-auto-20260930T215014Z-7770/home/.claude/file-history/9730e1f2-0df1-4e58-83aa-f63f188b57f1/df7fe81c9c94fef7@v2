# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

When asked where the user ID would come from, given that nothing in the app
produces one today, the human partner clarified, verbatim:

> A real user ID for the person. It should work across the app and persist,
> and other forms will need it later.

## Clarifying questions and answers

1. **Where does the authoritative user ID come from?** (`app.js` never
   actually calls `API_ENDPOINT` today.)
   → **The login API returns it.** Implement the real call to
   `API_ENDPOINT`; the login response carries the user ID.

2. **How long should the user ID persist, and where should it live?**
   → **`sessionStorage` for the user ID** (survives refresh, dies with the
   tab). The auth token is to be kept *separate* — in memory or in an
   `HttpOnly` cookie — and never written to web storage.

3. **What should "track who logged in" actually do with the event?**
   → **An internal event module.** Own a small tracking function that logs
   to the console today and has one obvious seam to swap in a real
   destination later. No third-party analytics SDK, no consent obligation
   at this stage.

4. **How should new modules be wired into the page?** (`app.js` is currently
   a plain `<script>` tag with no build step.)
   → **Native ES modules** (`<script type="module">`, `import`/`export`).
   No bundler, no dependencies.

5. **Tooling to set up as part of this work?** (repo has no test runner,
   linter, or `package.json` scripts.)
   → **Unit tests only** — a runner plus a first passing test. No linter,
   no end-to-end tests at this stage.

## Codebase facts

Repository root contains: `index.html`, `app.js`, `README.md`,
`package.json`, `src/index.js`, `src/utils.js`. Total 64 lines across all
six files. Git branch `feature/webapp-enhancement`, working tree clean.

### `app.js` (28 lines) — the browser app, loaded by `index.html`

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
- `login` is synchronous and is a stub: it never performs a network call.
- `login` has exactly one caller, the submit handler at line 23, in this
  same file.
- `login` is not exported and is not referenced anywhere else in the repo
  (verified by grep across the tree).
- The submit handler is registered at module top level against
  `document.getElementById("login-form")` with no DOM-ready guard.
- Nothing currently persists anything; there is no storage access anywhere
  in the repo.

### `index.html` (15 lines)

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

The form collects only `username` and `password`. There is no user-ID
field. There is exactly one HTML page in the repo.

### `src/` — unrelated CommonJS Node code

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

These two files use CommonJS, are Node-targeted, and have no connection to
the browser app. `package.json` names `src/index.js` as `main`. The repo
therefore already contains two incompatible module conventions.

### `package.json` (6 lines)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `scripts`, no `dependencies`, no `devDependencies`, no `type` field. No
lockfile and no `node_modules` in the repo.

### Constraints

- Zero runtime dependencies is the current state; the decision above rules
  out a bundler and a third-party analytics SDK.
- The backend at `api.example.com/login` is to be treated as real, but its
  response shape is not documented anywhere in this repo and is therefore
  unknown.
- The auth token must not be written to `localStorage` or `sessionStorage`.
- Future consumers ("other forms") do not exist in the repo yet.

## What to produce

Independent approaches to the overall design: how identity is obtained,
stored, exposed to current and future consumers, and how the login event is
tracked — including how the existing synchronous `login` and its single
caller change.
