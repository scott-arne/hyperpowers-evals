# Approach Context: user preferences storage

## Original request (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and the human partner's answers

**Q: Which program should the preferences storage serve?**
A: The browser app (`index.html` + `app.js`), using `localStorage`. Not the
Node program in `src/`, and not a shared core serving both.

**Q: What shape should the stored preferences take?**
A: A fixed set of declared keys, each with a default and a validator. Unknown
keys rejected. (Chosen over a generic open key/value store, and over a
minimal login-only set.)

**Q: What tooling should be set up alongside the feature?**
A: Unit tests using Node's built-in `node:test` runner plus an `npm test`
script. Zero new dependencies. No linter/formatter.

## Codebase facts

Repository root contains exactly:

- `index.html` — a plain HTML page, no build step, no framework, no bundler.
  Body is an `h1`, a `form#login-form` containing `input#username`
  (type=text), `input#password` (type=password), and a submit button. Loads
  `app.js` via a plain `<script src="app.js">` tag (no `type="module"`).
- `app.js` — 28 lines of vanilla browser JS at global scope. Declares
  `const API_ENDPOINT`, `function login(username, password)` (a stub that
  logs and returns `{success: true, user: username}`), and
  `function validateForm(formData)` returning `{valid, error}`. At the bottom
  it calls `document.getElementById("login-form").addEventListener("submit", ...)`
  at load time, which reads the two input values, validates, and calls
  `login`. There is no module system in use in this file — no `require`, no
  `import`, no `export`.
- `src/index.js` — CommonJS: `const { greet } = require('./utils');` then a
  `main()` that console.logs a greeting. Unrelated to the browser app.
- `src/utils.js` — CommonJS: exports a single `greet(name)` function.
- `package.json` — `{name: "drill-test-project", version: "1.0.0",
  description, main: "src/index.js"}`. No `scripts`, no `dependencies`, no
  `devDependencies`, no `"type"` field (so `.js` is CommonJS for Node).
- `README.md` — three lines, describes it as a minimal test project.

No test runner, no test directory, no linter config, no CI config, no
`node_modules`. Git branch is `feature/webapp-enhancement`; working tree
clean.

## Constraints established

- Storage backend is `localStorage` in the browser.
- The password must never be persisted. `localStorage` is plaintext, readable
  by any script on the origin, and survives logout.
- The preferences module must be unit-testable under `node:test`, i.e.
  runnable in a Node process where `localStorage` and `document` do not
  exist.
- The app currently has no module system in the browser (plain script tag,
  global scope). Any choice here interacts with that fact.
- Behaviour when the backend is unavailable (private mode, disabled storage,
  quota exceeded) and when a stored value is corrupt/unparseable must be
  defined.

## What to produce

Independent candidate approaches for how to structure this preferences
storage: the module boundary, its public API, how the fixed schema and
defaults are expressed, how persistence is triggered, and how it is made
testable outside a browser. Do not assume any particular structure is
already decided beyond the answers above.
