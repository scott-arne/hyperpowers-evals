# Approach Context: user preferences storage

## Original request (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and answers

**Q1: Which half of the app owns preferences, and what should "persists across
sessions" mean?** Options offered were: browser `localStorage`; a Node-side
file store; a user-keyed backend store tied to login; or both browser and Node
via adapters.

**A1:** "It should work across the whole app, and other settings/forms will
need it later. Your recommendation sounds fine." (The recommendation accepted
was browser `localStorage`, with storage access behind a small module
interface rather than scattered `localStorage` calls.)

**Q2: What is the first real preference the module should store?** Options
offered were: remember username; theme light/dark; no consumer yet (module
only); or let the assistant pick a starter set.

**A2:** Remember username — pre-fill the username field on return visits, with
an opt-in checkbox. Username only, never the password.

## Codebase facts

Repository root contains two disconnected halves and no build tooling.

Files (complete list, excluding `.git`):

- `index.html`
- `app.js`
- `package.json`
- `README.md`
- `src/index.js`
- `src/utils.js`

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

No CSS file, no stylesheet link, no inline styles. `app.js` is loaded with a
plain `<script src>` tag — not `type="module"`.

### `app.js` (28 lines)

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

`login()` is a stub: it does not call `API_ENDPOINT`, and returns
`{ success: true, user: username }` unconditionally. There is therefore no
real authenticated user identity available in the app today.

### `package.json` (complete)

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `dependencies`, no `devDependencies`, no `scripts`, no `type` field. No
lockfile, no `node_modules`. No test runner, linter, or formatter is
configured anywhere in the repo. No CI configuration.

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

These use CommonJS (`require` / `module.exports`). They are a standalone demo
and share no code with `app.js`; nothing imports across the two halves. `app.js`
uses no module system at all (plain globals in a classic script).

### Other facts

- Git branch is `feature/webapp-enhancement`; working tree clean.
- Recent commits: "Add simple webapp fixture", "add entry point",
  "add utils module", "initial commit".
- `README.md` reads in full: "# Test Project / A minimal project for Drill test
  scenarios."
- There is no existing settings UI, no persistence layer of any kind, and no
  existing storage-access code anywhere in the repo.

## Constraints stated or implied by the answers

- The preferences mechanism must be usable across the whole app, not bolted
  onto the login form alone.
- Additional settings and forms are expected to consume it later, so the
  interface it exposes is the thing that has to survive.
- The password must never be persisted.
- The opt-in checkbox for remembering the username does not exist yet in
  `index.html` and would need to be added.

## What to produce

Propose 2-3 genuinely different viable architectures or data models for this
preferences storage, with materially different tradeoffs — not variations of a
single shape. Consider, among whatever else you judge relevant: how a
preference is declared and defaulted; how keys are namespaced in the
underlying store; serialization and validation of stored values; what happens
when the store is unavailable, full, or holds corrupt or attacker-supplied
data; versioning and migration of the stored shape as preferences are added or
changed; how the module is consumed by a classic non-module script such as the
current `app.js`; and how the design would be tested given that no test
infrastructure exists yet.
