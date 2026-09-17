# Approach Context

## Original request (verbatim)

> Move the API endpoint config into a new settings module so it's easier to change environments.

## Clarifying questions and the human partner's answers

**Q1. How should the app determine which environment's API endpoint to use?**
Options offered: (a) runtime selection by hostname, all environments in one
file; (b) one file per environment swapped at deploy; (c) single file edited by
hand.
**Answer: (a) runtime selection by hostname.**

**Q2. How should the settings module be loaded into the browser app?**
Options offered: (a) ES modules (`export`/`import`, `<script type="module">`);
(b) global script tag setting `window.AppSettings`, loaded before `app.js`;
(c) add a bundler (Vite/esbuild).
**Answer: (a) ES modules.**

**Q3. What shape should the per-environment settings take?**
Options offered: (a) base URL per environment, call sites compose paths;
(b) full endpoint URLs per environment.
**Answer: (a) base URL.**

**Q4. Which environments should the settings module define?**
Options offered: (a) local, staging, production; (b) local and production only.
**Answer: (a) local, staging, production.**

## Codebase facts

Repository root contains: `README.md`, `app.js`, `index.html`,
`package.json`, `src/`.

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
`node_modules`, no bundler, no test runner, no linter/formatter config
anywhere in the repo.

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

Note: `API_ENDPOINT` is declared but never actually read — `login()` is a stub
that only logs. There is currently no network call anywhere in the repo.

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

`app.js` is loaded as a classic script (not a module). Everything in it is a
top-level global. There is no import graph.

### `src/` tree

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

The `src/` tree is CommonJS and is a Node-side `greet` demo. It is entirely
disconnected from `app.js` / `index.html` — nothing in the browser app
references it and nothing in it references the browser app.

### Git state

Branch `feature/webapp-enhancement`, working tree clean. Recent commits:
`Add simple webapp fixture`, `add entry point`, `add utils module`,
`initial commit`.

### Constraints that follow from the above

- No build step exists, so nothing can substitute values at package time.
- No test infrastructure exists; whether to add any is an open question.
- ES modules do not load over the `file://` protocol, so the chosen ESM
  approach implies the page must be served over HTTP for local development,
  and no dev server is currently configured.
- Concrete hostnames for staging and production have not been supplied by the
  human partner.

## Task for you

Propose approaches for implementing this change, given the answers above are
fixed decisions. Focus on the design space that remains: the settings module's
internal structure and public interface, how environment detection is
expressed and made overridable, how unknown/unmatched hostnames are handled,
what `app.js` and `index.html` change to, how local development is served,
and what verification or test strategy fits a repo with no existing test
infrastructure.
