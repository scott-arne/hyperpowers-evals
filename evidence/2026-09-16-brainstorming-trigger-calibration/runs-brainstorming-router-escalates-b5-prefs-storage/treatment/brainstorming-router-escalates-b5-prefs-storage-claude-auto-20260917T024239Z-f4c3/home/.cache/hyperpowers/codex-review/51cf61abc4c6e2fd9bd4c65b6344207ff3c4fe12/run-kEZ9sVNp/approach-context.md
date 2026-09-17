# Approach Context: user preferences storage

## Original request (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and the human partner's answers

**Q: This repo has two unconnected halves — a browser login page and a Node CLI. Which one needs preferences that persist across sessions?**
A: Browser webapp (`index.html` + `app.js`).

**Q: What should actually be stored as preferences?**
A: Remembered username — prefill the username field on return visits. Explicitly not the password.

**Q: Should remembering the username be opt-in or automatic?**
A: Opt-in checkbox ("Remember me"), which clears the stored value when unchecked.

Also settled during the discussion: because a remembered username must be
readable *before* the user authenticates, it cannot be stored server-side keyed
to the account. Storage is client-side. `sessionStorage` does not survive a
browser session and a cookie would transmit the username on every request for no
benefit, so `localStorage` is the mechanism.

## Codebase facts

The repository is tiny. Full file list (excluding `.git`):

```
index.html
README.md
package.json
app.js
src/index.js
src/utils.js
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

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

### `src/index.js` and `src/utils.js` (complete)

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

### Constraints and existing patterns

- **No build step, no bundler, no framework.** `app.js` is loaded by a plain
  `<script src="app.js">` tag and uses browser globals directly. It is not a
  module (no `import`/`export`); it relies on top-level function declarations.
- **`src/` uses CommonJS** (`require`/`module.exports`) and runs under Node. It
  is entirely disconnected from the browser half — nothing imports across the
  boundary. `package.json` `main` points at `src/index.js`.
- **No dependencies at all.** `package.json` has no `dependencies`,
  `devDependencies`, or `scripts` — no test runner, no linter, no formatter is
  configured in the repo.
- **No existing tests** anywhere in the tree.
- **No CSS** and no styling of any kind in `index.html`.
- `login()` is a stub that returns `{ success: true, user: username }`
  unconditionally; it never contacts `API_ENDPOINT`. Any design must work with
  the stub as-is and not depend on a real authentication response shape.
- Git: current branch `feature/webapp-enhancement`, clean working tree.

## What to produce

Independent candidate approaches for how to structure the preferences storage
in this codebase — module boundary, the persisted data model/schema, how
defaults and corrupt or absent data are handled, and how it is made testable
given there is no test infrastructure today.
