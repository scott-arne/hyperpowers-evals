# Approved design decisions (brainstorming)

Original request, verbatim:

> Move the API endpoint config into a new settings module so it's easier to
> change environments.

Repository facts at the time of the request:

- `app.js` (repo root) is a plain browser script loaded by `index.html` via
  `<script src="app.js">`. It contains
  `const API_ENDPOINT = "https://api.example.com/login";`.
- `src/index.js` and `src/utils.js` are a separate CommonJS Node entry point
  (`greet`/`main`); neither references the API endpoint.
- `package.json` has no dependencies and no scripts.
- No bundler, no linter, no formatter, no test framework, no `.gitignore`.
- Local Node is v26.8.2.

Decisions the human partner made, each chosen from presented alternatives:

1. **Environment selection: runtime selection.** The settings module holds all
   environments and picks one on load (hostname detection plus a manual
   override). Rejected: single flat config edited per environment; build-time
   injection (would add a toolchain the repo does not have).
2. **Module format: browser global via a second `<script>` tag.** `settings.js`
   loads before `app.js` and exposes `window.AppSettings`. Rejected: ES modules
   (would break `file://` access to `index.html`); dual browser/CommonJS export
   as the primary consumption path.
3. **Environments: `dev` / `staging` / `prod`.** Prod keeps the existing
   `api.example.com` URL; dev and staging use placeholder hosts that the owner
   will correct.
4. **Override mechanism: `localStorage`.** Key `appEnv`. Rejected: URL query
   param; both-with-precedence; no override at all.
5. **Tooling: unit tests via Node's built-in `node:test` only.** Explicitly
   declined for this change: eslint/prettier, Playwright e2e. No dependencies
   may be added. This decision is why `settings.js` carries a guarded
   `module.exports` tail despite decision 2 — it is the testability affordance,
   not a change of module strategy.

Explicitly out of scope by agreement: `src/index.js`, `src/utils.js`,
`README.md`, and the existing form-handling logic in `app.js`.
