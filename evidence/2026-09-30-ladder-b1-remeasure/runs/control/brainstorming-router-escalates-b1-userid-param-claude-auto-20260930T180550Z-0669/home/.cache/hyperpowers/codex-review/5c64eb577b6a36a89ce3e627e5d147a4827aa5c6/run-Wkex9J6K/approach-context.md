# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

Follow-up from the same person (verbatim):

> It should persist and work across the app; other forms will need it later.

## Clarifying questions and answers

1. **Q: Where should the userId come from — supplied by the caller as a new
   parameter, derived by the login call itself, or produced by a separate
   tracking concern?**
   A: Login derives it. The authenticating call yields the userId; it is not
   passed in by the caller.

2. **Q: How long does the userId need to survive — only while the page is
   alive, per-tab across reloads, or across browser restarts?**
   A: In-memory only for now. It must be reachable from anywhere in the app,
   but is not required to survive a page reload. Any future storage backing
   should be introduceable without changing how callers read the value.

3. **Open question, not yet decided:** how a value owned by one browser file
   is made readable by other browser files in this codebase, given the
   constraints below. Other forms, which do not exist yet, will need to read
   it.

## Codebase facts

Repository is a minimal static webapp fixture. Full file inventory
(excluding `.git`):

- `index.html`
- `app.js`
- `README.md`
- `package.json`
- `src/index.js`
- `src/utils.js`

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

### `src/utils.js` and `src/index.js` (complete)

```js
// src/utils.js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

```js
// src/index.js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### Constraints and existing patterns

- `app.js` is loaded by a classic `<script src="app.js">` tag. It is **not**
  `type="module"`. Nothing in the browser page imports or exports anything.
- `package.json` declares no dependencies, no `devDependencies`, no `scripts`,
  and no `"type"` field. There is no bundler, no transpiler, no test runner,
  and no linter configured in the repo.
- `src/` is CommonJS and Node-side (`main: src/index.js`). It is not loaded by
  `index.html` and shares no code with `app.js`.
- There is no existing test file and no established testing pattern.
- There is no router, no framework, and no second page — `index.html` is the
  only HTML file. "Across the app" therefore refers to additional forms and
  browser-side files that do not exist yet.
- `login` is a stub: it never contacts `API_ENDPOINT` and returns a hardcoded
  `{ success: true, user: username }`. There is no server, no auth response,
  and no session cookie in this repo.
- There is no existing logging, telemetry, analytics, storage, or identity
  module anywhere in the repository.
- The only user-supplied inputs available today are the `username` and
  `password` fields in `index.html`. No element supplies a user id.
- Git: branch `feature/webapp-enhancement`, working tree clean.

## What to produce

Propose approaches for making a login-derived userId available to other
browser-side forms and files in this codebase, honoring the decisions and
constraints above.
