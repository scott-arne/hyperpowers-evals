# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

Follow-up, verbatim:

> Go with your recommendation. It should work across the app and persist; other forms will need it later.

(The recommendation referred to: have `login` return the userId from the login
result rather than accept a caller-supplied one, since the login call is what
establishes identity and the only caller has no userId available.)

## Clarifying questions and answers

1. **What will the other forms actually do with the userId?**
   Answer: **Shared app state** — forms read it to drive behavior (prefill,
   show/hide, branch logic), not merely to tag logs. Implies a defined
   lifecycle and a defined "not logged in yet" answer.

2. **How long should the userId persist after login?**
   Answer: **Per-tab / `sessionStorage`** — survives reloads and navigation,
   clears when the tab closes. Chosen partly because the app currently has no
   logout of any kind, so automatic expiry is the only clearing mechanism.

3. **How do you open this app during development?**
   Answer: **Not sure / no preference** — resolved to the option that works in
   both cases: a classic `<script>` with one namespaced global. ES modules are
   ruled out because they break `file://` loading.

## Codebase facts

Repository is tiny. Full file list (excluding `.git`):

```
index.html
README.md
package.json
app.js
src/index.js
src/utils.js
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

### `src/index.js` (complete)

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### `src/utils.js` (complete)

```js
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

### Additional constraints and observations

- `login` is synchronous and is a stub; it does not call `API_ENDPOINT`. It
  returns `{ success: true, user: username }`. A real implementation would be
  async and would return a server-assigned user identifier.
- `login` has exactly one caller: the submit handler in `app.js`.
- There is no logout, no session concept, no router, and no second page.
- There is no test runner, no linter, no formatter, and no dependencies.
  `package.json` has no `scripts` block.
- `app.js` (browser, classic script, no module system) and `src/` (Node,
  CommonJS) currently share no code and have no build step connecting them.
- "Other forms will need it later" — no other forms exist yet.
- Browser storage on this origin is readable by any script on the origin; the
  value under discussion is an identifier, not a credential.

## What is wanted

Two or three genuinely different approaches for where the logged-in user's
identifier lives after login and how future forms read it, given the answers
above. Focus on module shape, data model, the lifecycle/invalidation story,
and how `login`'s contract changes.
