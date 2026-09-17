# Approved design decisions (from brainstorming dialogue)

Original user request, verbatim:
"Move the API endpoint config into a new settings module so it's easier to change environments."

Classification: architectural (request names a new module the repo does not have).

Each decision below was presented to the user with alternatives and explicitly chosen by them:

1. Environment source = hostname detection (window.location.hostname).
   Alternatives offered and rejected: deploy-time file swap; build-time
   injection; runtime injected global.
2. Module format = plain global script (<script src="settings.js"> before app.js).
   Alternative offered and rejected: ES modules (rejected because type="module"
   breaks file:// dev).
3. Scope = browser only. src/ (CommonJS Node half) stays untouched.
   Alternative offered and rejected: shared across both halves.
4. Unknown-hostname behavior = console.warn + fall back to local.
   Alternatives offered and rejected: throw; fall back to production; warn + null.
5. Config shape = apiBaseUrl per environment, /login path owned by app.js.
   Alternative offered and rejected: full apiEndpoint URL per environment.
6. Tooling = node:test + node:vm test for hostname resolution. User declined
   adding a linter/formatter as broader than this task.

User approved the design presentation and asked for the spec to be written.

Repository facts the reviewer should know:
- app.js is a plain browser script; index.html loads it with a bare <script> tag.
- src/index.js and src/utils.js use CommonJS and are never loaded by the browser.
- package.json has no dependencies, no scripts, no test runner.
- The only configuration in the repo is app.js line 2:
  const API_ENDPOINT = "https://api.example.com/login";
- login() is a stub; it does not perform a network request today and must not
  start doing so as part of this change.
