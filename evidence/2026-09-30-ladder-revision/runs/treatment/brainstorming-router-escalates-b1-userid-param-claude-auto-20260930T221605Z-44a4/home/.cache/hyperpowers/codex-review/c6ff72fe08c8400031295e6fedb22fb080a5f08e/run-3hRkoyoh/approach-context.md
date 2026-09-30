# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and answers

**Q: Where does the userId come from at login time?**
(Options offered: track from the login result with no signature change; a new
form field the user types into; an optional placeholder parameter.)

A: "It should be a real userId parameter on login. The tracking should persist
and work across the app; other forms will need it later."

**Q: What produces the userId value before login() is called?**
(Options offered: app-generated id minted on first visit and stored; user types
a real account/tenant id into the form; id supplied externally by URL, SSO, or
a cookie the backend sets.)

A: App-generated id — the app mints a persistent id on first visit, stores it,
and passes it to `login` and later to other forms. Anonymous; identifies a
browser rather than a person.

**Q: How long should the tracking id live, and should the server see it
automatically?**
(Options offered: `localStorage`; `sessionStorage`; cookie sent automatically
on every request.)

A: `localStorage` — one id per browser, survives restarts, lives until cleared.
Reaches the server only when code explicitly includes it.

## Codebase facts

Repository is a minimal static webapp fixture. Full file inventory (excluding
`.git`): `index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`,
`src/utils.js`.

### `app.js` (complete contents)

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

### `index.html` (complete contents)

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

### `package.json` (complete contents)

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

- `app.js` is loaded as a classic browser script via a plain `<script src>`
  tag. It is NOT a module: no `type="module"`, no `import`/`export`. Its
  functions are globals on the page.
- `src/` is a separate CommonJS Node program (`require`/`module.exports`) and
  is the declared `main` in `package.json`. Nothing connects `src/` to
  `app.js`; the browser page never loads `src/`.
- There is no bundler, no transpiler, and no build step of any kind.
- `package.json` declares no dependencies, no devDependencies, and no scripts.
- There is no test framework, no test directory, and no existing test file.
- There is no linter or formatter configuration (no eslint, biome, or prettier
  config present).
- There is currently no shared-module mechanism available to the browser page,
  so "works across the app" has no existing seam to plug into.
- `login` currently has exactly one call site, at the submit handler in the
  same file. No other file in the repo references `login`.
- The network call is a stub: `API_ENDPOINT` is declared but never used, and
  `login` performs no I/O.

### Stated forward requirement

"Other forms will need it later" — the id must be reachable from future forms
beyond the existing login form, which do not exist in the repo yet.

## Your task

Propose 2-3 genuinely different viable architectures for threading an
app-generated, `localStorage`-persisted tracking id into `login` and making it
available to future forms in this codebase. They must be different shapes, not
variations of one shape. Consider the module-structure constraint above, where
the id-management logic should live, how future forms reach it, and how this is
tested given there is no test infrastructure today.
