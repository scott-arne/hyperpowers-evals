# Approach Context

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId value come from?**
A: "It should come from the auth response — track the authenticated identity. It
needs to work across the app and persist, and other forms will need it later."

**Q: What should the shared store hold after a successful login?**
A: Identity only — `userId` plus username/display name. No auth token or session
object held client-side.

**Q: How long should the stored identity persist?**
A: `localStorage` — survives reload and browser restart, shared across tabs,
cleared on explicit logout.

**Q: How should the shared session module be loaded by the browser?**
A: ES modules (`<script type="module">`, explicit imports). Accepted consequence:
`index.html` must be served over a local HTTP server rather than opened via
`file://`.

## Codebase facts

Repository is a six-file static webapp fixture. Full file list (excluding
`.git`): `index.html`, `README.md`, `package.json`, `app.js`, `src/index.js`,
`src/utils.js`. Current branch `feature/webapp-enhancement`, working tree clean.

### `app.js` (28 lines, browser, no module syntax)

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

`login()` is a stub: it performs no network call, `API_ENDPOINT` is unused, and
it synchronously returns `{ success: true, user: username }`. It has exactly one
call site, line 23.

### `index.html` (15 lines)

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

The form collects only `username` and `password`. There is no existing user
identifier anywhere in the repo. There is no logout control and no second form.

### `src/utils.js` and `src/index.js` (Node, CommonJS)

```js
// src/utils.js
function greet(name) { return `Hello, ${name}!`; }
module.exports = { greet };

// src/index.js
const { greet } = require('./utils');
function main() { console.log(greet('world')); }
main();
```

These are a separate Node-side pair using CommonJS. They do not interact with
`app.js`.

### `package.json`

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No dependencies, no devDependencies, no `scripts` block. Therefore: no test
runner, no linter, no formatter, no bundler, no build step configured anywhere
in the repo.

## Constraints

- Identity persists in `localStorage`; no token or session object stored
  client-side.
- Browser code uses ES modules.
- The backend does not exist; `login()` remains a stub for now, but the design
  should anticipate a real auth response supplying the identity.
- Future consumers ("other forms") do not exist yet and must be able to read the
  logged-in identity.
- The repo currently has no tooling of any kind.
