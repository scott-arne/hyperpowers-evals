# Approach Context

## Original idea (verbatim)

"Add logging to the app so we can debug production issues."

## Clarifying questions and the human partner's answers

1. **Where do the logs need to end up for you to debug a production issue?**
   Answer: Console output, with a seam in the module where a remote transport
   could be added later. Not shipping to a remote endpoint now; not adopting a
   third-party service (Sentry etc.) now.

2. **What scope should the logger cover?**
   Answer: The browser app only (`index.html` + `app.js`). The Node entry point
   (`src/index.js`) is out of scope and keeps its current bare `console.log`.

3. **How should the logger handle sensitive data?**
   Answer: Redact by deny-list on key name (password / token / secret style
   keys).

4. **Should the username be logged?**
   Answer: Yes, log the username in cleartext — it is the correlation handle
   for tying a user's bug report to a log line. This is a deliberate, recorded
   choice.

5. **How should the log level be controlled at runtime?**
   Answer: Default level `info`, overridable via `localStorage`, with a URL
   query parameter accepted as a convenience that writes into `localStorage`
   so raised verbosity survives page reloads during a reproduction.

## Codebase facts

Repository is tiny. Complete file list (excluding `.git`):

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

No dependencies. No devDependencies. No `scripts` block. No test runner, no
linter, no formatter, no bundler, no build step of any kind configured.

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

`app.js` is loaded by a plain `<script src>` tag. There is no `type="module"`,
no import map, and no bundler.

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

Notes on current state:
- `login()` is a stub; it performs no network call. `API_ENDPOINT` is declared
  but unused.
- Logging today is three ad-hoc calls: `console.log` of the username inside
  `login()`, `console.log` of the login result at the call site, and
  `console.error` of the validation error.
- The plaintext password is held in a local variable in the submit handler, one
  line away from the existing log calls.
- All functions and the submit handler live in the single top-level script
  scope; nothing is exported and there is no module system in the browser path.

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

`src/` uses CommonJS. The browser path does not. The two currently share no
code.

### Git

Branch `feature/webapp-enhancement`, clean working tree. Recent commits:
`Add simple webapp fixture`, `add entry point`, `add utils module`,
`initial commit`.

## Constraints

- No build step exists and introducing one was explicitly rejected in the scope
  answer.
- The repository currently has zero runtime dependencies; adding a third-party
  logging service was explicitly rejected.
- There is no environment concept (no dev/prod distinction available at
  runtime) because there is no build and no server-rendered configuration.
- The app is a static page opened directly; there is no server-side component
  in the repository.

## What to produce

Independent approaches for how to structure browser-side logging for this
codebase under the answers and constraints above: how the logging code is
organized, how it is wired into the existing page and submit flow, how the
level threshold and redaction are applied, and where the future remote
transport attaches.
