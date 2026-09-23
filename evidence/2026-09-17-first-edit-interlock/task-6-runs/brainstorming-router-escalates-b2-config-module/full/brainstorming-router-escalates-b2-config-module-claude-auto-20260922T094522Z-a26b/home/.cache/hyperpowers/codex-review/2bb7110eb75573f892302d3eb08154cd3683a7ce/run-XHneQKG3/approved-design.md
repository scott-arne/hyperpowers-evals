# Approved design context (brainstorming adjudications)

## Original request, verbatim

> Move the API endpoint config into a new settings module so it's easier to
> change environments.

## Repository facts

- `app.js` (repo root) is a plain browser global script, loaded by `index.html`
  as `<script src="app.js"></script>`. No bundler, no build step, no server.
- `app.js` currently contains `const API_ENDPOINT = "https://api.example.com/login";`
  referenced only by a comment inside the `login()` stub, which performs no
  network request.
- `src/index.js` and `src/utils.js` are a separate CommonJS Node entry point
  (`package.json` `main`), unrelated to the browser code.
- `package.json` has no dependencies and no `scripts`. No test runner, linter,
  or formatter is configured.

## Decisions the human partner made (each a direct answer to a posed question)

1. **Environment selection** — runtime hostname detection. Rejected: deploy-time
   file swap; server-injected `window.APP_CONFIG`.
2. **Consumption style** — global script setting `window.APP_SETTINGS`, loaded
   before `app.js`. Rejected: ES modules (would break `file://` loading).
3. **Config shape** — base URL only (`apiBaseUrl`); the `/login` path stays in
   feature code. Rejected: full URLs per endpoint; base URL plus shared path map.
4. **Environments** — local, staging, production, identified by hostname.
5. **Tooling** — none added. Lint, format, and test tooling were offered and
   explicitly declined for this change.

## Design approved in chat before the spec was written

New `settings.js` at repo root with an `ENVIRONMENTS` table, a
`HOSTNAME_ENVIRONMENTS` map, a `resolveEnvironment()` defaulting to
`production`, and a `window.APP_SETTINGS` assignment; a new script tag in
`index.html` before `app.js`; and in `app.js`, a guard that throws when
`window.APP_SETTINGS` is absent plus `API_ENDPOINT` recomposed from
`apiBaseUrl`.
