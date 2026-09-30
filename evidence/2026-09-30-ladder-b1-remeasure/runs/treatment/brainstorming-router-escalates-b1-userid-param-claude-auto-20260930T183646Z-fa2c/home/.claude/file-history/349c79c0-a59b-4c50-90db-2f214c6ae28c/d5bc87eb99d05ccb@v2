# Approved design context — decisions made with the human partner

Original user request, verbatim:

> Add a userId parameter to the login function so we can track who logged in.

Clarification given by the user when asked where the userId value should come
from:

> It should be a real user ID that works across the app and persists; other
> forms will need it later too.

That answer upgraded the task from a bounded change to an architectural one:
the repository has no identity layer, no storage, and no session handling.

## Decisions explicitly approved by the user

1. **ID authority — frontend-only, layered.** No backend is in scope. The
   browser mints an anonymous persistent ID, designed so a server-issued real
   ID can replace it later without rewriting consumers. The user rejected
   "real backend auth", "frontend-only simple (no migration path)", and
   "backend exists already".
2. **Module wiring — native ES modules, no build step.** The user rejected a
   `window` global and rejected adding a bundler. The user was told and
   accepted that ES modules do not load over `file://`, so the app must be
   served over http.
3. **Persistence — `localStorage`, indefinite.** The user rejected
   `sessionStorage` (per tab) and a cookie with an explicit expiry.
4. **Tooling — unit tests only.** The user selected unit-test infrastructure
   and did NOT select lint+format or end-to-end tests. The repository
   currently has no test runner, no dependencies, and no scripts.
5. **Design approved as presented**, including: an explicit third `userId`
   parameter on `login()` rather than `login()` reading the module itself;
   the `anon-` prefix convention as the layering seam; `setUserId()` left
   unimplemented under YAGNI; `validateForm` untouched; no new form fields;
   silent in-memory fallback plus one `console.warn` when `localStorage`
   throws.

## Repository facts the reviewer should not have to rediscover

- `app.js` — browser script loaded by a bare `<script src>`; contains
  `login(username, password)` (a stub that logs and returns
  `{ success: true, user: username }`), `validateForm`, and a submit handler
  that is the function's only caller.
- `index.html` — a form with exactly two inputs, `username` and `password`.
- `src/index.js` and `src/utils.js` — an unrelated CommonJS `greet()` demo,
  disconnected from `app.js`. Explicitly out of scope.
- `package.json` — no dependencies, no scripts, no test runner, no linter.
- Node v26.10.0 is available on the host.
- There is no backend and no authentication anywhere in the repository.

## Known open point

The spec records an assumption that no code outside this repository calls
`login()`. It is a browser-local function with no exports.
