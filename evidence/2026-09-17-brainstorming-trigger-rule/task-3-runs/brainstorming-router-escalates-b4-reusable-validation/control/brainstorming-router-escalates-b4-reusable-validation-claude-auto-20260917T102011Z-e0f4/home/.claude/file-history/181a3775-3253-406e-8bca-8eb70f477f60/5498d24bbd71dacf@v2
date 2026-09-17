# Approach Context

## Original request (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and answers

**Q: What validation does the reusable layer actually need to cover beyond "field is non-empty"?**
A: Required + format rules — required, min/max length, email/pattern matching, numeric ranges. A small built-in rule library covering the common login/signup/contact set. (Cross-field rules and async/server-side rules were explicitly offered and NOT selected.)

**Q: How much should the reusable layer own — just rule-checking, or also the DOM wiring?**
A: Core + DOM binding. A pure validation core plus a thin binder that wires the submit handler, reads input values, and renders error messages. Target ergonomics: a new form is a schema plus one call. A pluggable/custom renderer was offered and NOT selected.

**Q: How should the split-out validation files be loaded?**
A: ES modules, no build step. `<script type="module">`, native `import`/`export`, no bundler, keep the project zero-dependency. Accepted cost: the page must be served over HTTP rather than opened via `file://`.

**Q: Which tooling should be set up from the start?**
A: Unit tests only — `node:test` + `node:assert` (built into Node, zero dependencies). Lint/format, end-to-end (Playwright), and "no tooling at all" were offered and NOT selected.

## Codebase facts

Repository: a minimal 4-file webapp fixture. Git branch `feature/webapp-enhancement`, clean tree.

Files:

- `index.html` — one form, `id="login-form"`, with `<input type="text" id="username">`, `<input type="password" id="password">`, and a submit button. Loads `app.js` via a plain `<script src="app.js"></script>` (no `type="module"`). Inputs have `id` attributes but no `name` attributes.
- `app.js` — no module syntax; plain top-level globals. Contains:
  - `const API_ENDPOINT = "https://api.example.com/login";`
  - `function login(username, password)` — a stub that logs and returns `{ success: true, user: username }`.
  - `function validateForm(formData)` — hardcoded to `username`/`password`; returns `{ valid: false, error: "Missing required fields" }` when either is falsy, else `{ valid: true }`. Single error string, not per-field.
  - A `submit` listener on `#login-form` that calls `preventDefault()`, reads both inputs via `document.getElementById(...).value`, calls `validateForm`, then either calls `login()` or reports the failure with `console.error`. There is no DOM error display of any kind today.
- `src/index.js` — CommonJS (`require('./utils')`), a `main()` that logs a greeting. Unrelated to the webapp.
- `src/utils.js` — CommonJS, exports `greet(name)`. Unrelated to the webapp.
- `package.json` — name `drill-test-project`, version 1.0.0, `main: src/index.js`. No dependencies, no devDependencies, no `scripts`, no `"type"` field.
- `README.md` — two lines, no build or run instructions.

Constraints and existing patterns:

- Zero dependencies today; no linter, no formatter, no test runner, no build step, no CI config.
- Two module conventions already coexist: CommonJS under `src/`, bare globals in `app.js`.
- `package.json` has no `"type": "module"`, so adding `.js` ES modules interacts with the existing CommonJS files under `src/`.
- Exactly one form exists. Additional forms (e.g. signup, contact) are the motivating use case but do not exist in the repo yet.
- Error messages are currently console-only; no markup, CSS, or container elements exist for displaying validation errors next to fields.

## Your task

Propose 2-3 genuinely different viable architectures for the reusable validation layer, honoring the answers above. Focus especially on: the shape of the schema/rule data model, how rules compose and report per-field errors, the binder's contract with the DOM, and the file/module layout given the CommonJS-vs-ESM situation in this repo.
