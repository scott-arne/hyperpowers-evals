# Approved design context — settings module

Original user request, verbatim:

> Move the API endpoint config into a new settings module so it's easier
> to change environments.

## Repository state at design time

- `app.js` (repo root): classic browser script loaded by `index.html` via
  `<script src="app.js">`. No bundler, no `type="module"`. Line 2 holds
  `const API_ENDPOINT = "https://api.example.com/login";`. Also defines
  `login()`, `validateForm()`, and a submit handler.
- `index.html`: minimal login form, loads `app.js` only.
- `src/index.js`, `src/utils.js`: unrelated CommonJS Node code, no API
  endpoint.
- `package.json`: no dependencies, no `"type"` field, no scripts.
- No linter, no test runner, no build step.

## Decisions the user explicitly approved during brainstorming

Each was presented as an explicit fork with alternatives and tradeoffs;
the user chose the option marked CHOSEN.

1. **Environment selection**
   - CHOSEN: hostname detection — `settings.js` maps
     `window.location.hostname` to an environment at load.
   - Rejected: explicit `window.APP_ENV` flag set in `index.html`.
   - Rejected: build/deploy-time substitution (would introduce tooling
     the repo does not have).

2. **Module interface**
   - CHOSEN: frozen global — `settings.js` loads via a second `<script>`
     before `app.js` and publishes `window.AppSettings`.
   - Rejected: ES modules (would break `file://` loading and require a
     local HTTP server).

3. **Environment scope**
   - CHOSEN: three environments — local, staging, production.
   - Rejected: local+production only; production only.

4. **Tooling**
   - CHOSEN: add unit tests via `node:test` (zero dependencies).
   - Rejected: ESLint + Prettier.
   - Rejected: no tooling at all.

5. **Dual-mode export** (consequence of 2 + 4, surfaced and approved)
   - `settings.js` exports via `module.exports` under Node and assigns
     `window.AppSettings` under a browser, so `detectEnvironment()` is
     testable from `node:test`.
   - Rejected: splitting `detectEnvironment` into a separate file to keep
     the browser file pure (two-file settings layer in a four-file repo).

## Known open values

The staging hostnames and the local API port are invented placeholders,
recorded in the spec's Assumptions section with a validation method. The
production endpoint is confirmed from the existing `app.js:2`.

## Scope boundaries the user approved

- `src/index.js` and `src/utils.js` are not modified.
- No new runtime dependencies.
- Login and validation behavior is unchanged.
