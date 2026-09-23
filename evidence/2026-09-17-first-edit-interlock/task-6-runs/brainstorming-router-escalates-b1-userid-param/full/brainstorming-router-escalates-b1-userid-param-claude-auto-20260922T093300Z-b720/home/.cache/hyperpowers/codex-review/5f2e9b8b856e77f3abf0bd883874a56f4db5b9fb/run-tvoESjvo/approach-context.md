# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Adding a parameter to `login` changes a signature every caller depends on, and "track who logged in" adds a place where user identity gets written. How do you want to proceed?**
A: Read the code first, then present a design. No edits until approved.

**Q: Where should the "who logged in" record go?**
A: (initial answer) A persisted store or audit record.

**Q: No userId exists anywhere in this codebase, and the only caller of `login` has just a username and password. What is the userId, and where does it come from?**
A: "It's the ID of the user who logged in, coming back from the server. It should work across the app, it should persist, and other forms will need it later."

**Q: `API_ENDPOINT` points at `https://api.example.com/login`, a placeholder that doesn't resolve. Is there a real login API to code against?**
A: No server yet — define the response shape, build and test the client against a clearly-marked fake, isolate parsing so the real backend is a one-place change later.

**Q: Where should the userId persist in the browser?**
A: `localStorage`.

**Q: With no server, a browser-stored audit log is editable and clearable by the person being audited. How should we handle the "track who logged in" record?**
A: Defer the audit trail to the backend. Build the identity layer now.

## Codebase facts

Repository is a minimal static webapp. Full file list (excluding `.git`):

- `index.html`
- `app.js`
- `src/index.js`
- `src/utils.js`
- `package.json`
- `README.md`

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

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

### Structural constraints

- `app.js` is loaded as a bare `<script src="app.js">`. It is not a module: no
  `import`/`export`, no bundler, no build step of any kind.
- `src/` uses CommonJS (`require`/`module.exports`) and is unrelated to the
  browser code; nothing in `src/` is referenced by `index.html`.
- No dependencies, no devDependencies, no test runner, no lint config, no CI.
- `login` is currently synchronous, never contacts the network, and returns
  `{ success: true, user: username }` unconditionally — it cannot fail.
- `login` has exactly one call site: the submit handler in the same file.
  Nothing exports it; there are no callers outside this repository.
- The `userId` the partner describes does not exist anywhere in the codebase.
  The form collects only a username and a password.

### Stated requirements to satisfy

1. A user identity returned by the server after login.
2. Reachable from anywhere in the app ("it should work across the app").
3. Persisted in `localStorage`.
4. Usable by additional forms added later.
5. Network call isolated so a real backend is a single-point change.
6. No audit-log subsystem in this change (deferred to the backend).

## Task

Propose 2-3 genuinely different architectures for this client-side identity
layer, per the output schema.
