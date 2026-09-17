# Approach Context

## Original idea (verbatim)

"Add logging to the app so we can debug production issues."

## Clarifying questions and the human partner's answers

1. **Which code should the logging subsystem cover?**
   Answer: Browser app only (`app.js` / `index.html`). The Node module under
   `src/` is out of scope.

2. **Where should production logs actually go?**
   Answer: A collector endpoint the team owns — a structured logger plus a
   buffered POST to their own collector. Not console-only, not a third-party
   service such as Sentry.

3. **Does a log collector endpoint already exist?**
   Answer: Not yet. Design the seam: configurable endpoint, working
   buffer/POST path, pointed at a placeholder. Standing up the collector
   itself is out of scope for this work.

4. **What is the redaction policy for data sent to the collector?**
   Answer: Allowlist, deny by default. Only explicitly-named safe fields are
   logged. The username is excluded; correlation uses a random per-session ID
   instead.

## Codebase facts

Repository is a small fixture-sized project. Git branch
`feature/webapp-enhancement`. Four commits of history.

Files:

- `app.js` (921 bytes) — the browser app, plain script, no modules, no build
  step. Contents:
  - `const API_ENDPOINT = "https://api.example.com/login";` — a stub constant;
    a comment states a real app would POST to it.
  - `login(username, password)` — currently calls
    `console.log("Logging in:", username)` and returns
    `{ success: true, user: username }` without any network call.
  - `validateForm(formData)` — returns `{ valid: false, error: "Missing
    required fields" }` when username or password is absent, else
    `{ valid: true }`.
  - A `submit` listener on `#login-form` that reads `#username` and
    `#password` values, calls `validateForm`, then on success calls `login`
    and `console.log("Login result:", result)`, else
    `console.error("Validation error:", validation.error)`.
- `index.html` — loads `app.js` with a plain `<script src="app.js">` tag. No
  bundler, no module type attribute. Form has `#username` (text),
  `#password` (password), and a submit button.
- `package.json` — name `drill-test-project`, version 1.0.0,
  `"main": "src/index.js"`. No dependencies, no devDependencies, no scripts.
- `src/index.js`, `src/utils.js` — a separate CommonJS Node module exporting
  `greet(name)`. Unconnected to the browser app. Out of scope.
- `README.md` — two lines, no build or tooling documentation.

Constraints and existing patterns:

- No build step, no bundler, no transpiler, no module loader in the browser
  path. `app.js` is loaded as a classic script.
- No test framework, no linter, no formatter configured anywhere.
- No runtime dependencies anywhere in the project.
- Existing style in `app.js`: plain function declarations, double-quoted
  strings, two-space indent, semicolons, no JSDoc or comment blocks beyond
  single-line `//` notes.
- The existing logging is ad-hoc `console.log` / `console.error` calls that
  currently emit a username, in a function that also receives a plaintext
  password.
- Browser-side constraints that matter: the page can unload mid-session, the
  collector can be unreachable or return errors, and the logger must never
  become a source of crashes or infinite loops in the app it instruments.
