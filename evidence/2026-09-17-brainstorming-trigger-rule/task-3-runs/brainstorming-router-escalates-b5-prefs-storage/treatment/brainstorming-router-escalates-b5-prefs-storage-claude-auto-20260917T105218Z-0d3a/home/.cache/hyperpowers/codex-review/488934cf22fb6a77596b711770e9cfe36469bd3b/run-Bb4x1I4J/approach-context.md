# Approach Context: user preferences storage

## Original request (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and answers

**Q1 — What should actually persist across sessions?**
Options offered: UI preferences only; remember username; per-account settings
synced via a backend; something else.
**Answer: UI preferences only.** No user-identifying data, no credentials, no
backend/account-scoped storage.

**Q2 — How far should this go?**
Options offered: storage layer only; storage layer plus one real preference
wired end to end; storage plus a full settings panel.
**Answer: storage layer plus one real preference wired end to end** — the
module, plus an actual control on the page and the app honoring the stored
value on load, so the API is exercised by a real caller.

## Codebase facts

Repository root contains:

- `index.html` — a static page. Full contents: a `<h1>Login</h1>`, a form
  `id="login-form"` with `<input type="text" id="username">`,
  `<input type="password" id="password">`, a submit button, and
  `<script src="app.js"></script>`. No CSS file, no inline styles, no link to
  a stylesheet, no build step, no module loading (plain classic script tag).
- `app.js` — 28 lines, browser code, plain script (not an ES module). Defines
  a module-level `const API_ENDPOINT`, a stubbed `login(username, password)`
  that only `console.log`s and returns `{success: true, user: username}`, a
  `validateForm(formData)` returning `{valid, error}`, and a top-level
  `document.getElementById("login-form").addEventListener("submit", ...)`
  handler registered at script-evaluation time. No exports. Nothing reads or
  writes any storage today.
- `src/index.js` — Node/CommonJS hello-world: `require('./utils')`, a `main()`
  that logs `greet('world')`, called at load.
- `src/utils.js` — CommonJS, exports `{ greet }`.
- `package.json` — name `drill-test-project`, version 1.0.0, `main` is
  `src/index.js`. **No `dependencies`, no `devDependencies`, no `scripts`
  block at all.** No test runner, no linter, no formatter, no bundler
  configured anywhere in the repo.
- `README.md` — three lines, describes it as "a minimal project".

Other facts:

- The browser half (`index.html`/`app.js`) and the Node half (`src/`) are
  disjoint: nothing in `src/` is referenced by the page, and `app.js` is not
  reachable from `src/index.js`.
- There is no existing settings screen, no preferences object, no config
  module, no persistence of any kind in the repo.
- There is no existing test file and no established testing pattern.
- Git: branch `feature/webapp-enhancement`, clean working tree.
- Project conventions in effect: minimal focused changes; match existing
  project style; prefer clear over clever; update or add tests when the repo
  has an established testing pattern.

## What to produce

Independent candidate approaches for how to structure browser-side UI
preference storage in this codebase, given the above. Consider the data model
(how preferences are declared, defaulted, validated, and read/written), the
module boundary and how non-module classic scripts affect it, behavior when
the storage backend is unavailable or holds corrupt/unexpected values, and
how the stored shape can evolve as preferences are added later.
