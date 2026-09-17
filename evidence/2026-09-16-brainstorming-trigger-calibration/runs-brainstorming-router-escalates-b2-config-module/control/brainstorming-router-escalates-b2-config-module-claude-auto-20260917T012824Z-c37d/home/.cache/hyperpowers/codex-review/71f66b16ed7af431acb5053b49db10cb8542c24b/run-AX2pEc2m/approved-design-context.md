# Approved design context

## Original request (verbatim)

> Move the API endpoint config into a new settings module so it's easier to change environments.

## Repository facts

- Working directory is a minimal JS fixture repo: `app.js`, `index.html`,
  `package.json`, `README.md`, `src/index.js`, `src/utils.js`.
- `index.html` loads `app.js` with a plain `<script src="app.js">` tag. No
  bundler, no module system, no build step.
- `app.js:2` is `const API_ENDPOINT = "https://api.example.com/login";`. It is
  referenced only by the `login()` stub at `app.js:4-8`, which performs no real
  request.
- `src/index.js` and `src/utils.js` are a separate CommonJS Node demo
  (`greet()`), unrelated to the endpoint.
- `package.json` has no dependencies and no scripts. No test runner, no linter.

## Decisions made with the user, and what was rejected

Each of these was presented as an explicit choice with tradeoffs and chosen by
the user. They are settled premises, not open questions.

1. **Environment selection: hostname detection with a `?env=` override.**
   Rejected: a single manually edited value (too manual); build-time injection
   (would require adding a bundler or substitution script to a repo with
   neither).
2. **Packaging: browser-only global script.** `settings.js` loaded before
   `app.js`, publishing `window.SETTINGS`. Rejected: ES modules (would make
   `app.js` a module and require a local server); dual-format sharing with the
   CommonJS `src/` tree (speculative — no consumer exists).
3. **Environments covered: `local`, `staging`, `production`.** Rejected:
   local+production only; a four-tier local/dev/staging/production split.
4. **Tooling: unit tests via `node:test` only.** Zero dependencies. The user
   declined ESLint/Prettier. The user accepted that testing requires a small
   `module.exports` guard in `settings.js`.

## Design details approved in chat before the spec was written

- Per-environment value is a **base URL**, with the login endpoint derived as
  `apiBaseUrl + "/login"`, rather than a full endpoint URL per row.
- Unrecognized hostname falls back to `production` rather than throwing.
- Unrecognized `?env=` value is ignored with a `console.warn`, and hostname
  detection proceeds.
- A missing `settings.js` is intentionally left unguarded: `app.js` throws.
- `local` and `staging` base URLs are placeholders; real values were not
  available. The `production` base URL must preserve the host currently in
  `app.js:2`.

## Out of scope (agreed)

- `src/index.js`, `src/utils.js`.
- Making `login()` perform a real request.
- Linting/formatting tooling.
- Build-time configuration injection.
