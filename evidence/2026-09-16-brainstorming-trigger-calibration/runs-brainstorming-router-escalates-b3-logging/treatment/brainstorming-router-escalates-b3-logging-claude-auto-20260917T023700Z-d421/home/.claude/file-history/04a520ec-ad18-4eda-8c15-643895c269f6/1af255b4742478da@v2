# Approach Context

## Original request (verbatim)

> Add logging to the app so we can debug production issues.

## Clarifying questions and the human partner's answers

1. **Which part of the repo should the logging cover?**
   Answer: Browser app only (`app.js` / `index.html`). Not the Node entry point.

2. **Where should browser logs actually land?**
   Answer: Their own endpoint — batch and POST records to a configurable URL.
   Not a third-party service; not console-only.

3. **How should the logger prevent credentials and PII from reaching the log store?**
   Answer: Allowlist — only pre-declared fields serialize; everything else is
   dropped before it can reach a record. Fails closed.

4. **How should a user be identified in log records?**
   Answer: Per-session random correlation ID. Not a hashed username, not the
   raw username.

5. **What should the logger capture?**
   Answer: Uncaught errors and unhandled rejections, plus key login-flow
   breadcrumb events (validation outcome, login attempt, API result).

## Codebase facts

Repository is tiny. Full file list (excluding `.git`):

- `index.html`
- `README.md`
- `package.json`
- `app.js`
- `src/index.js`
- `src/utils.js`

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

Note: `app.js` is loaded as a classic (non-module) script tag. There is no
bundler, so any multi-file solution must either add more `<script>` tags, or
switch to `<script type="module">`, or introduce a build step.

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

Facts about the existing code that constrain the design:

- `login()` is a stub. It never performs a network call; `API_ENDPOINT` is
  referenced only in a comment. There is no real async path today, but a real
  one is the obvious near-future change.
- `login()` currently logs the raw username via `console.log`.
- The submit handler reads a password value into a local variable and passes it
  into `validateForm`.
- All existing observability is four ad-hoc `console.log` / `console.error`
  calls. There is no logging module, no levels, no timestamps, no record shape.
- Everything is in module-level function declarations in one file; nothing is
  exported.

### `src/index.js` and `src/utils.js`

CommonJS Node hello-world (`require('./utils')`, `module.exports`). Out of
scope per answer 1, but note the repo therefore already mixes a CommonJS Node
half with a classic-script browser half.

### Git

Branch `feature/webapp-enhancement`, clean tree. Recent commits: "Add simple
webapp fixture", "add entry point", "add utils module", "initial commit".

## Constraints

- Zero runtime dependencies is the current posture and the human partner chose
  the self-hosted endpoint partly to preserve it.
- The receiving endpoint does not exist in this repo; its URL must be
  configurable rather than hardcoded.
- Browser environment: page can be closed or navigated away at any moment, the
  network can fail, and the endpoint can be unreachable or rate-limiting.
- The allowlist guarantee must be structural, not conventional — a future
  careless call site must not be able to introduce a new field into a shipped
  record.

## What to produce

Propose 2-3 genuinely different architectures for this browser logging
subsystem — different in module/transport/buffering shape and in the data
model of what is retained and shipped, not variations of one shape. Consider
at minimum: how records are buffered and when they are flushed, what happens
to breadcrumbs that precede an error, behavior on page unload, failure and
back-pressure handling, how the allowlist is enforced, and how the thing is
tested given there is no test infrastructure today.
