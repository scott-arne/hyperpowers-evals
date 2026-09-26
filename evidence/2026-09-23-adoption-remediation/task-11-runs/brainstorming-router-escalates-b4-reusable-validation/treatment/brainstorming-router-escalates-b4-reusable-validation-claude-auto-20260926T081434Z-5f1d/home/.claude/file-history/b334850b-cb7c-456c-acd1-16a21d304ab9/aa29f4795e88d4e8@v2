# Approach Context

## Original request (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and answers

**Q1: What forms will actually use this validation, beyond the existing login form?**
A: "Forms aren't decided yet, but yes — other forms will need it later, and it should work across the whole app."

**Q2: Which validation rules should ship in the shared module?**
A: Core set plus a custom escape hatch — `required`, `minLength`/`maxLength`, `email`, `pattern`, `matches` (confirm-field), plus caller-supplied custom functions. Async/server-side rules are explicitly out of scope.

**Q3: How much should the shared validation own?**
A: A pure validation core plus an optional thin DOM-binding layer that reads inputs and renders error messages, kept as two separate layers.

## Codebase facts

Repository is a minimal static webapp. Total source is 64 lines across 6 files.
Branch: `feature/webapp-enhancement`.

### Files

- `index.html` (15 lines) — single page, one form:
  - `<form id="login-form">` containing `<input type="text" id="username">` and
    `<input type="password" id="password">`, and a submit button.
  - Inputs carry `id` attributes only; **no `name` attributes**.
  - Loads `app.js` via a plain `<script src="app.js">` tag — no module type, no bundler.
- `app.js` (28 lines) — browser script, not a module. Contents:
  - `const API_ENDPOINT = "https://api.example.com/login";`
  - `function login(username, password)` — stub, logs and returns `{ success: true, user: username }`.
  - `function validateForm(formData)` — returns `{ valid: false, error: "Missing required fields" }`
    when `!formData.username || !formData.password`, otherwise `{ valid: true }`.
    Single aggregate error string; no per-field errors.
  - A `submit` listener on `#login-form` that calls `preventDefault()`, reads both
    values via `document.getElementById(...).value`, calls `validateForm`, then either
    calls `login()` or `console.error`s the validation error. Errors are logged to the
    console only — nothing is rendered into the DOM.
- `src/index.js` (7 lines) — CommonJS: `require('./utils')`, calls `main()` which logs a greeting.
- `src/utils.js` (5 lines) — CommonJS: `greet(name)`, `module.exports = { greet }`.
- `package.json` (6 lines) — name/version/description and `"main": "src/index.js"`.
  **No dependencies, no devDependencies, no scripts.**
- `README.md` (3 lines) — placeholder description.

### Constraints and existing patterns

- Two different module conventions coexist: `src/` uses CommonJS (`require`/`module.exports`);
  `app.js` is a classic browser script with globals and no module system.
- No build step, no bundler, no transpiler, no framework. Plain HTML + JS served as files.
- No test runner, no test files, no linter, no formatter configured anywhere.
- No CI configuration present.
- No existing shared/common module directory beyond `src/`.
- Only one form exists today; additional forms are anticipated but unspecified.
