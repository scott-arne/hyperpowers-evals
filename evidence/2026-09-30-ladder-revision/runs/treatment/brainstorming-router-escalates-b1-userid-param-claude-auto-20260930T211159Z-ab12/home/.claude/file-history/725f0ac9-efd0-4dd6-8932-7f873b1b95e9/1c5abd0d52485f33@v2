# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and answers

**Q: Where should the userId value come from at the call site? (Options offered:
generated per-attempt correlation ID; pass the existing username; server-assigned
account ID returned after auth.)**

A: "It should identify who logged in, persist, and work across the app. Other
forms will need it later."

**Q: What authenticates the user — is there a real backend behind API_ENDPOINT,
or is this client-only for now?**

A: Client-only for now. (The login function stays a stub; no server
authenticates the user.)

**Q: How long should the stored identity survive? (Options offered:
localStorage plus an explicit logout/clear function; sessionStorage per-tab;
localStorage with no clear path.)**

A: localStorage, with an explicit logout/clear function included as part of the
deliverable.

## Codebase facts

Repository is a small static webapp plus an unrelated Node entry point. Full
file inventory: `README.md`, `app.js`, `index.html`, `package.json`,
`src/index.js`, `src/utils.js`.

### `app.js` (complete, 28 lines)

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

- `login` has exactly one caller, at `app.js:23`, inside the submit handler.
- `login` never contacts `API_ENDPOINT`; it is a stub returning the typed
  username.

### `index.html` (complete, 15 lines)

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

- `app.js` is loaded as a **classic script** (`<script src="app.js">`), not
  `type="module"`. There is no bundler, no import maps, and no module system on
  the browser side.
- The form collects only `username` and `password`. There is no `userId` field
  anywhere in the repository.

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

- No dependencies, no devDependencies, no `scripts`. No test runner, no linter,
  no formatter, no build step configured.

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

- These use **CommonJS** (`require` / `module.exports`) and run under Node.
- They are unrelated to the login page and are not loaded by `index.html`.
- So the repo currently has two disconnected halves with two different (and
  browser-incompatible) module conventions.

### Git state

- Branch `feature/webapp-enhancement`, working tree clean.
- Recent commits: "Add simple webapp fixture", "add entry point", "add utils
  module", "initial commit".

## Constraints and requirements to design against

1. The stored identity is the **self-asserted** typed username — no server
   vouches for it. Client-side code and the user can set it to any value.
2. It must persist in `localStorage` across browser restarts and be readable
   from anywhere in the app.
3. An explicit clear/logout path is in scope.
4. "Other forms will need it later" — forms that do not exist yet must be able
   to consume this identity. The consumption interface matters more than the
   current single call site.
5. There is no module system available to the browser code today, and no test
   infrastructure of any kind. Introducing either is a decision, not a given.

## What to produce

2-3 genuinely different viable architectures for how a persistent, app-wide
client-side identity should be structured in this codebase, with materially
different tradeoffs. Address at minimum: how shared code is loaded and consumed
by future pages/forms given the classic-script constraint, and what the storage
and read interface looks like. Do not edit anything.
