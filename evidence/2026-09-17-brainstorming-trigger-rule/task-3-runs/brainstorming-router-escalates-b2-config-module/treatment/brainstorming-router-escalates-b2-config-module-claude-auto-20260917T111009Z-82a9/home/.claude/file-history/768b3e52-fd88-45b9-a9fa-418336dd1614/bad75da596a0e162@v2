# Approved design decisions (brainstorming)

Original request, verbatim:

> Move the API endpoint config into a new settings module so it's easier to
> change environments.

Decisions the human partner made explicitly during brainstorming. These are
settled; do not re-open them as findings unless they are internally
contradictory or unbuildable as specified.

1. **Environment selection: runtime detection from `location.hostname`.**
   Chosen over hand-editing a constant and over build-time injection. Rejected
   build-time injection specifically because it would introduce a bundler and a
   dependency tree to a project that currently has none and is opened as a
   static file.

2. **Module delivery: plain script exposing a global**, loaded by its own
   `<script>` tag before `app.js`. Chosen over ES modules because `type="module"`
   is blocked over `file://` by CORS, and preserving the double-click-to-open
   workflow was judged worth more than removing one global.

3. **Environments: `development` and `production` only.** `development` =
   `http://localhost:3000` (port is an assumption flagged in the spec),
   `production` = `https://api.example.com` (the host from the current
   hard-coded constant).

4. **Tooling: none added.** The human partner explicitly declined unit tests
   (`node:test`) and lint/format tooling for this change, choosing manual
   browser verification. The project today has no test runner, no lint config,
   no build step, and no dependencies. Absence of automated tests is therefore a
   recorded decision, not an oversight.

5. **Scope: the webapp only.** `src/index.js` and `src/utils.js` are a
   disconnected CommonJS Node tree with no endpoint configuration and are out of
   scope.
