# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should userId come from — returned by `login()`, passed in by the
caller, or both?**
A: "Your recommendation is fine. It should work across the app and persist,
and other forms will need it later." (The recommendation offered was: have
`login()` produce the id rather than receive it.)

**Q: What will the persisted userId actually be used for?**
A: Tracking/telemetry only. It will never be used to grant access or gate UI.

**Q: What should the userId identify, and how long should it live?**
A: A stable per-browser id — an opaque id generated once that persists across
logins and browser restarts. No PII stored.

**Q: What consumes the userId right now?**
A: Log fields only. Attach it to existing console output and expose a clean
accessor for future forms. No network code yet.

## Codebase facts

Repository root contains exactly these files (no build tooling, no bundler,
no test framework, no linter config, no CI):

- `index.html`
- `README.md` — 2 lines, "A minimal project for Drill test scenarios."
- `package.json`
- `app.js`
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

There is no `type` field, no `scripts`, and no dependencies or devDependencies.

`app.js` in full (loaded by `index.html` in the browser; uses `document`, so
it runs in a browser context):

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

`app.js` uses no module system: no `import`, no `export`, no `require`, no
`module.exports`. It is a plain script with top-level function declarations.

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

Note the split: `src/` is CommonJS and Node-oriented (`require`,
`module.exports`) and is unrelated to the login feature. `app.js` is a
browser script with no module system. Nothing in `src/` is referenced by
`index.html` or `app.js`.

`index.html` is the page hosting the login form (elements with ids
`login-form`, `username`, `password`).

Git: branch `feature/webapp-enhancement`, clean working tree. Recent commits:
`Add simple webapp fixture`, `add entry point`, `add utils module`,
`initial commit`.

## The task

Design how a stable, persisted, opaque per-browser tracking id is produced,
stored, owned, and exposed — such that `login()` and future unrelated forms
in this app can all read it, and such that it appears in log output. No
network transport is in scope. No authentication or access control is in
scope.

Constraints worth weighing: the app currently has no module system in the
browser layer, no build step, no test framework, and two files that disagree
about module format. Any answer has to say how the new code is loaded by
`index.html` and whether it is testable.
