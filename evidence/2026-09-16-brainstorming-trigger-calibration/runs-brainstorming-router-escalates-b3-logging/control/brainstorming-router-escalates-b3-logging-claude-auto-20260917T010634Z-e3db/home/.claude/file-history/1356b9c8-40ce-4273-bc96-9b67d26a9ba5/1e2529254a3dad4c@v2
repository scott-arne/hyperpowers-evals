# Approach context: add logging to a small webapp

## Original idea (verbatim)

"Add logging to the app so we can debug production issues."

## Decisions already made by the human partner

These are settled. Do not re-litigate them; design within them.

1. **Scope**: one logging module shared by both halves of the repo — the
   browser app and the Node entry point.
2. **Destination**: log records go to the console now, but sinks are a
   pluggable interface. Console is the only sink implemented today; a remote
   sink must be addable later as a config change, not a call-site rewrite.
   No collector endpoint exists yet.
3. **Redaction**: recursive key-name pattern redaction (keys matching
   password/token/secret/auth and similar) as a backstop, plus a standing
   rule that credential-bearing objects are never passed to the logger at all
   (log presence, e.g. `{ hasPassword: true }`, not values).
4. **Usernames**: logged in full by the Node sink; logged hashed by the
   browser sink.
5. **Module format**: ES modules everywhere. `package.json` gains
   `"type": "module"`, the existing `src/*.js` files convert from CommonJS
   `require` to `import`, and `index.html` switches to
   `<script type="module">`.
6. **Tooling**: unit tests via Node's built-in `node:test` runner, zero
   dependencies. No linter/formatter is being added.

## Codebase facts

Repository root contains:

- `package.json` — name `drill-test-project`, version 1.0.0,
  `"main": "src/index.js"`. **No dependencies, no devDependencies, no
  scripts, no `type` field.**
- `README.md` — two lines, describes it as a minimal test project.
- `index.html` — a login form with `#login-form`, `#username`,
  `#password`, a submit button, and `<script src="app.js"></script>`
  (classic script, not a module).
- `app.js` (28 lines, browser, no module system) — declares
  `const API_ENDPOINT = "https://api.example.com/login"` (a stub endpoint
  that is never actually called); `login(username, password)` which does
  `console.log("Logging in:", username)` and returns a hardcoded
  `{ success: true, user: username }`; `validateForm(formData)` returning
  `{valid, error}` based on presence of username/password; and a submit
  listener that reads both input values, calls `validateForm`, then either
  calls `login` and `console.log("Login result:", result)` or
  `console.error("Validation error:", ...)`.
- `src/index.js` — CommonJS: `const { greet } = require('./utils')`, a
  `main()` that `console.log(greet('world'))`, and a call to `main()`.
- `src/utils.js` — CommonJS: `greet(name)` returning a template string,
  `module.exports = { greet }`.

There is no test directory, no test runner, no build step, no bundler, no
lint config, no CI config, and no existing logging module or logging
convention. All current logging is ad-hoc `console.log`/`console.error`.
There are five existing console call sites in total (three in `app.js`,
one `console.error` in `app.js`, one in `src/index.js`).

Git: branch `feature/webapp-enhancement`, clean tree, four small commits.

Runtime targets are a browser (no build step, loaded straight from
`index.html`) and Node (version unpinned; assume a current LTS with
`node:test` available).

## What to propose approaches for

The open design space is the *shape of the logging module* under the
constraints above. Specifically:

- The public logging API surface that call sites use.
- The log record / data model, and how it is serialized per sink.
- The sink interface contract, and how sinks are registered and selected
  per environment (browser vs Node) without a build step or bundler.
- How level filtering and runtime configuration work, including how a
  production browser session could have its level changed.
- Where the redaction step lives relative to the sink boundary, given that
  the username rule differs per sink (full in Node, hashed in browser).
- How the whole thing is made testable with `node:test` given one of the
  two runtimes is a browser.

Propose 2-3 genuinely different architectures for this, with materially
different tradeoffs — not variations of one shape.
