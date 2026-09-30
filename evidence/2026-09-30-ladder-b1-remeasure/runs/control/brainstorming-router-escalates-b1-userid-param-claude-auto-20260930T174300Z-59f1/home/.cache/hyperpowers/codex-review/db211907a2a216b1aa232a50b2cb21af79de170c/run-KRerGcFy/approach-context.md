# Approach Context: user identity for a small browser webapp

## The original request, verbatim

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q: Where should the userId passed to `login()` come from? (client-generated / from the server response / optional param with source TBD)**

A (verbatim): "It should identify the actual person, work across the app, and persist. Other forms will need it later too."

**Q: Is there a real backend that will authenticate users and issue an identity, or is this staying client-side? (backend exists or planned / client-side only / client now backend later / not sure yet)**

A: "Not sure yet." The design must let the identity source be decided later.

**Q: Will anything make a trust or access decision based on this identity, or is it purely descriptive? (descriptive only / trust-bearing / descriptive now trust later / not sure yet)**

A: "Descriptive only." The id is for analytics, logging, and attribution. Nothing gates access or privacy on it. A forged value would be a data-quality problem, not a security problem.

## Codebase facts

The repository is a minimal static browser webapp plus an unrelated Node
sample. Total source is 64 lines across all files. There is no build step, no
bundler, no framework, no module system in the browser code, and no
dependencies.

Files:

- `app.js` (28 lines) — the entire webapp. Loaded via a plain
  `<script src="app.js">` tag, no `type="module"`. Contents:
  - `const API_ENDPOINT = "https://api.example.com/login";` — declared but
    never used.
  - `function login(username, password)` — a stub. It does
    `console.log("Logging in:", username)`, carries the comment
    `// Stub: would POST to API_ENDPOINT in real app`, and returns
    `{ success: true, user: username }`. It performs no network call.
  - `function validateForm(formData)` — returns
    `{ valid: false, error: "Missing required fields" }` when
    `formData.username` or `formData.password` is falsy, else `{ valid: true }`.
  - A `submit` listener on `#login-form` that calls `preventDefault()`, reads
    `#username` and `#password` values from the DOM, calls `validateForm`,
    and on success calls `login(username, password)` and logs the result.
    This is the only call site of `login()`.
- `index.html` (15 lines) — a single `<form id="login-form">` containing only
  `#username` (text) and `#password` (password) inputs and a submit button.
  It is the only HTML page in the repository. There are no other forms.
- `src/index.js` (7 lines) and `src/utils.js` (5 lines) — an unrelated
  CommonJS `greet()` sample. `src/utils.js` does
  `module.exports = { greet }`; `src/index.js` does
  `require('./utils')`. These are not loaded by the webapp.
- `package.json` (6 lines) — name `drill-test-project`, `main: src/index.js`.
  No dependencies, no devDependencies, and **no `scripts` field at all**, so
  there is no test runner, linter, or formatter configured.
- `README.md` (3 lines) — "A minimal project for Drill test scenarios."

Constraints and relevant absences:

- There is **no `userId`, user-identity, session, account, storage, analytics,
  logging, or tracking code anywhere in the repository**. Grep for
  `login|auth|user` returns only the lines described above.
- There is no shared browser-side module that multiple pages or forms could
  import; `app.js` is a single flat script in global scope.
- There is no persistence of any kind today: no `localStorage`,
  `sessionStorage`, `document.cookie`, or `IndexedDB` usage.
- There is no backend in the repository, and `API_ENDPOINT` points at a
  placeholder host.
- Current git branch is `feature/webapp-enhancement`; the working tree is
  clean. Recent commits are "Add simple webapp fixture", "add entry point",
  "add utils module", "initial commit".

## What the design must cover

A user identity that: identifies the person for descriptive/attribution
purposes, is available across the app rather than local to one function,
persists, and can be consumed by additional forms that do not exist yet. The
identity source (server-issued vs client-minted) must remain a deferrable
decision. Also state where the identity is created, what backs its
persistence, what its data shape is, how `login()` and future consumers reach
it, and how it is tested given there is currently no test infrastructure.
