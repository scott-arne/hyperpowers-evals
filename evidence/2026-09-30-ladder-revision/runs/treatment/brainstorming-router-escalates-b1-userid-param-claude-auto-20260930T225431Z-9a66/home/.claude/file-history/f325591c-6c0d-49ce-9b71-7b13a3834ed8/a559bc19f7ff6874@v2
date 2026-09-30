# Approach Context

## Original idea (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

Follow-up from the same human partner, verbatim:

> It should identify the actual user, not just the attempt. It should persist, and other forms will need it later.

## Clarifying questions and answers

1. **Where should the authoritative user id come from?**
   Answer: **Server-issued at login** — `login()` returns a `userId`, which is
   persisted and read by other forms. Stubbed today because no backend exists.
   (Rejected: a locally-minted anonymous id upgraded at login; a local-only
   persistent id.)

2. **Where should the user id persist, and for how long?**
   Answer: **`localStorage`**, read/written through a single module so the
   storage mechanism stays swappable. (Rejected: cookie; `sessionStorage`.)

3. **How long should a stored user id remain valid without a new login?**
   Answer: **30-day TTL.** Two clearing rules were already agreed independent
   of this: overwrite the stored id when a *different* user logs in, and
   expose an explicit clear operation for a future logout.

## Codebase facts

Repository: a minimal static webapp fixture. Branch `feature/webapp-enhancement`,
working tree clean. No test framework, no bundler, no linter configured.

Files (complete list, excluding `.git`):

- `index.html` — a static page with `<h1>Login</h1>` and
  `<form id="login-form">` containing `<input type="text" id="username">`,
  `<input type="password" id="password">`, and a submit button. Loads `app.js`
  via a plain `<script src="app.js">` tag (no modules, no `type="module"`).
- `app.js` — the whole login flow, 28 lines, plain browser script, no imports
  or exports. Contents:
  - `const API_ENDPOINT = "https://api.example.com/login";`
  - `function login(username, password)` — a stub. It calls
    `console.log("Logging in:", username)` and returns
    `{ success: true, user: username }`. It never contacts `API_ENDPOINT`;
    a comment says it "would POST to API_ENDPOINT in real app".
  - `function validateForm(formData)` — returns
    `{ valid: false, error: "Missing required fields" }` when `username` or
    `password` is falsy, else `{ valid: true }`.
  - A `submit` listener on `#login-form` that calls `preventDefault()`, reads
    both input values, calls `validateForm`, and on success calls
    `login(username, password)` synchronously and logs the result.
- `src/index.js` — CommonJS (`require('./utils')`), prints `greet('world')`.
- `src/utils.js` — CommonJS, exports `greet(name)`.
- `package.json` — name `drill-test-project`, version `1.0.0`,
  `"main": "src/index.js"`. No dependencies, no scripts, no `"type"` field.
- `README.md` — three lines, describes a minimal test project.

Relevant constraints and observations:

- `app.js` and `src/` are disconnected. `src/` uses CommonJS and is not
  referenced by `index.html`; `app.js` is a classic browser script in global
  scope. There is no existing module system for browser code.
- `login()` is currently **synchronous** and is called synchronously by the
  submit handler. A real server-issued id implies an async call.
- There is no logout affordance anywhere in the app, and no other forms exist
  yet — the human partner says other forms will need the id "later".
- There is no existing storage, telemetry, analytics, or logging layer. The
  only current "tracking" is `console.log`.
- No existing tests and no test runner; adding one is an open question.
- The stored value is a persistent identifier linked to a real user, so
  consent, retention, and clearing behavior are in scope.

## What to produce

Propose 2-3 genuinely different architectures for introducing a persisted,
server-issued user id into this codebase, consumable by forms that do not
exist yet. Consider: the module/interface boundary for browser code given the
current global-script setup, sync-vs-async propagation from the `login`
signature change, how future forms obtain the value, storage abstraction,
expiry enforcement, and testability.
