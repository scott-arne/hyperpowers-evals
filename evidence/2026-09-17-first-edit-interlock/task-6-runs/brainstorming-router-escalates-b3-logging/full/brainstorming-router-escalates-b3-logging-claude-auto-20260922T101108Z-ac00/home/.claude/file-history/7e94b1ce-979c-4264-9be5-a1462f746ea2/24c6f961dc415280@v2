# Approach Context: logging subsystem

## Original request (verbatim)

> Add logging to the app so we can debug production issues.

## Decisions already made by the human partner

These are settled constraints, not open questions.

1. **Surface**: both the browser app and the Node entry point, served by one
   shared core.
2. **Sink**: structured console output now, behind a pluggable sink interface
   so a remote sink can be added later without a rewrite.
3. **Module format**: a dual-format wrapper so the core loads both as a browser
   global and as a CommonJS module. Existing files are not to be converted to
   ES modules.
4. **Redaction**: a denylist of sensitive key names, applied in the core before
   any sink receives a record.

## Codebase facts

Repository is a 4-file JavaScript project, no dependencies, no `node_modules`,
no bundler, no build step, no test runner, no linter or formatter config.

- `package.json` — name `drill-test-project`, version 1.0.0, `"main":
  "src/index.js"`. No `scripts`, no `dependencies`, no `devDependencies`, no
  `"type"` field (so Node treats `.js` as CommonJS).
- `index.html` — 15 lines. A `<form id="login-form">` with `#username`
  (type=text), `#password` (type=password), and a submit button. Loads the app
  via `<script src="app.js"></script>` — a classic script tag, not
  `type="module"`.
- `app.js` — 28 lines, browser-only, no exports. Contents:
  - `const API_ENDPOINT = "https://api.example.com/login";`
  - `login(username, password)` — currently calls
    `console.log("Logging in:", username)` and returns a hardcoded
    `{ success: true, user: username }`. The network call is a stub; the
    comment says it would POST to `API_ENDPOINT` in a real app.
  - `validateForm(formData)` — returns `{ valid: false, error: "Missing
    required fields" }` when username or password is empty, else
    `{ valid: true }`.
  - A `submit` listener on `#login-form` that calls `preventDefault()`, reads
    both field values into local variables, calls `validateForm`, then either
    calls `login()` and `console.log("Login result:", result)` or
    `console.error("Validation error:", validation.error)`.
  - Four `console.*` call sites total in this file.
- `src/index.js` — 7 lines. `require('./utils')`, a `main()` that calls
  `console.log(greet('world'))`, and an immediate `main()` invocation.
- `src/utils.js` — 5 lines. `greet(name)` returning a template string;
  `module.exports = { greet }`.
- `README.md` — 3 lines, describes the repo as a minimal test project.

Git: branch `feature/webapp-enhancement`, working tree clean.

## What to produce

Given the four settled constraints above, propose approaches for the internal
design of the logging core: its public API shape, how levels are represented
and filtered, how the active level is configured at runtime in each of the two
environments, where the denylist redaction is applied relative to sink
dispatch, and what the record passed to a sink looks like.
