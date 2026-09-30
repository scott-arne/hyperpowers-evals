# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: What should "track who logged in" actually produce — return a userId from
login, accept a caller-supplied userId, or build real login tracking?**
A: "Yes, it should persist and work across the app — other forms will need it
later."

**Q: Which does the app actually need — current identity (a session store
holding who is logged in right now), a login event history (append-only audit
record), or both?**
A: Current identity. A session store holding who is logged in right now, which
other forms read to stamp their submissions. Event/audit logging is explicitly
deferred.

**Q: How long should the stored identity live — in-memory, sessionStorage,
localStorage, or an httpOnly cookie?**
A: `sessionStorage`. Survives page reloads and navigation between pages,
cleared when the tab closes.

**Q: Where does the userId come from, and should login become async — keep it
fully synchronous, stub body with an async interface, or wire the real API
call now?**
A: Stub body, async interface. `login()` returns a Promise resolved
immediately from the existing stub. The real network call is expected to drop
in later without forcing every call site to change.

**Q: Which tooling should be set up from the start (unit tests, lint +
auto-format, end-to-end tests, or none)?**
A: Unit tests only.

## Codebase facts

Small static web project. No build step, no bundler, no module system in the
browser code (`app.js` is loaded via a plain `<script src="app.js">` tag, not
`type="module"`). No test runner, no linter, no dev dependencies.

Repository file tree (excluding `.git`):

```
index.html
README.md
package.json
app.js
src/index.js
src/utils.js
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

No `scripts`, no `dependencies`, no `devDependencies`, no `"type"` field.

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

Notes on `app.js`:
- `API_ENDPOINT` is declared and never referenced. `login()` performs no
  network call and verifies no credentials; it returns `{ success: true, user }`
  unconditionally for any input that passes `validateForm`.
- `login()` has exactly one call site: the submit handler at the bottom of the
  same file.
- All three top-level declarations (`API_ENDPOINT`, `login`, `validateForm`)
  are globals on the page; nothing is exported.

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

This is the only HTML page that currently exists. There is no logout control
and no second form anywhere in the repo yet. The human partner has stated that
additional forms are expected later and will need to read the logged-in
identity.

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

These two files use CommonJS (`require`/`module.exports`) and are unrelated to
the login flow. Note the resulting split: `src/` is CommonJS running under
Node, while `app.js` is a global-scoped browser script. `package.json` has
`"main": "src/index.js"`.

## What to design

The subsystem that holds the current logged-in identity: its module boundary
and placement given the CommonJS-vs-browser-global split above, its public
interface, how the login flow writes to it, how future forms on other pages
read from it, what the stored value's shape is, how it is cleared, and how it
is unit-tested given that `sessionStorage` is a browser API and the repo has
no test runner yet.

Constraints that are already settled and are not open questions: current
identity (not an event log); `sessionStorage` as the medium; `login()` gets a
Promise-returning interface over the existing stub body; unit tests as the
only tooling.
