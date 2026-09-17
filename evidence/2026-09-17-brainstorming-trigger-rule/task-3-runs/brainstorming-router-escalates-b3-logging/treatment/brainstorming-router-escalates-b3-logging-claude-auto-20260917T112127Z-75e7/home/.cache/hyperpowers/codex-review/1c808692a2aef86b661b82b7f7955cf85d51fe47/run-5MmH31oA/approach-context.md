# Approach Context: logging subsystem for a small webapp

## Original idea (verbatim)

> Add logging to the app so we can debug production issues.

## Clarifying questions and the human partner's answers

**Q: Which part of the app needs the logging?**
A: Both the browser app and the Node side, via a shared module.

**Q: Where should browser logs actually go in production?**
A: In-memory ring buffer plus manual export (a console command or a
download). No remote collector endpoint. Nothing leaves the user's
machine unless the user acts.

**Q: How strict should redaction be?**
A: Key-name denylist (password, token, secret, auth, cookie, and
secret-shaped values) plus a hard structural rule that the logger is
never handed a raw password value; the login call site passes a
redacted payload.

## Codebase facts

Repository contents (complete; this is the entire project):

- `index.html` — page hosting a login form with `#login-form`,
  `#username`, `#password` element IDs.
- `app.js` — loaded by `index.html` as a plain browser script. No
  module system, no bundler. Declares `const API_ENDPOINT`, functions
  `login(username, password)` and `validateForm(formData)`, and
  registers a `submit` listener on `#login-form`. Currently calls
  `console.log("Logging in:", username)`, `console.log("Login result:",
  result)`, and `console.error("Validation error:", ...)`. The `login`
  function is a stub that returns `{ success: true, user: username }`
  without performing a network call.
- `src/index.js` — CommonJS. `const { greet } = require('./utils');`
  defines `main()` which calls `console.log(greet('world'))`, then
  invokes `main()` at module top level.
- `src/utils.js` — CommonJS. Exports `greet(name)` via
  `module.exports = { greet }`.
- `package.json` — name `drill-test-project`, version `1.0.0`,
  `"main": "src/index.js"`. **No `dependencies`, no `devDependencies`,
  no `scripts`, no `"type"` field.**
- `README.md` — three lines, no build or run instructions.

Constraints and existing patterns:

- Zero third-party dependencies today. No build step, no bundler, no
  transpiler, no test runner, no linter, no CI configuration.
- Two different runtimes must consume the same logger module: Node
  under CommonJS `require`, and the browser via a plain `<script>` tag
  with no module loader.
- No existing logging abstraction, log level concept, configuration
  file, or environment-variable convention exists in the repo.
- No tests exist anywhere in the repository.
- Git branch is `feature/webapp-enhancement`; working tree clean.

## Your task

Propose 2-3 genuinely different viable architectures for this logging
subsystem, with materially different tradeoffs. Consider in particular
how one shared module is packaged and consumed across the CommonJS
Node context and the no-bundler browser context, how log level is
configured per runtime, where the redaction responsibility sits, and
how the buffer and its export are structured.
