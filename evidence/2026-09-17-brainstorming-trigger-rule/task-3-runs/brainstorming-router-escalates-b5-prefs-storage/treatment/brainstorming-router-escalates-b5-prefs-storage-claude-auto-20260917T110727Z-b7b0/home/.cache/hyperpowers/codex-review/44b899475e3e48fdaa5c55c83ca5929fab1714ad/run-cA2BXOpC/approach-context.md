# Approach Context: user preferences storage

## Original idea (verbatim)

"Add user preferences storage so settings persist across sessions."

## Clarifying questions and answers

**Q: Where should preferences persist?**
A: Browser `localStorage`, behind a narrow preferences module. (Rejected:
server-backed per-account storage; a JSON file on disk for the Node script.)

**Q: Which preferences should this first version actually store?**
A: "Remember username" only — a checkbox on the login form that prefills the
username field on return. The password must never be persisted. (Rejected for
now: theme light/dark; building the storage layer with no UI consumer.)

**Q: What tooling should we set up from the start?**
A: The Node built-in test runner (`node:test` + `node:assert`), zero
dependencies. (Rejected: eslint/prettier/biome; Jest or Vitest with jsdom.)

## Codebase facts

Repository root contains exactly these tracked files (no build system, no
dependencies, no tests, no CI, no linter or formatter config):

- `index.html` — 15 lines. A plain page: `<h1>Login</h1>`, a `<form
  id="login-form">` containing `<input type="text" id="username">`, `<input
  type="password" id="password">`, and a submit button. Loads `app.js` via a
  plain `<script src="app.js">` tag. No bundler, no module type, no CSS file,
  no `<link>` tags.
- `app.js` — 28 lines, browser globals only, no imports or exports. Defines a
  module-scope `const API_ENDPOINT`, `function login(username, password)` (a
  stub that logs and returns `{ success: true, user: username }` without any
  network call), and `function validateForm(formData)` (returns `{valid:
  false, error: "Missing required fields"}` when username or password is
  empty, else `{valid: true}`). At top level it calls
  `document.getElementById("login-form").addEventListener("submit", ...)`;
  the handler calls `e.preventDefault()`, reads both input values by id,
  calls `validateForm`, and on success calls `login` and logs the result.
- `src/index.js` — 7 lines. CommonJS: `const { greet } = require('./utils')`,
  a `main()` that logs `greet('world')`, and a top-level `main()` call.
- `src/utils.js` — 5 lines. CommonJS: `function greet(name)` returning a
  template string; `module.exports = { greet }`.
- `package.json` — name `drill-test-project`, version `1.0.0`, `"main":
  "src/index.js"`. No `scripts`, no `dependencies`, no `devDependencies`, no
  `"type"` field (so `.js` is CommonJS under Node).
- `README.md` — 3 lines, describes it as a minimal project.

Additional facts and constraints:

- The browser page and the `src/` Node script are entirely disjoint: neither
  references the other, and nothing bundles `src/` into the page.
- Because there is no bundler and no `type="module"` on the script tag,
  `app.js` currently runs as a classic script with everything in global
  scope.
- Because `package.json` has no `"type": "module"`, Node treats `.js` as
  CommonJS, so the Node test runner will `require` rather than `import` by
  default.
- The chosen storage mechanism (`localStorage`) exists in the browser but not
  in Node, so anything the Node test runner exercises must either not touch
  `localStorage` directly or must be able to run against a substitute.
- There is no existing settings screen, settings object, config file,
  persistence code, or storage abstraction anywhere in the repo.
- Git: branch `feature/webapp-enhancement`, clean working tree.

## What to produce

Independent approaches for adding a user-preferences storage subsystem under
the constraints above. Consider, among whatever else you judge relevant: the
storage schema/data model in `localStorage`; how defaults and unknown or
corrupt stored values are handled; how the module is structured so that both
a bundler-less browser page and a Node test runner can load it; and how the
"remember username" preference is wired into the existing form handler.
