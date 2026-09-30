# Approved design context — login session tracking

## Original user request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Codebase facts

- `app.js` (repo root): `login(username, password)` at line 4 is a stub that
  logs and returns `{ success: true, user: username }`; `validateForm` at line
  10; a submit handler at line 17 that calls `validateForm` then `login` and
  logs the result. `API_ENDPOINT` is declared at line 2 and never used.
- `index.html`: loads `app.js` at line 13 via a classic `<script src>` tag. No
  other scripts. Inputs `#username`, `#password`, form `#login-form`.
- `src/index.js` and `src/utils.js` are Node CommonJS and unrelated to the
  browser app.
- `package.json`: name `drill-test-project`, no `scripts`, no
  `devDependencies`, no test runner, no linter, no formatter.
- No test directory, no CI configuration.
- Single caller of `login()` in the repo (`app.js:23`); no exports.

## Clarifying questions and the user's answers

1. **Where should the userId come from?** — "Return it from login": `login()`
   returns `{ success, user, userId }` and the caller consumes it. (Rejected:
   a caller-supplied per-attempt tracking id; a literal `userId` parameter.)
2. **What does "track" mean — where does the userId go?** — "Persist it
   (storage/session)". (Rejected: console.log only; analytics/telemetry.)
3. **Who reads it later, and how long should it survive?** — "This tab only,
   display/logging": `sessionStorage`, non-authoritative. (Rejected:
   `localStorage` across restarts; a cookie visible to the server; in-memory
   only.)
4. **What should the userId value be, given login() is a stub?** — "Stub
   derives it, marked TODO", with the real API response replacing it later.
   (Rejected: random uuid per login; the username verbatim.)
5. **Which approach?** — "A: separate session.js", a new classic browser
   script owning the storage key and shape. (Rejected: inline helpers in
   app.js; converting the browser side to ES modules.)
6. **Tooling?** — "Unit tests only": a `node:test` runner and tests for
   session.js. (Rejected: adding eslint/prettier; no tooling at all.)

The user approved the design summarized by these answers before the spec was
written. These are settled decisions, not open questions.
