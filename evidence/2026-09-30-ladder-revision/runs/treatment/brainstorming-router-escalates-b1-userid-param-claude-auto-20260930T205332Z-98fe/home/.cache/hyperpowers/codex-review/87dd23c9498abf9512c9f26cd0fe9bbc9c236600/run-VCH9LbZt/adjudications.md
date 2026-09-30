# Approved design context — decisions adjudicated with the requester

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and answers

1. **Where should the userId come from?**
   "It should work across the app and persist; other forms will need it later."
   (This answer escalated the task from a bounded change to an architectural
   one: it names a shared persistent store the repo does not have.)

2. **When does the userId first come into existence?**
   Login creates it — the server issues it on successful login. Therefore it is
   login's output, not an input parameter. `login()`'s signature does not
   change.

3. **How long should the stored userId persist?**
   `sessionStorage`. `localStorage` was explicitly rejected: persisting an
   identifier on disk past the browser session is a product decision about
   staying logged in and would require a clear-on-logout path this app has no
   logout for.

4. **How should the store be shared with app.js and future forms?**
   Plain global script attaching `window.Session`. `index.html` must keep
   working when opened directly from `file://`, so no ES modules and no build
   step.

5. **What does "track who logged in" need to do right now?**
   Store and expose the userId only. No analytics emission, no backend
   telemetry.

6. **Which approach?**
   Approach A — `login()` writes the store itself. Rejected alternatives:
   caller-writes (persistence becomes caller discipline) and a
   `Session.login()` facade (premature; builds an auth surface for a second
   consumer that does not exist).

7. **Which tooling?**
   Unit tests via vitest + jsdom, and lint/format via biome. End-to-end
   (Playwright) and mutation testing explicitly declined as disproportionate.

## Approvals recorded

- Design sections 1 (Components) and 2 (Data flow) were presented in chat and
  approved by the requester ("looks good, go ahead").
- Sections 3 (Error handling) and 4 (Testing and tooling) were presented with
  the tooling selection above.

## Notes for the reviewer

- The Codex approach gate was attempted before approaches were proposed. The
  companion in this environment is a stub (`codexVersion: 0.0.0-stub`) and
  returned an empty result, so no independent Codex approaches were folded in.
- The repository is a minimal static webapp: `index.html`, `app.js`,
  `package.json` (no dependencies, no scripts), `README.md`, plus unrelated
  CommonJS Node code in `src/` that this change does not touch.
- `login()` is currently a stub that never calls `API_ENDPOINT` and has exactly
  one caller (the form submit handler in `app.js`).
