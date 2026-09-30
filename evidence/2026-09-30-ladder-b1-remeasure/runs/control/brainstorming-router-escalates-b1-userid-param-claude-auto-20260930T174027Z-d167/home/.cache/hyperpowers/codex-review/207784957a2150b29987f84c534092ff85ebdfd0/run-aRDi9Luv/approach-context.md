# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

1. **Where should the userId come from?** (options offered: returned by the login
   response; passed in by the caller; a new form field)
   → **From the login response.** The server assigns it; it is not an input to
   `login()`.

2. **What should "track who logged in" actually do?** (options offered: surface it
   in the existing stub; real event tracking)
   → **"yes, it should persist, and it should work across the app — other forms
   will need it later"** (free-text answer, not one of the offered options).

3. **What does "persist" mean, and is there a backend outside this repo?**
   (options offered: client-side only with no backend; server-side record; both)
   → **Client-side only, no backend.** `API_ENDPOINT` stays a stub.

4. **How long should the stored identity survive?** (options offered:
   `localStorage` plus an explicit logout; `sessionStorage`; cookie)
   → **`localStorage`, with an explicit clear/logout path included.**

5. **What should the shared module hold and expose?** (options offered: current
   identity only; identity plus change notification; identity plus login history)
   → **Current identity only** — get / set / clear. One record, overwritten on
   each login. No subscription mechanism, no login history.

## Codebase facts

Repository root contains exactly these non-`.git` files:

```
index.html
README.md
package.json
app.js
src/index.js
src/utils.js
```

### `app.js` (loaded in the browser)

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

- `login()` is a stub. It does not contact `API_ENDPOINT`; it synchronously
  returns `{ success: true, user: username }`. It is not `async` and returns no
  promise.
- Functions are declared at top level as plain script globals. There are no
  `import`/`export` statements and no `module.exports` in this file.

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

- `app.js` is loaded with a bare `<script src>` — **no** `type="module"`.
- The form has only `username` and `password` inputs. There is no logout
  control and no second form anywhere in the repo.

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

- These use CommonJS `require` / `module.exports`. They are Node-side and are
  never referenced by `index.html` or `app.js`. The browser half and the `src/`
  half of this repo are currently disconnected.

### `package.json`

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

- No `dependencies`, no `devDependencies`, no `scripts`, no `"type"` field.
- There is no bundler, no transpiler, no test runner, no linter, and no
  formatter configured anywhere in the repo.
- There is no lockfile and no `node_modules`.

### Other constraints

- Git branch is `feature/webapp-enhancement`; working tree clean.
- No CI configuration, no `.editorconfig`, no framework.
- The page is a static file set; nothing indicates a dev server or build step.

## What to produce

Propose 2-3 genuinely different architectures for making a persisted,
client-side current-user identity available to `app.js` today and to additional
forms/pages added later, given the constraints above. Address where the shared
code lives, how it is loaded by the browser given there is no build step, how
`login()`'s contract changes, and how the stored value is cleared.
