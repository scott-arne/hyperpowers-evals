# Approach Context

## Original request (verbatim)

"Add logging to the app so we can debug production issues."

## Clarifying questions and answers

1. **Q: What should "logging" mean here — output read locally, or records that leave the user's machine?**
   A: Console **and** ship to a remote collector.

2. **Q: Which surface needs logging — the browser app, the Node entry point, or both?**
   A: Both, via a shared logger.

3. **Q: How should one logger source be shared between the browser page and the Node entry point?**
   A: ESM everywhere, no build step. Convert `index.html` to `<script type="module">` and convert the CommonJS Node files to `import`. No bundler.

4. **Q: Where should shipped logs go?**
   A: Vendor-neutral HTTP sink — POST batched JSON to a configurable URL with an optional auth header. No vendor SDK.

5. **Q: What should the logger enforce about data reaching the remote sink?**
   A: An allowlist for remote records — only explicitly permitted keys are serialized to the sink; unknown keys are dropped. Console retains full local detail.

6. **Q: Should usernames be queryable in shipped logs?**
   A: No. Remote records carry a generated per-session id instead of the username.

7. **Q: Should the logger install global error handlers?**
   A: Yes, in both runtimes — `window.onerror` / `unhandledrejection` in the browser, `uncaughtException` / `unhandledRejection` in Node.

8. **Q: Which tooling should be set up from the start?**
   A: Unit tests (runner + first passing fixture) and lint + format. No end-to-end tests. Dev dependencies are acceptable; the browser must still load raw ESM source with no build.

## Codebase facts

Repository is 4 small source files, no dependencies, no lockfile, no `node_modules`, no build step, no tests, no CI config.

`package.json` (complete):
```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

`index.html` (complete): a plain HTML page with a login form containing
`<input type="text" id="username">`, `<input type="password" id="password">`,
a submit button, and `<script src="app.js"></script>` (classic script, not a module).

`app.js` (complete, browser, global scope, no module syntax):
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

`src/index.js` (complete, CommonJS):
```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

`src/utils.js` (complete, CommonJS):
```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

Relevant constraints:
- The login flow passes `{ username, password }` as a single object into `validateForm`, so a credential can reach a log call as one value.
- `login()` is a stub; no real network call exists yet. `API_ENDPOINT` is unused.
- Existing logging is 4 bare `console.log`/`console.error` calls, one of which logs a username.
- The two runtimes differ in available primitives: the browser has `fetch`, `navigator.sendBeacon`, and page-unload events; Node has `fetch` (v18+) and process exit hooks, but no `sendBeacon`.
- No target Node version is declared anywhere in the repo.

## Task

Propose implementation approaches for the logging subsystem described by the
answers above: module/file structure, how the shared core is adapted to the two
runtimes, how records are shaped and buffered, how the allowlist is enforced,
and how delivery failure and process/page exit are handled.
