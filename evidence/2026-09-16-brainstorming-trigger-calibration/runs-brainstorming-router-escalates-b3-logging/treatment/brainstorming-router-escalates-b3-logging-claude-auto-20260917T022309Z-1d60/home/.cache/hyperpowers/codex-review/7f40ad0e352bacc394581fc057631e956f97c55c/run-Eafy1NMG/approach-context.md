# Approach Context: add logging to a small webapp

## Original request (verbatim)

"Add logging to the app so we can debug production issues."

## Clarifying questions and the human partner's answers

**Q: Which surface does "the app" mean for this logging work?**
A: Both the browser app and the Node entry point, using one shared logger.

**Q: Where should browser logs end up in production?**
A: Console now, with a pluggable sink seam so a remote transport can be added
later without a rewrite. No remote transport is implemented in this change.

**Q: How should the logger handle passwords and other sensitive values?**
A: The logger redacts by key — a built-in denylist (password, token, secret,
authorization, cookie) recursively scrubbed before output. Caller discipline is
not relied upon.

**Q: How should the shared logger be loaded by both the browser page and the
Node entry point?**
A: A dual-mode single file — attaches to a browser global when loaded via a
script tag, and exports via module.exports when required by Node. No conversion
of existing files to ESM; no bundler; file:// loading must keep working.

**Q: How should the active log level be controlled?**
A: Runtime-configurable on both sides. Node reads a LOG_LEVEL environment
variable. Browser reads localStorage plus a ?logLevel=debug URL override.
Default level is info.

## Codebase facts

Repository is a minimal fixture project. Complete file inventory:

- `README.md` — 3 lines, "A minimal project for Drill test scenarios."
- `package.json` — name drill-test-project, version 1.0.0, `"main": "src/index.js"`.
  **No dependencies, no devDependencies, no scripts field, no test runner,
  no linter, no formatter, no build step, no lockfile.**
- `index.html` — plain HTML. Loads the app with `<script src="app.js"></script>`
  (a classic script tag, NOT `type="module"`). Contains a form `#login-form`
  with `#username` (text), `#password` (password), and a submit button.
- `app.js` — browser code, no module system at all (no import, no require, no
  exports). Contents:
  - `const API_ENDPOINT = "https://api.example.com/login";`
  - `login(username, password)` — a stub; logs `console.log("Logging in:", username)`,
    does NOT actually call API_ENDPOINT, returns `{ success: true, user: username }`.
  - `validateForm(formData)` — returns `{ valid: false, error: "Missing required fields" }`
    when username or password is falsy, else `{ valid: true }`.
  - A submit handler on `#login-form` that preventDefaults, reads both input
    values, calls validateForm, then either calls `login()` and
    `console.log("Login result:", result)`, or `console.error("Validation error:", ...)`.
- `src/index.js` — Node code, CommonJS: `const { greet } = require('./utils');`,
  a `main()` that `console.log(greet('world'))`, called immediately.
- `src/utils.js` — CommonJS: `greet(name)` returns a template string;
  `module.exports = { greet }`.

Existing logging today: four ad-hoc `console.log`/`console.error` call sites
(three in `app.js`, one in `src/index.js`). There is no logging module, no log
levels, no timestamps, no structured output, and no redaction anywhere.

Constraints:
- Node and browser are two different runtimes with no shared module system
  currently bridging them.
- The only real user flow in the app is a login form, so the logger sits
  adjacent to plaintext credentials: `login()` receives a raw password
  parameter, and the current code already logs the username on every attempt.
- The project has no established testing pattern to follow.
- Git branch is `feature/webapp-enhancement`; working tree clean.

## What to produce

Propose 2-3 genuinely different approaches for structuring this logging
subsystem given the decisions and constraints above. Focus on structure: the
logger's module/file layout, its public API shape, how the sink seam is
expressed, how redaction is applied, how level configuration is read per
runtime, and how the existing four call sites get migrated. Also note anything
about the decisions above that you think is a mistake or a risk.
