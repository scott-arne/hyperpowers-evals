# Approach Context: logging subsystem

## Original idea (verbatim)

> Add logging to the app so we can debug production issues.

## Clarifying questions and the human partner's answers

1. **Which code should the logging subsystem cover?**
   Answer: **Both the browser webapp and the Node `src/` module.**

2. **Where should log records end up?**
   Answer: **Console plus a pluggable remote sink.** Structured core with a sink
   interface; console sink always on; a batching remote sink enabled in
   production. No third-party dependencies; no vendor SDK.

3. **What is the default for a field that is not explicitly classified?**
   Answer: **Deny by default.** Only explicitly-allowlisted keys may reach a
   record, plus a name-based scrubber as a second layer before data leaves the
   process.

4. **How should records be correlated?**
   Answer: **Ephemeral session ID.** An in-memory UUID minted per page load in
   the browser and per process start in Node. No persistent identifier, no
   `localStorage`, no consent surface.

## Codebase facts

Repository: a minimal test/fixture project. Branch `feature/webapp-enhancement`.
Working tree clean. Four commits total.

### File inventory (complete)

```
README.md
app.js
index.html
package.json
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

Facts: no `dependencies`, no `devDependencies`, no `scripts`, no `type` field.
There is no lockfile, no `node_modules`, no build step, no bundler, no
transpiler, no test runner, no linter, and no formatter configured anywhere in
the repo.

### `app.js` (complete) — browser code

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

Facts: loaded via a plain `<script src="app.js">` tag in `index.html` (no
`type="module"`, no bundling). Uses browser globals (`document`). Top-level
script; all three functions are script-scope, none are exported. The `login`
function is a stub that never performs a network call. `API_ENDPOINT` is
declared but unused.

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

### `src/index.js` (complete) — Node code

```js
const { greet } = require('./utils');

function main() {
  console.log(greet('world'));
}

main();
```

### `src/utils.js` (complete) — Node code

```js
function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };
```

Facts: `src/` uses CommonJS (`require` / `module.exports`). `app.js` uses
neither — it is a classic script relying on globals. So the two halves of the
repo currently use **different and mutually incompatible module systems**, and
shared code must work for both.

### Existing logging state

There is no logging module. The only logging is four ad-hoc console calls, all
in `app.js`: `console.log("Logging in:", username)` (line 6),
`console.log("Login result:", result)` (line 25),
`console.error("Validation error:", ...)` (line 27), and `console.log` in
`src/index.js` line 4 which is program output rather than logging.

`app.js` line 6 currently writes a username to the console, and line 25 writes
the full login result object. The plaintext password is present in scope at the
call site (`app.js` lines 20-21) but is not currently logged.

## What is being asked of you

Propose approaches for the structure of this logging subsystem, given the four
decisions above as fixed constraints. Relevant open design surface includes,
but is not limited to: how one shared core is packaged so both a
no-build browser script and a CommonJS Node module can consume it; how the sink
interface and the log-record shape are defined; how the remote sink handles
batching, buffering, failure, and flush-on-unload; how the allowlist is
expressed at call sites; and how level/verbosity configuration reaches each
environment at runtime.
