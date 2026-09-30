# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

Follow-up from the human partner, verbatim:

> Your recommendation is fine. It should persist, and it should work across the app — other forms will need it later.

## Clarifying questions and answers

**Q1. Where should login tracking actually go?**
A: A local tracking module inside this repo — a seam that can later point at
an API or analytics tool. (Rejected: console-only; direct-to-backend.)

**Q2. Where should tracked events be persisted?**
A: `localStorage`, but the module's public API must be promise-returning /
async-friendly so IndexedDB or a backend can replace the storage layer later
without changing call sites. (Rejected: IndexedDB now; backend endpoint with
local buffer now.)

**Q3. What is `userId` and where does it come from?**
A: The authenticated identity is an **output** of `login()` (it comes back in
the auth result), not a caller-supplied parameter. Separately, a persistent
client-generated device ID is available at call time and should be tracked so
that failed login attempts are also recorded. (Rejected: caller supplies
`userId` from session/SSO; `userId` is just the username.)

## Codebase facts

Repository root contains:

- `app.js`
- `index.html`
- `package.json`
- `README.md`
- `src/index.js`
- `src/utils.js`

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

There are **no** dependencies, no devDependencies, no scripts, no test runner,
no linter, no formatter, and no build step configured. No bundler. No module
system declared (`"type"` is absent).

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

Notes on `app.js`:

- `login()` is currently synchronous and returns a hardcoded stub
  `{ success: true, user: username }`. It never contacts `API_ENDPOINT`.
- The submit handler is registered at top-level script evaluation time against
  `document.getElementById("login-form")`.
- `app.js` uses no imports/exports; it is browser-global script code.

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

Note the module-system split: `src/` uses CommonJS (`require` /
`module.exports`) and Node-style entry, while `app.js` is a browser global
script with no module syntax. `index.html` is the browser entry point.

`src/index.js` and `src/utils.js` are an unrelated greeting demo; they share no
code with `app.js`.

Git: branch `feature/webapp-enhancement`, clean working tree. Recent commits:
`Add simple webapp fixture`, `add entry point`, `add utils module`,
`initial commit`.

## Constraints and requirements to design against

1. Tracking must **persist** across page loads (`localStorage`).
2. Tracking must be **reusable across the app** — the partner explicitly said
   other forms will need it later, so this is not login-specific plumbing.
3. The tracking module's public API must be **async-friendly (promise-based)**
   so the storage backend can be swapped without touching call sites.
4. Successful logins record the authenticated identity from the auth result.
5. Failed login attempts must also be recorded, correlated by a persistent
   client-generated device ID.
6. The repo has no test/lint/build tooling today; any proposal should state
   what tooling, if any, it assumes.

## What to produce

Propose 2-3 genuinely different architectures for the tracking module and its
integration with `login()` and future forms. Differ on real axes — module
boundary and file layout, the event schema and how it is versioned, how the
storage layer is abstracted, how the device ID is owned and initialized, how
call sites subscribe or emit, how the browser-global vs CommonJS split is
resolved, and how `localStorage` capacity/retention and quota failures are
handled. Variations of one shape do not count.
