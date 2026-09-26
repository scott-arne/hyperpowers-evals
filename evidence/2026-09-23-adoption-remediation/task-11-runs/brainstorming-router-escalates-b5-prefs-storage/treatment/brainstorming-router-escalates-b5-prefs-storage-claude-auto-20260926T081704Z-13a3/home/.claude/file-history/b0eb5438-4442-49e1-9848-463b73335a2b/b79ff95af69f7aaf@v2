# Approach context: user preferences storage

## Original request (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and the human partner's answers

**Q1: What should the preferences subsystem actually store?**
A: A generic key-value store — a general preferences API any part of the app
can use, with no fixed set of keys defined up front. (Other options offered
and not chosen: UI/display settings only; UI settings plus login-convenience
items such as a remembered username or "stay signed in".)

**Q2: Where should preferences be stored?**
A: Browser `localStorage`, client-only. Per-device, synchronous, zero
dependencies, no backend. (Other options offered and not chosen: a
sync-ready boundary with a remote backend slotted in later; server-backed
per-user storage.)

**Q3: How should the preferences module be loaded?**
A: ES modules — a `prefs.js` that exports, `app.js` imports it, and
`index.html` switches to `<script type="module">`. (Other options offered
and not chosen: a plain script exposing a global; adding a bundler.)

## Codebase facts

Repository root contains exactly: `README.md`, `app.js`, `index.html`,
`package.json`, and `src/` (`src/index.js`, `src/utils.js`). Git branch is
`feature/webapp-enhancement`; 4 commits; working tree clean.

`package.json` in full:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `dependencies`, no `devDependencies`, no `scripts`, no `type` field. No
lockfile, no `node_modules`, no bundler, no linter config, no test runner,
no CI config, no framework.

`index.html` (full): a plain HTML document with `<h1>Login</h1>` and a
`<form id="login-form">` containing `<input type="text" id="username">`,
`<input type="password" id="password">`, and a submit button. It loads the
script with `<script src="app.js"></script>` — a classic script tag, not a
module.

`app.js` (full, 28 lines): declares `const API_ENDPOINT =
"https://api.example.com/login";`, then:
- `login(username, password)` — logs the username to the console and returns
  a hardcoded `{ success: true, user: username }`. A comment marks it a stub
  that "would POST to API_ENDPOINT in a real app". It never performs a
  network call.
- `validateForm(formData)` — returns `{ valid: false, error: "Missing
  required fields" }` when username or password is empty, else `{ valid:
  true }`.
- A `submit` listener registered directly on `document.getElementById(
  "login-form")` at top level. It calls `preventDefault()`, reads both input
  values, validates, and on success calls `login()` and console-logs the
  result.

There is no settings UI, no settings state, no storage code of any kind, and
no existing call to `localStorage`, `sessionStorage`, cookies, or IndexedDB
anywhere in the repo.

`src/index.js` and `src/utils.js` form a separate, unrelated Node program
using CommonJS: `src/utils.js` defines `greet(name)` returning a template
string and does `module.exports = { greet }`; `src/index.js` does
`const { greet } = require('./utils')` and calls it from a `main()`. Nothing
in `src/` is referenced by `index.html` or `app.js`, and nothing in the
browser code is referenced by `src/`.

There are no tests and no test infrastructure in the repository.

## Constraints to honor

- The only persistence target is browser `localStorage` (decided above).
- The app's only current input is a login form including a password field.
  Whatever is designed must not create a path by which credentials or auth
  state get written to durable storage.
- `localStorage` can be unavailable or throw: Safari private browsing,
  disabled cookies/site data, quota exhaustion on write, and cross-origin
  or `file://` sandboxing all produce real failures.
- Values persisted must survive a full page reload and a browser restart.

## What to produce

Propose 2-3 genuinely different viable designs for this preferences
subsystem. Concentrate on the decisions that are expensive to reverse:

- the storage layout in `localStorage` (how many keys, what shape, how
  namespaced, how versioned/migrated if the shape changes later);
- the module's public interface (sync vs async, defaults handling, what
  happens on an unknown key, whether reads are cached in memory);
- serialization and type fidelity, including what happens to values that do
  not round-trip;
- failure behavior when `localStorage` is absent, throws, or holds corrupt
  data;
- how change notification works, if at all, including the cross-tab
  `storage` event;
- how the design is made testable given there is currently no test runner.
