# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId come from?** (options offered: derive from the login
response; caller-supplied third parameter; client-generated correlation ID)

A: "Not sure about internals — what I need is that it works across the app, that
it persists, and other forms will need it later too."

**Q: What should this ID actually identify?** (options: both device + account
linked; authenticated user only; anonymous device only)

A: Both, linked — an anonymous device ID always available, associated with the
account ID once a login succeeds.

**Q: Where should tracking events be sent?** (options: console only for now
behind a swappable interface; POST to own backend; third-party analytics SDK)

A: Console only for now.

**Q: How should the device ID persist in the browser?** (options: localStorage;
cookie; sessionStorage)

A: localStorage.

## Codebase facts

Repository is a small static webapp fixture. Full file inventory (no other
source files exist):

- `index.html` (15 lines)
- `app.js` (28 lines)
- `src/index.js` (7 lines)
- `src/utils.js` (5 lines)
- `package.json` (6 lines)
- `README.md` (3 lines)

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

There is exactly one HTML page and exactly one form. The script tag is a plain
classic script — not `type="module"`.

### `app.js`

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

`login()` is a stub: it never contacts `API_ENDPOINT`, and it returns
synchronously. It has exactly one call site, the submit handler in the same
file. `app.js` uses no import/export and no module system.

### `src/index.js`

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### `src/utils.js`

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

### `package.json`

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

### Constraints and existing patterns

- Two disjoint code worlds already coexist: `src/` is CommonJS run under Node
  (`require`/`module.exports`), `app.js` is a classic browser script loaded by a
  `<script src>` tag. Nothing currently bridges them and nothing imports
  `app.js`.
- No bundler, no transpiler, no build step, no dev server.
- `package.json` declares no dependencies, no devDependencies, and no `scripts`
  section. There is no test runner, no linter, and no formatter configured.
- No existing tests of any kind.
- No existing logging, analytics, storage, session, or identity code anywhere in
  the repository.
- No `.gitignore`, no CI configuration, no `type` field in `package.json`.
- Git: branch `feature/webapp-enhancement`, working tree clean.

### Scope statement from the human partner

The identity value must be available across the app, persist across visits, and
be consumable by additional forms that do not exist in the repository yet. Only
the login form exists today.
