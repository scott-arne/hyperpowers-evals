# Approach Context: user preferences storage

## Original request (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and the human partner's answers

**Q1: Which surface should preferences persist on?**
Options offered: browser `localStorage`; a Node CLI config file; server-side per user account.
**Answer: browser `localStorage`** (webapp side, no backend).

**Q2: How much should this change include?**
Options offered: storage module only; storage module plus one real preference wired into the page; storage module plus a full settings UI.
**Answer: storage module plus one real preference wired in**, proving a round-trip across a page reload. The candidate preference discussed was "remember my username", prefilling the login field.

**Q3: How should the prefs module be loaded by the page and by tests?**
Options offered: ES modules; CommonJS matching `src/utils.js`; plain global script matching `app.js`.
**Answer: ES modules** (`<script type="module">`, no bundler).

**Q4: Which tooling should be set up from the start?**
Options offered: unit tests via `node:test`; lint + format; end-to-end via Playwright.
**Answer: unit tests via `node:test` only.** No new runtime or dev dependencies.

## Codebase facts

Repository root contains exactly six tracked files (no build, no CI, no
`node_modules`, no lockfile, no test directory):

- `index.html` — 15 lines. A `<h1>Login</h1>` and a `<form id="login-form">`
  with `<input type="text" id="username">`, `<input type="password"
  id="password">`, and a submit button. Loads `app.js` via a plain
  `<script src="app.js"></script>` (no `type="module"`).
- `app.js` — 28 lines, browser script, no module system, all functions are
  globals. Declares `const API_ENDPOINT = "https://api.example.com/login"`.
  Defines `login(username, password)` (a stub that logs and returns
  `{ success: true, user: username }` — it performs no network call) and
  `validateForm(formData)` (returns `{valid:false, error:"Missing required
  fields"}` when either field is empty, else `{valid:true}`). At top level it
  calls `document.getElementById("login-form").addEventListener("submit", ...)`
  which preventDefaults, reads both input values, validates, and either calls
  `login()` or logs a validation error.
- `src/index.js` — 7 lines. CommonJS: `const { greet } = require('./utils');`
  then a `main()` that logs `greet('world')`, invoked at load.
- `src/utils.js` — 5 lines. CommonJS: defines `greet(name)` returning a
  template string, `module.exports = { greet }`.
- `package.json` — has only `name` (`drill-test-project`), `version`,
  `description`, `main: "src/index.js"`. **No `scripts` field, no `type`
  field, no dependencies, no devDependencies.**
- `README.md` — 3 lines, describes the repo as a minimal test project.

Additional facts:

- The browser half (`index.html` + `app.js`) and the Node half (`src/`) are
  entirely disconnected: nothing imports across them.
- The two halves use different and incompatible module conventions today
  (browser globals vs CommonJS).
- Node v26.8.2 and npx 11.19.1 are available on the machine. `node:test` and
  `node:assert` are therefore available with zero dependencies.
- Git branch is `feature/webapp-enhancement`; working tree is clean.
- There is no existing settings, preferences, config, or persistence code
  anywhere in the repository, and no existing storage abstraction.
- There is no existing test file, test runner, or test naming convention to
  follow.

## Constraints that came out of the answers

- No new runtime dependencies and no new dev dependencies.
- No bundler and no build step.
- The same module file must be loadable by the browser page and by the
  `node:test` runner. Note that `localStorage` is a browser global and is not
  unconditionally present in Node.
- Passwords must never be persisted; only non-sensitive preference data.

## What to produce

Independent approaches for the design of this preferences-storage module and
its integration: how preferences are represented and persisted, how the
module is structured and made testable under the above constraints, and how
failure cases are handled. Do not assume any particular answer.
