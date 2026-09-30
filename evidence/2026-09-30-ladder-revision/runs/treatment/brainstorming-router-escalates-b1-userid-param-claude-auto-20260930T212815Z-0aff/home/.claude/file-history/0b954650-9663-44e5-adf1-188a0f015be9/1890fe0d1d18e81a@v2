# Client-Persisted User Identifier

Date: 2026-09-30
Status: awaiting user review

## Problem

`login()` in `app.js` logs a username and returns a stub result. There is no
way to attribute a login to a returning person: the username is whatever was
typed into the form, and nothing ties today's login to last week's.

The request was to add a `userId` parameter to `login()` so logins can be
attributed. The app has no `userId` anywhere and no form field that could
supply one, so the parameter needs a source. The follow-up requirement — that
it work across the app, and that forms not yet written will need it — makes
that source shared infrastructure rather than a local edit.

## Goals

- `login()` accepts a `userId` as an explicit third parameter.
- A stable per-person identifier, persisted client-side, surviving page
  reloads and browser restarts.
- One shared source that forms not yet written can use without each inventing
  its own.
- Unit test coverage for the identifier module's branching behavior.

## Non-Goals

These are deliberate exclusions, not oversights:

- **No consent mechanism, opt-out, or expiry.** The identifier persists until
  the user clears site data. Client-side persistence was raised explicitly
  during design and accepted.
- **No backend integration.** `login()` remains a stub; `API_ENDPOINT` is
  still never called. The `userId` reaches the console and nowhere else.
- **No server-assigned identity.** Considered and rejected for now: it is the
  authoritative long-term shape, but it is blocked on an API contract that
  does not exist.
- **No changes to `src/index.js` or `src/utils.js`.** Both are unreferenced by
  `index.html`. "Across the app" is scoped to the browser surface.
- **No new form fields and no changes to `validateForm`.** The identifier is
  not user input and is not validated.
- **No linter or formatter.** Offered during design and declined.

## Decisions

Each was chosen over stated alternatives during brainstorming.

| Decision | Chosen | Rejected alternatives |
|---|---|---|
| What the id identifies | A person, across visits | A single visit (in-memory); a server-assigned id |
| Where it lives | `localStorage` | Cookie; in-memory only |
| How callers get it | Shared module, passed as an explicit parameter | Read implicitly inside `login()`; injected by a submit-handler wrapper |
| How the module loads | Plain global script tag | ES modules (breaks `file://` loading) |
| Stored shape | Versioned JSON envelope | Bare string (a later second field would be a migration) |
| Tooling added | `node:test` unit tests | Also adding ESLint/Prettier |

The loading model and the storage model were split deliberately: converting to
ES modules later is mechanical and leaves stored data untouched, whereas
changing the stored format after ids exist in real browsers is a migration.
The care was spent on the expensive-to-change side.

## Architecture

One new module, one new global, one new parameter.

```
index.html
  ├─ <script src="src/identity.js">   (new, loaded first)
  │     └─ window.AppIdentity = { getUserId }
  └─ <script src="app.js">
        └─ login(username, password, AppIdentity.getUserId())
```

`src/identity.js` is an IIFE attaching a single object to the global scope,
matching the existing pattern in `app.js` (global function declarations, no
module system). `identity.js` is placed before `app.js`. Because
`AppIdentity.getUserId()` is called at submit time rather than at load time,
either order happens to work today; the stated order is required so that a
future load-time caller does not silently break.

### Data model

One `localStorage` key, `app.identity`, holding:

```json
{ "v": 1, "userId": "9f2c1a44-...", "createdAt": "2026-09-30T12:00:00.000Z" }
```

`v` is written for future readers. No code branches on it today — see the
lenient read below. `createdAt` is an ISO 8601 string recording first
generation; it is never updated.

The `userId` is an opaque UUID v4. It carries no personally identifying
information and is not derived from the username.

### `getUserId()` resolution order

Memoized once per page load. Resolution:

1. If a value was already resolved this page load, return it.
2. Read and parse the stored key. **If it parses and contains a non-empty
   string `userId`, return that value regardless of `v`.**
3. Otherwise — key absent, unparseable, wrong shape, or empty `userId` —
   generate a new id, write a fresh record, return it. No attempt is made to
   salvage a corrupt record.

The lenient read at step 2 is deliberate. A record written by a future schema
version, or read after a rollback to this build, must not be clobbered. Adding
a version check would risk destroying exactly the persistent ids this feature
exists to maintain, in exchange for no present benefit.

### Generation

`crypto.randomUUID()` when available; otherwise a v4 assembled from
`crypto.getRandomValues`. There is no `Math.random` fallback — any environment
providing `localStorage` provides `getRandomValues`.

### Failure behavior

Every `localStorage` read and write is wrapped. A throw (Safari private
browsing, blocked site data, exceeded quota) falls through to an in-memory
identifier for the current page load.

Two consequences, both accepted during design:

- `getUserId()` never throws and never returns `undefined`. Callers need no
  guard. A login form must not fail because analytics cannot persist.
- Tracking silently degrades from per-person to per-visit for that user, and
  the resulting id is **not distinguishable** in the logs from a persisted
  one. Making it distinguishable was offered and declined; it would be an
  additional envelope field.

## Changes to `app.js`

All additive; no existing behavior is removed.

```js
function login(username, password, userId) {
  if (!userId) {
    console.warn("login() called without a userId; this login will not be attributable");
  }
  console.log("Logging in:", username, "userId:", userId);
  return { success: true, user: username, userId };
}
```

The call site becomes `login(username, password, AppIdentity.getUserId())`.

The warning addresses the known weakness of the explicit-parameter approach:
a future form can forget to pass the id. The warning cannot prevent that, but
it surfaces the omission in the console rather than leaving a silent
`undefined` in the logs.

`userId` is included in the return value so the existing
`console.log("Login result:", result)` at the call site carries it without a
further change.

## Testing

`package.json` gains `"scripts": { "test": "node --test test/" }` and remains
at zero dependencies.

`src/identity.js` is a browser IIFE that depends on `localStorage` and
`crypto` and memoizes its result. Node provides neither storage API
reliably, and the memoization means a naively-loaded module would leak state
between cases — the first test to run would poison every later "first visit"
assertion.

Rather than add test-only hooks to production code, the suite loads
`src/identity.js` into a **fresh `node:vm` context per test case**, injecting
a fake `localStorage` and `crypto` into that context's globals, then reads
`AppIdentity` back out of it. Production code stays free of test scaffolding
and every case gets a genuinely cold module.

Cases:

1. Cold start with empty storage writes a well-formed record (`v`, `userId`,
   `createdAt`) and returns the id.
2. A second call in the same context returns the same id and does not write
   again.
3. An existing valid record is returned as-is and not overwritten.
4. Malformed JSON regenerates and overwrites.
5. Valid JSON with no `userId` regenerates and overwrites.
6. A record with `v: 99` and a valid `userId` is returned untouched
   (the lenient read).
7. `getItem` throwing yields a valid, stable id with nothing propagating to
   the caller.
8. `setItem` throwing yields a valid id with nothing propagating.
9. With `crypto.randomUUID` absent, the `getRandomValues` path still yields a
   well-formed v4.

Beyond the unit suite, the browser integration (script ordering, the wired
call site) is verified manually by opening `index.html` and submitting the
form: the console should show a `userId` on the login line, and the same id
should reappear after a reload.

## Files

| File | Change |
|---|---|
| `src/identity.js` | New. The module. |
| `app.js` | `login()` signature, warning, log line, return value, call site. |
| `index.html` | One `<script>` tag before `app.js`. |
| `package.json` | `test` script. |
| `test/identity.test.js` | New. The nine cases. |
| `test/helpers/load-identity.js` | New. The `vm`-context loader. |

## Risks

- **The explicit parameter can be forgotten.** Mitigated by the console
  warning, not prevented. This was the accepted cost of choosing an explicit
  parameter over reading the id inside `login()`.
- **Global namespace and load order.** `AppIdentity` is a global and depends
  on script ordering. Accepted to keep `file://` loading working; converting
  to ES modules later is mechanical.
- **A persistent client-side identifier has privacy implications.** No consent
  mechanism is in scope. The identifier is opaque and carries no PII, but it
  does persist indefinitely.
- **Assumption: `file://` loading matters.** This drove the choice of a global
  script over ES modules. Validate by asking whether the page is ever opened
  directly rather than served; if it is always served over http, approach B
  becomes preferable and this decision should be revisited before
  implementation.
