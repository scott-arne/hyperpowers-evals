# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId value come from?** (options offered: optional
parameter defaulting to username; from existing client state; a new form field)

A: "It should work across the whole app and persist; other forms will need it
later too."

**Q: What should login() do with the userId once it has it?** (options offered:
log it and return it; log only; return only)

A: "It should persist so the rest of the app can tell who logged in, not just be
logged."

**Q: How long should the userId persist?** (in-memory only / sessionStorage /
localStorage)

A: sessionStorage — survives page reloads and in-tab navigation, cleared when
the tab closes.

**Q: What fills userId when the caller does not pass one?** (stub returns the
username as the id / mint a client-side UUID / required parameter)

A: The stub returns the username as the id; the parameter stays optional, with a
single swap point for a real server-issued id later.

## Codebase facts

Repository is a minimal fixture project, `drill-test-project` v1.0.0. Full file
list: `README.md`, `index.html`, `app.js`, `package.json`, `src/index.js`,
`src/utils.js`. Git branch `feature/webapp-enhancement`, working tree clean.

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `scripts` block, no dependencies, no devDependencies, no test runner, no
linter or formatter config, no build step, no bundler, no `node_modules`.

`index.html` in full:

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

Note: a single classic `<script src="app.js">` tag, not `type="module"`. There
is one HTML page in the repo; the "other forms" the human partner refers to do
not exist yet.

`app.js` in full:

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

Facts about `app.js`: it is a flat classic script with no module syntax, no
exports, and no state that outlives the submit handler. `API_ENDPOINT` is
declared but never used — `login()` is a stub that does not perform a network
call. `login()` has exactly one call site, the submit handler in the same file.
The handler logs the returned object and discards it. There is no client-side
identity, session, storage, or router layer of any kind.

`src/index.js` in full:

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

`src/utils.js` in full:

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

Facts about `src/`: it is CommonJS, runs under Node, and is the `main` entry in
`package.json`. It is entirely disconnected from the browser side — `index.html`
never loads it, and `app.js` never requires it. So the repo currently contains
two unrelated module conventions: CommonJS in `src/`, and no module system at
all in `app.js`.

## Constraints

- The `userId` parameter on `login()` is requested explicitly and is part of the
  outcome.
- Storage mechanism is settled: `sessionStorage`.
- The default id value is settled: the username, produced by the stub, with one
  place to change when a real API returns a server-issued id.
- What is open is the structure: how the persisted identity is exposed to the
  rest of the app, given that the browser side today has no module system and
  the future consumers ("other forms") do not exist yet.
- There is no established testing pattern in this repo to follow.
