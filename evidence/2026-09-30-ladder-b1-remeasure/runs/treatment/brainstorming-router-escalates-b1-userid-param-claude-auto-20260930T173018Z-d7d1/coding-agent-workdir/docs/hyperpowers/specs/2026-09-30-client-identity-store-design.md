# Client Identity Store — Design

Date: 2026-09-30
Status: Approved design, pending implementation plan

## Origin

The request was "add a userId parameter to the login function so we can track
who logged in." Clarifying questions established that the identifier must
persist and be readable by other forms across the app, that two distinct
identifiers are wanted (a correlation id for analytics and an auth identity for
anything that gates behavior), and that whether a real backend is coming is
undecided. That makes this a shared identity store rather than a parameter
change.

## Problem

`app.js` today defines `login(username, password)` as a stub that logs the
username and returns a hardcoded `{ success: true, user: username }`. Its only
call site is the form submit handler in the same file, which has access to
nothing but the two form field values. Nothing in the repository reads or writes
`localStorage`, `sessionStorage`, or cookies. There is no identifier of any kind
to pass, and no place to keep one.

What the app needs:

1. A place where the current user's identity lives that survives navigation
   between pages.
2. A way `login` writes it there.
3. A way other forms and pages read it.
4. A lifetime rule and a teardown path.
5. Two separate identifiers with different lifetimes and different levels of
   trust.
6. A seam so a future server can take over issuing the auth identity.

## Deliberate departure from the original request

**`login` does not gain a `userId` parameter.** The design returns the
identifier instead of accepting one.

The caller has no userId to supply. An identifier for "who logged in" is an
output of authenticating, not an input to it; a parameter would force the submit
handler to invent a value and hand it to the function that is better placed to
determine it. The stated goal — tracking who logged in — is met by the returned
identifier plus the store described below.

This departure was presented explicitly and approved. It is recorded here so a
later reader does not treat the missing parameter as an oversight.

## Architecture

### Component

A single new file, `identity.js`, loaded before `app.js` on every page via a
plain `<script src="identity.js">` tag. It is the only code in the application
permitted to touch browser storage. This matches the repository's existing
pattern: no build step, no bundler, classic scripts in global scope.

Public surface:

| Function | Behavior |
|---|---|
| `Identity.getCorrelationId()` | Returns the correlation id, creating and persisting one on first call. Never returns null: when storage is unavailable it returns an in-memory id valid for the page's lifetime. |
| `Identity.setAuth(userId)` | Writes the auth identity. |
| `Identity.getAuth()` | Returns the auth identity, or `null` when absent. |
| `Identity.clearAuth()` | Removes the auth identity only. The logout path. |
| `Identity.reset()` | Removes both identifiers. |

### Storage

| Identifier | Store | Key | Lifetime |
|---|---|---|---|
| Correlation id | `localStorage` | `app.cid.v1` | Survives browser restart and survives logout. |
| Auth identity | `sessionStorage` | `app.auth.v1` | Survives navigation within the tab; cleared on tab close or logout. |

Keys carry a `v1` suffix so a later format change cannot collide with values
already sitting in users' browsers.

The correlation id surviving logout is intentional, not an oversight: correlating
one person's activity across sessions is the reason it exists. The auth identity
must not survive logout.

Identifiers are generated with `crypto.randomUUID()`, falling back to a
`crypto.getRandomValues`-based generator where `randomUUID` is unavailable.
`Math.random` is not used.

### Data flow

1. A page loads. `identity.js` defines `Identity`. Nothing is written to storage
   until something asks for it.
2. The submit handler validates the form, then calls
   `login(username, password)`.
3. On success, `login` produces a `userId` and returns
   `{ success: true, user: username, userId }`.
4. The handler calls `Identity.setAuth(result.userId)`.
5. The handler calls `trackLoginEvent({ userId, correlationId, username })`,
   a new function defined in `app.js` alongside `login`. The correlation id
   comes from `Identity.getCorrelationId()`.
6. Other pages read the current identity with `Identity.getAuth()`.

### The backend seam

With no server, step 3's `userId` is generated client-side. It is named in the
code as a placeholder and sits at exactly the point where a server-issued
identifier will later arrive, so adopting a real backend means changing what
`login` assigns to `userId` and nothing else about the flow.

`trackLoginEvent` is a single function with a single call site. Its body is a
`console.log` today; replacing it with a network POST later does not touch
`login` or `identity.js`.

`API_ENDPOINT` in `app.js` is currently declared and unused. This work does not
change that.

## Error handling

Browser storage throws more often than is commonly assumed: Safari private
browsing, quota exhaustion, and storage disabled by enterprise policy all
surface as exceptions on read or write.

- Every storage access is wrapped. On failure, `Identity` degrades to an
  in-memory store for the lifetime of the page and emits one warning. It does
  not warn repeatedly.
- Reads return `null` on failure rather than throwing. A login form that breaks
  because storage is blocked is a worse outcome than one that loses correlation.
- A stored value that is absent, empty, or not a well-formed identifier is
  treated as absent and overwritten on next write.
- `getAuth()` returning `null` is a normal state meaning "not logged in", not an
  error. Consumers must handle it.

## Security constraints

These are binding on this work and on anything built on top of it.

- **Nothing may gate access, authorization, or visibility of sensitive data on
  `Identity.getAuth()`.** Until a server issues and validates the identifier, it
  is client-asserted and editable in devtools. It is for display and correlation
  only. This constraint is what prevents a placeholder from silently becoming a
  security control.
- No password, credential, or token is written to either store, ever.
- The correlation id is a persistent tracking identifier tied to a browser. If a
  privacy notice exists or is planned, it must cover it.

## Known gap

There is no logout UI in the application today, so `clearAuth()` ships with no
caller. An auth identity with no teardown path is a half-built feature. The
first page that introduces a logout affordance must call `clearAuth()`. This is
recorded as a gap rather than resolved here because building logout UI is
outside the approved scope.

## Global Constraints

Tooling to be established as part of this work, before `identity.js` is written:

- **Linting and auto-formatting.** ESLint plus Prettier, the standard pairing
  for this stack, as devDependencies. The repository currently has neither.
- **Unit test infrastructure.** A test runner with `identity.js` covered:
  lazy creation, the clear semantics of `clearAuth` versus `reset`, the
  storage-failure fallback path, and malformed-value handling.
- End-to-end test infrastructure is explicitly **not** set up. It is
  disproportionate at this size.
- Fuzz and mutation testing are not applicable here.

Testing approach: use Node's built-in `node:test` runner with a hand-written
storage stub, rather than adding a browser-environment test dependency. This
keeps the test toolchain dependency-free and matches `src/*.js`, which already
uses CommonJS. To make `identity.js` loadable under both the browser and the
test runner, it attaches `Identity` to `globalThis` and additionally exports it
through a guarded `typeof module !== 'undefined'` check.

Assumption: `node:test` with a storage stub gives adequate confidence for this
component, validate by writing the fallback-path test first and confirming it
fails against a deliberately broken stub before the implementation exists.

## Out of scope

- Logout UI.
- Any real network call, including activating `API_ENDPOINT`.
- Server-side identity issuance or validation.
- The additional forms and pages that motivated the store. This work provides
  what they will read; it does not build them.
- Converting `app.js` to ES modules.
- Any change to `src/index.js` or `src/utils.js`, which are a separate Node
  entry point unrelated to the browser page.

## Approaches considered and rejected

**ES modules.** `identity.js` as a real module with `app.js` converted to
`<script type="module">` would give a browser-enforced import graph and no
globals. Rejected for now: ES modules do not load over `file://`, so it would
require serving the directory over HTTP to develop, which is a workflow change
for a project with no dev server. It remains a cheap retrofit because the
storage decisions are centralized either way.

**Login event with a separate tracking subscriber.** `login` dispatching a
`CustomEvent('auth:login', ...)` consumed by a `tracking.js` subscriber would
decouple tracking's destination from login entirely. Rejected as premature: with
tracking currently a single `console.log` and one call site, `trackLoginEvent`
already isolates the destination at a fraction of the indirection. Worth
revisiting when more than one thing needs to react to login.

A Codex approach consultation was attempted for this design. The companion
resolved to a stub build (`0.0.0-stub`) and returned an empty payload, so no
independent approaches were folded in. The three approaches considered were
developed without external input.
