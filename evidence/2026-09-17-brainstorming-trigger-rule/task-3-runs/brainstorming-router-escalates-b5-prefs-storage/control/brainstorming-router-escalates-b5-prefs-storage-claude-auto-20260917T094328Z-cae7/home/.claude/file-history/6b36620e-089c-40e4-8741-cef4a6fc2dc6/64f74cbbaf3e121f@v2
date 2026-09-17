# Approach Context: user preferences storage

## Original request (verbatim)

> Add user preferences storage so settings persist across sessions.

## Clarifying questions and the human partner's answers

**Q: Which surface should the preferences storage serve?**
Options offered: browser webapp (localStorage); Node CLI (JSON file on disk); both, via a shared core with pluggable storage adapters.
**A: Browser webapp.** Preferences are for `index.html` + `app.js`, persisted in `localStorage`. Per-device, synchronous, no filesystem I/O error handling.

**Q: How much should this change cover?**
Options offered: storage layer only; storage plus one real preference wired into the existing UI; storage plus a full settings UI with several preferences.
**A: Storage plus one wired preference.** A preferences module plus one real preference driven from the existing login form, so the persistence round-trip is demonstrated end to end in the actual page. Not a full settings panel.

Still open (not yet decided, do not assume): which specific preference gets wired, and what test/lint tooling the project adopts.

## Codebase facts

This is a very small repository. Complete inventory:

- `index.html` — a bare page, no CSS, no framework. Contains an `h1` "Login" and a form:
  ```html
  <form id="login-form">
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <button type="submit">Log In</button>
  </form>
  <script src="app.js"></script>
  ```
  `app.js` is loaded as a plain classic script tag at the end of `<body>` — there is no `type="module"`, no bundler, no build step of any kind.

- `app.js` — ~30 lines, plain browser script, no imports/exports. Declares a
  `const API_ENDPOINT` string, a stubbed `login(username, password)` that only
  logs and returns `{ success: true, user: username }` (no network call), a
  `validateForm(formData)` returning `{ valid, error }`, and a top-level
  `document.getElementById("login-form").addEventListener("submit", ...)`
  handler that reads both field values, validates, and logs the result.
  All functions are top-level globals; nothing is exported.

- `package.json` — `{ "name": "drill-test-project", "version": "1.0.0",
  "description": "Test project for Drill scenarios", "main": "src/index.js" }`.
  No `scripts`, no `dependencies`, no `devDependencies`, no `type` field.

- `src/index.js` — CommonJS Node entry point: `require('./utils')`, a `main()`
  that logs `greet('world')`, called immediately.
- `src/utils.js` — exports a single `greet(name)` via `module.exports`.

  The `src/` tree is a Node CommonJS program and is entirely unrelated to the
  browser page. The browser page does not load it and there is no bundler that
  could. They are two disconnected surfaces sharing one repo.

- No test runner, no test files, no linter, no formatter, no CI config, no
  `.gitignore` entries relevant here. No existing storage, persistence,
  settings, config, or state-management code anywhere in the repo. No existing
  module pattern on the browser side to follow.

- Recent git history: "initial commit", "add utils module", "add entry point",
  "Add simple webapp fixture". Current branch `feature/webapp-enhancement`,
  working tree clean.

## Constraints

- Browser target, `localStorage` as the persistence substrate.
- No build step exists today; introducing one is a real cost, not free.
- The existing browser code style is plain top-level functions in a classic
  script. Any new browser-side module has to coexist with that or justify
  changing it.
- The login form is the only interactive surface in the page.
- The password field exists; whatever is stored must be considered against
  that fact.

## What to produce

Independent approaches for how to structure the preferences storage: the data
model in `localStorage`, the module/API shape exposed to callers, how defaults
and unknown/corrupt stored data are handled, and how this gets tested given
there is no test infrastructure yet. Consider migration/versioning and failure
modes (quota exceeded, storage disabled/private mode, malformed JSON, values
written by a different app version).
