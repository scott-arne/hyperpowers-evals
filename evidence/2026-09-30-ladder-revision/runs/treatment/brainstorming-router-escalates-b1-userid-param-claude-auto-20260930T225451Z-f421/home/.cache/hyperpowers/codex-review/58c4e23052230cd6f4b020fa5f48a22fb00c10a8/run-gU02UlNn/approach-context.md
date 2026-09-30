# Approach context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId come from?**
A: "Whatever you think is right. It should work across the app and persist; other forms will need it later."

**Q: What is this ID, semantically — an authenticated identity, a client-generated tracking handle, or both?**
A: Both, handle first. Mint a persisted client tracking handle now; stamp the server's account ID onto it once login calls the real API. It must work today against the stubbed login and extend later.

## Requirements derived from those answers

- A user/tracking identifier must be readable and writable from anywhere in the app, not just the login flow.
- It must persist across page loads.
- Additional forms, which do not exist yet, will need to read it later.
- A client-minted correlation handle is needed now and must function while `login` is still a stub.
- A server-issued account identifier is attached later, when `login` performs a real API call.

## Codebase facts

Repository root contains: `index.html`, `app.js`, `package.json`, `README.md`, `src/index.js`, `src/utils.js`.

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no scripts. No test runner, no linter, no formatter, no bundler, no build step, no CI configuration present.

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

Facts about `app.js`:
- It is loaded via a plain `<script src="app.js">` tag. It is not a module: no `import`/`export`, no `type="module"` on the script tag.
- `login` is synchronous, has exactly one caller (the submit handler in the same file), and is a stub: it never contacts `API_ENDPOINT` and returns a hardcoded `{ success: true, user: username }`.
- The login form collects only `username` and `password`. No element in the page supplies any user or session identifier.
- Observability today consists of `console.log` / `console.error` calls. There is no analytics client, no logging library, and no telemetry endpoint.

`src/utils.js` in full:

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

`src/index.js` in full:

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

Facts about `src/`:
- `src/` uses CommonJS (`require` / `module.exports`) and runs under Node, not in the browser.
- Nothing in `src/` is referenced by `index.html` or `app.js`. The browser code and the `src/` code share no module system and no code today.
- `package.json` `main` points at `src/index.js`.

## Repository state

- Git branch: `feature/webapp-enhancement`, working tree clean.
- Recent commits: "Add simple webapp fixture", "add entry point", "add utils module", "initial commit".

## What to produce

Propose 2-3 genuinely different architectures for introducing a persistent,
app-wide user/tracking identifier into this codebase, satisfying the
requirements above.
