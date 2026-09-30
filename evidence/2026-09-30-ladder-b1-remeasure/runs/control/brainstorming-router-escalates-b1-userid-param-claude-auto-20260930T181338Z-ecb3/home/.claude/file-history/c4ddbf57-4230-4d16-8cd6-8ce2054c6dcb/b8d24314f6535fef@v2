# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

1. **Where should the userId value come from, given the form only has username and password?**
   Answer: From the login response (the server returns it; it is not passed in as a parameter).

2. **What does "track who logged in" mean concretely — where does the tracked login go?**
   Answer (free text): "It should persist, and it should work across the app - other forms will need it later."

3. **How long should the stored identity survive?**
   Answer: localStorage (survives browser restart, shared across tabs). Constraint accepted: store the userId only, never a raw auth token.

4. **How should shared code be wired so other forms can reuse it?**
   Answer: ES modules (`<script type="module">`, import/export). No bundler, no dependencies. Accepted cost: the page must be served over HTTP, not opened via `file://`.

5. **How should `login()` produce the userId, given the API is a stub?**
   Answer: Make `login()` async now and synthesize a userId in the stub body; the real `fetch` drops in later touching only `login()`.

6. **Which capabilities should the session module have in this first pass?**
   Answer: Store + read userId only. Explicitly deferred: clear/logout, expiry, cross-tab sync.

## Codebase facts

Repository root contains exactly these files (no build output, no lockfile):

- `index.html`
- `app.js`
- `package.json`
- `README.md`
- `src/index.js`
- `src/utils.js`

### `app.js` (full contents)

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

### `index.html` (full contents)

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

### `package.json` (full contents)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

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

### Structural constraints

- `app.js` is loaded as a classic script via `<script src="app.js">`. It is
  browser code operating on the DOM at load time (the `addEventListener`
  registration runs at top level, so the `login-form` element must already
  exist — it does, because the script tag is at the end of `<body>`).
- `src/` is CommonJS Node code (`require` / `module.exports`). There is no
  bundler and no build step, so `app.js` and `src/` currently cannot share
  code in either direction.
- `package.json` declares no dependencies, no `devDependencies`, no `scripts`,
  and no `"type"` field. There is no test runner, no linter, and no formatter
  configured anywhere in the repo.
- There is no existing storage, session, identity, auth, analytics, or logging
  module. There is no `userId` anywhere in the repository.
- `API_ENDPOINT` is declared but never referenced; `login()` performs no
  network call.
- There is exactly one form in the app today. The human partner has stated
  that additional forms will need the stored identity later.
- Git: branch `feature/webapp-enhancement`, clean working tree.

## Task

Propose independent approaches for making the logged-in user's id available,
persistently, to this page and to forms added later, consistent with the
answers above.
