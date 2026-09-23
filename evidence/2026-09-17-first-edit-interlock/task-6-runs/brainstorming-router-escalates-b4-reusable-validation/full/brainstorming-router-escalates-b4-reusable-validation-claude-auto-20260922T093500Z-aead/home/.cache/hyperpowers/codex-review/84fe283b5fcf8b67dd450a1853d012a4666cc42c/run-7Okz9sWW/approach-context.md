# Approach Context

## Original idea (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and the human partner's answers

**Q: What is driving this — which other forms are actually coming, and what do
they need to validate?**
A: General reuse; no second form exists or is scheduled yet.

**Q: How much validation capability should ship in this change?**
A: A minimal engine with a declarative field-to-rules map and per-field error
results, implementing only a `required` rule. No rule library, no third-party
validation dependency.

**Q: How should the shared validation module be loaded?**
A: Dual export — CommonJS `module.exports` when available, otherwise a browser
global — so the browser keeps working with no build step and the engine is
`require()`-able from Node for unit tests.

**Q: Should this change also add shared error display, or only the validation
logic?**
A: Validation logic only. The login form's observable behavior must be
unchanged; error display is explicitly out of scope.

## Codebase facts

Repository is a minimal static webapp fixture. Full file inventory (64 lines
total across all files):

- `index.html` (15 lines) — loads `app.js` with a bare `<script src="app.js">`
  at line 13. Contains exactly one form, `id="login-form"`, with inputs
  `id="username"` (text) and `id="password"` (password) and a submit button.
- `app.js` (28 lines) — browser script, no module syntax. Contents:
  - `const API_ENDPOINT` and a stubbed `login(username, password)` that logs
    and returns `{ success: true, user: username }`.
  - `function validateForm(formData)` — returns
    `{ valid: false, error: "Missing required fields" }` when either
    `formData.username` or `formData.password` is falsy, else `{ valid: true }`.
    It is file-local: not exported, and its only call site is the submit
    handler in the same file.
  - A `submit` listener on `#login-form` that calls `preventDefault()`, reads
    the two input values, calls `validateForm`, then either calls `login` and
    logs the result or calls `console.error("Validation error:", ...)`.
    Failures are reported only to the console; nothing is rendered to the page.
- `src/index.js` (7 lines) — CommonJS: `require('./utils')`, calls `main()`.
- `src/utils.js` (5 lines) — CommonJS: `greet(name)`, `module.exports`.
  Unrelated to forms.
- `package.json` (6 lines) — `"main": "src/index.js"`. No `scripts`, no
  `dependencies`, no `devDependencies`.
- `README.md` (3 lines) — placeholder description.

Toolchain state: no bundler, no transpiler, no test runner, no linter, no
formatter configured anywhere in the repo. The browser path (`app.js`) and the
Node path (`src/`) currently use incompatible module conventions.

Git: branch `feature/webapp-enhancement`, working tree clean.

## What to produce

Independent approaches for structuring the reusable validation so it satisfies
the constraints above.
