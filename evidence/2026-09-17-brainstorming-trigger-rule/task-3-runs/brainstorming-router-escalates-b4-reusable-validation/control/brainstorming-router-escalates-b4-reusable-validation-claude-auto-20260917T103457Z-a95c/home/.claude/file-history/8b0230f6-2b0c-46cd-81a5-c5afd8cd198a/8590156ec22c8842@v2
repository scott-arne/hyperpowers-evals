# Approach context

## Original idea (verbatim)

> Make the form validation reusable across multiple forms.

## Clarifying questions and the human partner's answers

1. **Which forms are coming, and what do they need to validate?**
   Answer: "Several forms, rules unknown" — multiple forms are planned but the
   specific rules are not pinned down. A general, extensible rule set is wanted
   (required, min/max length, email, pattern, cross-field match were named as
   illustrative examples, not a fixed list).

2. **How much should the shared validation own?**
   Answer: a pure validation core, plus a *separate, optional* DOM-binding layer
   on top that can wire a form element and render errors. A form must be able to
   use the core alone and do its own error UI.

3. **What module format?**
   Answer: ES modules. No bundler, no build step. The browser loads it via
   `<script type="module">`; Node imports it directly for tests. The existing
   CommonJS files under `src/` are out of scope and stay as they are.

## Codebase facts

Repository: a minimal static webapp fixture. Git branch `feature/webapp-enhancement`,
working tree clean.

Files (complete list, excluding `.git`):

- `index.html` — single page. One form, `id="login-form"`, containing
  `<input type="text" id="username">`, `<input type="password" id="password">`,
  and a submit button. Loads `app.js` via a plain `<script src="app.js">` tag.
  No error-message elements exist in the markup. No CSS, no classes on anything.
- `app.js` — 28 lines, classic script (no module syntax). Contains:
  - `const API_ENDPOINT = "https://api.example.com/login"` (unused beyond a comment)
  - `login(username, password)` — a stub that logs and returns `{ success: true, user }`
  - `validateForm(formData)` — hardcoded to `formData.username` and
    `formData.password`; returns `{ valid: false, error: "Missing required fields" }`
    if either is falsy, else `{ valid: true }`. One error string for the whole
    form; no per-field information.
  - A top-level `document.getElementById("login-form").addEventListener("submit", ...)`
    handler that preventDefaults, reads the two inputs by id, calls `validateForm`,
    and on success calls `login`. Failures go to `console.error`. No DOM error display.
- `src/index.js` — CommonJS; `require`s `./utils` and logs `greet('world')`.
  Unrelated to the webapp; not loaded by `index.html`.
- `src/utils.js` — CommonJS; exports `greet(name)`.
- `package.json` — name `drill-test-project`, version 1.0.0, `main: src/index.js`.
  **No dependencies, no devDependencies, no scripts, no `"type"` field.**
- `README.md` — three lines, no build or usage instructions.

Toolchain state: no test runner, no lint config, no formatter config, no CI
config, no `node_modules`, no lockfile. Nothing is currently configured.

## Constraints

- Zero runtime dependencies is the current state of the project.
- Must work opened as a static page and be importable by Node for tests.
- The rules that future forms need are genuinely unknown today, so the rule
  vocabulary needs to be extensible without editing the core.
