# Approach Context

## Original idea (verbatim)

"Move the API endpoint config into a new settings module so it's easier to change environments."

## Clarifying questions and the human partner's answers

**Q: How should the app determine which environment it's running in?**
A: Hostname detection — the settings module maps `window.location.hostname` to an endpoint; the same file deploys everywhere and self-selects.
(Rejected alternatives: a single edited ENVIRONMENT constant; build-time injection; hostname plus a query-param/localStorage dev override.)

**Q: Which environments should the settings module define?**
A: local + staging + prod, with placeholder hosts/endpoints to be filled in.

**Q: What should live in the settings module?**
A: The API endpoint only. No timeouts, no feature flags, no base-URL splitting.

## Codebase facts

Repository root contains: `README.md`, `app.js`, `index.html`, `package.json`, `src/`.

`package.json` (complete):
```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```
No dependencies, no devDependencies, no scripts, no `"type"` field. No lockfile, no `node_modules`, no bundler, no build step, no linter or formatter config, no test runner, no CI config, no `.env` handling of any kind.

`index.html` (complete) loads the app with a classic script tag:
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

`app.js` (complete) — browser code, no module syntax, relies on script-tag global scope:
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

Note: `API_ENDPOINT` is currently referenced only inside a comment (`// Stub: would POST to API_ENDPOINT in real app`); `login()` does not yet make a network call.

`src/` contains two CommonJS Node files that are unrelated to the webapp and are not loaded by `index.html`:

`src/index.js`:
```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

`src/utils.js`:
```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

So the repo mixes two module worlds already: CommonJS under `src/` (Node) and implicit script-tag globals at the root (browser). There is no shared module system between them.

Git: branch `feature/webapp-enhancement`, clean working tree, 4 commits, most recent "Add simple webapp fixture".

## Constraints

- No build step exists today, and introducing one was explicitly rejected in the answers above.
- The page must keep working when opened directly, including from a `file://` path, unless a chosen approach makes that tradeoff explicit.
- The existing repo style is plain, dependency-free ES5/ES6-era JavaScript with no framework.
- The scope is the browser app only; `src/` is out of scope.

## What to produce

Independent approaches for how the new settings module should be structured and wired into this page, given hostname-based environment selection. Consider at minimum: where the file lives, how `app.js` obtains the value, what happens on an unrecognized hostname, and how the module is kept testable given there is no test runner.
