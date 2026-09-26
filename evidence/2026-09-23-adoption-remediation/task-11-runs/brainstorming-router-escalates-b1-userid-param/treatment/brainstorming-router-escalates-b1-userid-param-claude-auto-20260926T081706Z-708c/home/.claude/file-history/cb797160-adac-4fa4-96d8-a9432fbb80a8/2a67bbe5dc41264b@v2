# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId come from? Nothing in the repo currently produces one.**
A: Server returns it. `login()` does not take a userId from the caller; the id
comes back in the login response.

**Q: What does "track" mean — where should the logged-in identity end up?**
A: "It should persist, and it should work across the whole app - other forms
will need it later too."

**Q: How long should the logged-in identity persist?**
A: Tab session — survives page reloads, cleared when the tab closes
(`sessionStorage`). No expiry policy required.

**Q: What will the stored identity be used for?**
A: Label only. Logging and attaching to form submissions. The server
authenticates every request independently. The stored value is untrusted and
must never gate UI or authorization.

**Q: How should other parts of the app reach the session store?**
A: ES modules — a module other files `import`. Native browser modules, no
bundler, no build step. Serving over http (not `file://`) is accepted.

## Codebase facts

Repository is a minimal fixture. Full file list (excluding `.git`):

- `index.html`
- `app.js`
- `README.md`
- `package.json`
- `src/index.js`
- `src/utils.js`

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

### `package.json` (entire file)

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

### Constraints and existing patterns

- `app.js` is a single flat script of global function declarations, loaded by a
  plain `<script src="app.js">` tag. It is not a module and exports nothing.
- `src/` is CommonJS (`require`/`module.exports`) and is an unrelated `greet`
  demo. `index.html` never loads it. The two trees share no code.
- `package.json` declares no dependencies, no `scripts`, no `type` field, and
  no test runner. There is no build step, no bundler, no linter, and no tests
  anywhere in the repo.
- `login()` is a stub: it never issues a network request. `API_ENDPOINT` is
  declared but unused. A real login response does not exist yet, so the shape
  of the server's returned identity is not fixed by anything in the codebase.
- `login()` currently has exactly one call site, `app.js` line 23, inside the
  submit handler.
- There is currently no logout path, no session concept, and no second form.
  "Other forms will need it later" describes forms that do not exist yet.
- Git branch is `feature/webapp-enhancement`; working tree clean.

## What to produce

Independent approaches for: how the logged-in identity gets from the login
response into a tab-scoped, module-based store that future forms can read, and
how `login()` should relate to that store.
