# Approach Context

## Original idea (verbatim)

"Add user preferences storage so settings persist across sessions."

## Clarifying questions and the human partner's answers

**Q: Which half of the repo should preferences storage serve — the browser
webapp (localStorage), the Node CLI (JSON file on disk), or both via a shared
module?**
A: "The webapp is the surface. It should work across the app, and other forms
will need it later."

**Q: What should preferences storage hold in v1 — remember-username, UI
preferences such as theme, or just the plumbing with no preferences wired up?**
A: Remember username. (Only that option selected.)

**Q: How should other forms declare and access preferences — a declared schema
with per-key defaults and validators, an open key-value bag, or a declared
schema with per-form namespaces?**
A: Declared schema.

## Codebase facts

Repository is a minimal fixture project. Complete file listing (excluding
`.git`):

```
./index.html
./README.md
./package.json
./app.js
./src/index.js
./src/utils.js
```

Current branch `feature/webapp-enhancement`. Recent commits: "Add simple webapp
fixture", "add entry point", "add utils module", "initial commit". Working tree
clean.

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts. No lockfile, no
`node_modules`.

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

### Relevant constraints and existing patterns

- No build step, no bundler, no transpiler. `app.js` is loaded by a plain
  classic `<script src="app.js">` tag — not `type="module"`. Any new browser
  file must either be added as another `<script>` tag or the page must move to
  ES modules.
- `src/` uses CommonJS (`require` / `module.exports`); `app.js` uses browser
  globals and no module system at all. The two halves share no code and have no
  mechanism to do so today.
- No test runner, no test directory, no test files anywhere in the repo.
- No linter or formatter configured.
- `app.js` declares its functions as plain top-level globals and wires the
  submit listener at load time with no DOM-ready guard (the script tag is at
  end of body).
- The login flow is stubbed: `login()` does not perform a network request.
- The form handles a password field. Whatever is persisted must not include
  the password.

## What is being decided

Approaches for a browser-side user preferences storage module with a declared
schema (registered keys, per-key defaults, per-key validation), persisted so
values survive across browser sessions, with "remembered username" as the first
and only v1 preference, and with the expectation that other forms in the app
will register and use their own preferences later.

Please cover, in whatever way your approaches make relevant: the persistence
data model, how the module is loaded and exposed given the no-bundler
constraint, how corrupt or unavailable storage is handled, and how the thing
gets tested in a repo with no test infrastructure.
