# Approved design context — user preferences storage

## Original request (verbatim)

"Add user preferences storage so settings persist across sessions."

## Codebase facts

- Repo root contains: `index.html`, `app.js`, `README.md`, `package.json`,
  `src/index.js`, `src/utils.js`. No other source files, no tests, no CI.
- `index.html` is a login page: username input, password input, submit button,
  and `<script src="app.js"></script>`. No other controls.
- `app.js` is a classic (non-module) script: `API_ENDPOINT` constant,
  a stubbed `login()` that only logs and returns `{success:true,user}` without
  any network call, `validateForm()`, and a submit listener.
- `src/index.js` and `src/utils.js` are CommonJS Node files (`require` /
  `module.exports`), unrelated to the browser app.
- `package.json` declares no dependencies, no devDependencies, and no scripts.
  `main` points at `src/index.js`.
- No bundler, no build step, no test runner, no linter, no formatter.

## Decisions made with the user during brainstorming

Question: What should the preferences system store, given the app has no
settings today?
Answer: The storage layer plus one real consumer — remember the username on the
login form.

Question: Where should preferences live (localStorage sync API / localStorage
async API / server-backed)?
Answer: localStorage with a synchronous API.

Question: How is the remembered username captured (opt-in checkbox / always
remember)?
Answer: Opt-in "Remember me" checkbox.

Question: How is the module loaded in the browser and in tests (dual export /
ES modules everywhere / ESM for the new file only)?
Answer: Dual export — CommonJS export with a browser-global fallback, so no
existing file changes module style.

Question: Which data model (single JSON blob / key-per-preference /
schema-driven store)?
Answer: Single JSON blob under one key, with a defaults table.

Question: Which tooling to set up from the start?
Answer: Unit tests via Node's built-in `node:test` only. No linter, no
formatter.

## Explicitly out of scope (user-approved)

- Settings UI or settings page.
- Any preference beyond `rememberUsername` and `lastUsername`.
- Server-side or cross-device sync.
- Changes to `src/index.js` and `src/utils.js`.
- DOM/browser test infrastructure for the login-form wiring.
