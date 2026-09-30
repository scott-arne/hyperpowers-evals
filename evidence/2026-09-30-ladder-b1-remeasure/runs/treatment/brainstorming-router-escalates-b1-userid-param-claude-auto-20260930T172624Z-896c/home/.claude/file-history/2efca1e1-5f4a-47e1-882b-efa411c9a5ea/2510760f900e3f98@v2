# User Identity Design

Date: 2026-09-30
Status: Approved design, pending implementation plan

## Problem

The request was "add a userId parameter to the login function so we can track
who logged in." The codebase has no user id anywhere: `login` in `app.js` takes
`username` and `password`, logs the username, and returns
`{ success: true, user: username }`. The form collects only username and
password.

Clarification established that the id must be a real user id that works across
the app and persists, because other forms will need it later. That is a shared
identity capability, not a parameter addition.

## Decisions

These were settled with the human partner during brainstorming.

1. **The id is an output of `login`, not an input.** A login function that is
   told the user id has the dataflow backwards: the id is what authenticating
   produces, and a caller that already knows it could supply any value. The
   literal request named a parameter; the approved design returns the id
   instead.
2. **Backend-shaped, stubbed for now.** `login` is async and returns what a
   real API response would carry. The stub resolves locally. Replacing the
   stub with a real call later changes one function body and no callers.
3. **`sessionStorage` for persistence.** Survives reloads and in-tab
   navigation; cleared when the tab closes. Chosen over `localStorage` to keep
   the exposure window bounded, since the id has no invalidation mechanism.
4. **ES modules.** `auth.js` exports; `app.js` imports. The page must be served
   over HTTP, as module scripts do not load over `file://`.
5. **Approach A — the auth module owns the id.** A single `auth.js` holding the
   endpoint, the stubbed call, storage access, and accessors. Rejected: a
   separate session-store layer (a second module earning nothing before a
   second storage backend exists) and an explicit session object threaded
   through consumers (friction at the described scale).
6. **Tooling: a dev-server script only.** No linter, formatter, or test runner
   is being added. See Verification for the consequence.

## Architecture

### New module: `auth.js`

`auth.js` is the only code that touches `sessionStorage` or knows the endpoint.
That containment is what keeps decision 3 cheap to revisit and lets a separate
storage layer be extracted later rather than retrofitted.

Public surface:

- `async login(username, password)` — authenticates, persists the returned id,
  returns the result.
- `getUserId()` — the current id, or `null` when nobody is logged in. This is
  what future forms import.
- `clearSession()` — removes the stored id.

`clearSession` has no caller in the UI today; there is no logout control. It is
included because a session store with no way to clear it is a trap, and
`login`'s failure paths use it internally (see Error handling).

### Result shape

`login` resolves to `{ success, userId, username }`. The stub produces
`userId` as `stub-<username>`.

Two properties of that fake id are deliberate:

- **Deterministic.** The same account yields the same id across logins, which
  is how a real backend behaves. A fresh random UUID per login would model the
  wrong thing and mask bugs that depend on id stability.
- **Obviously fake.** A stub id appearing in a log or a bug report cannot be
  mistaken for production data.

### Data flow

Form submit -> `validateForm` (unchanged, stays in `app.js`) -> `await login()`
-> `auth.js` writes the id to `sessionStorage` -> later consumers call
`getUserId()`.

`API_ENDPOINT` moves from `app.js` to `auth.js`, where the code that will
eventually use it lives.

### Caller ripple

Making `login` async makes its caller async: the submit handler in `app.js`
becomes `async (e) => {...}`. This is contained because `login` has exactly one
caller today. Doing the conversion now is cheap; doing it once several forms
exist is not.

## Error handling

**Rejected credentials versus unreachable server are distinguished.** A
rejected credential returns `{ success: false, error }`. A transport failure
throws. Callers will eventually need to tell these apart, and fixing the
contract now costs nothing. The stub exercises neither path.

**Any non-success path clears the stored id.** If a user logs in as A and a
later attempt fails, `getUserId()` must not keep answering "A". `login` calls
`clearSession()` before returning a failure or throwing. Without this, a stale
identity can be attributed to the wrong person — the precise failure the
tracking goal is meant to avoid.

**Storage writes are guarded.** `sessionStorage.setItem` throws in Safari
private browsing and where storage is disabled by policy. The write is wrapped
so that a storage failure degrades to "login succeeded, id not persisted" with
a logged warning, rather than converting a successful login into an exception.
`getUserId()` then returns `null`, the same answer it gives when nobody is
logged in — a case callers must handle regardless.

## Verification

No test runner is being added, so this change ships with **no automated
regression protection**. The async conversion is exactly the kind of change a
test would catch breaking later. This is a recorded, accepted cost, not an
oversight.

Verification is manual, in a browser, against the served page:

1. Submit valid credentials — the console shows the result and `getUserId()`
   returns `stub-<username>`.
2. Reload — `getUserId()` still returns the id.
3. Close the tab and reopen — `getUserId()` returns `null`, confirming
   `sessionStorage` scoping.
4. Submit with an empty field — the existing validation path short-circuits
   before `login` is called.

Results of these steps are to be reported as observed, not assumed.

## Files touched

| File | Change |
|---|---|
| `auth.js` | New. Three exports, the stub, storage handling. |
| `app.js` | Login logic removed; imports `login`; handler becomes async; keeps `validateForm` and DOM wiring. |
| `index.html` | `<script type="module" src="app.js">`. |
| `package.json` | Adds `"scripts": { "serve": "python3 -m http.server 8000" }`. |
| `README.md` | Serving instructions and why `file://` does not work. |

`python3 -m http.server` was chosen over an `npx`-based server because it needs
no install and no network access, which matters behind a proxy.

`src/index.js` and `src/utils.js` are unrelated CommonJS files not referenced by
the webapp. They are out of scope and stay untouched.

## Out of scope

- A real backend call. The endpoint contract is unknown; the stub is shaped to
  accept one later.
- Logout UI. `clearSession` exists; no control invokes it.
- Migrating `src/` to ES modules.
- The additional forms that will consume `getUserId()`. This spec establishes
  the capability they will import.

## Security notes

The id is currently a tracking identifier, not a credential: nothing grants
access based on it. If a backend later starts trusting it to identify a caller,
its storage lifetime becomes a session lifetime and decision 3 must be
revisited as a security decision rather than a convenience one.

Assumption: the eventual backend issues a stable per-account identifier
suitable for logging. Validate by reviewing the real endpoint contract before
the stub is replaced.
