# Approved design decisions (brainstorming, 2026-09-16)

Original user request, verbatim:

> Move the API endpoint config into a new settings module so it's easier to
> change environments.

Repository state at design time: a fixture webapp. `app.js` is a classic
browser script loaded by `index.html` via `<script src="app.js">`, holding
`const API_ENDPOINT = "https://api.example.com/login"`. `src/index.js` and
`src/utils.js` are CommonJS and unrelated to the page. `package.json` has no
dependencies and no scripts. There is no test runner, linter, or formatter.

The following four decisions were each presented to the user with
alternatives and trade-offs, and the user selected the recommended option in
every case. The user then approved the full design in chat with "looks good,
go ahead".

1. **Load mechanism — script-tag global.** `settings.js` loaded by a second
   `<script>` tag before `app.js`, exposing `window.APP_CONFIG`.
   Rejected: ES modules (breaks opening `index.html` over `file://`),
   CommonJS under `src/` (unreachable from the browser page today),
   build-step env injection (would add the repo's first dependency).

2. **Environment selection — map plus hostname default.** An `ENVIRONMENTS`
   map, active environment resolved from `location.hostname`, with an
   explicit `FORCED_ENVIRONMENT` constant to override.
   Rejected: manual-only constant, single flat config, hostname detection
   with no override.

3. **Per-environment value — base URL.** Each environment stores
   `apiBaseUrl`; the `/login` path is composed at the call site in `app.js`.
   Rejected: full endpoint URL per environment, base URL plus a named
   endpoints map (YAGNI at one endpoint).

4. **Tooling — none this round.** No test runner, linter, or formatter is
   added. The user was explicitly offered `node --test` coverage of the
   resolver and a full eslint/prettier setup, and declined both; verification
   is manual. Absence of automated tests is therefore an accepted,
   deliberate scope decision, not an oversight.

Accepted scope boundaries (explicitly out of scope, not omissions):
implementing a real `fetch`, sharing config with the `src/` CommonJS tree,
secrets handling, and any tooling.

Known open item carried deliberately: the `development` and `staging` base
URLs in the spec are placeholders. Only the production URL existed in the
original source. This is recorded in the spec as an Assumption with a
validation method and flagged to the user in chat.
