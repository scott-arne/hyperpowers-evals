# Login userId and shared session store — design

Date: 2026-09-30
Status: awaiting review

## Problem

The request was "add a `userId` parameter to the `login` function so we can
track who logged in", refined in discussion to: the id must persist and be
readable by other forms that do not exist yet.

`login` cannot take a `userId` as an input parameter. It is the function that
establishes who the user is; before it runs, the only identity available is the
username typed into the form (`index.html:9`). The single caller
(`app.js:23`) has no id to pass. The request is therefore satisfied by
`login` *producing* a `userId` and persisting it somewhere other forms can
read, not by widening its signature.

## Goals

- `login` yields a `userId` identifying the person who logged in.
- The id survives page navigation within the tab so other forms can read it.
- Exactly one place owns the storage key and the value's shape.
- The interface does not need reworking when the stub becomes a real API call.

## Non-goals

- Authentication or authorization. The stub at `app.js:6` stays a stub.
- Sign-out UI. `Session.clear()` exists so one can be added later.
- Cross-tab or cross-restart persistence.
- Any change to `src/index.js` or `src/utils.js`. That is separate CommonJS
  Node code with no relationship to the browser app.

## Decisions

Each was put to the user during brainstorming; the rationale is recorded so a
later reader does not re-litigate it.

| Decision | Chosen | Why |
|---|---|---|
| Where the id comes from | `login` returns it | The caller has no id to pass; login is what establishes identity. |
| Persistence | `sessionStorage` | Other forms are likely separate pages, which rules out an in-memory singleton. Lifetime matches a login session and expires with the tab, so no expiry mechanism is needed. |
| Sharing mechanism | Global namespace module | Matches the existing global-script style of `app.js`, needs no build step, and keeps `index.html` openable from disk. ES modules were rejected because module scripts are blocked over `file://` and would require a dev server for a repo with no tooling. |
| What the id identifies | The person, server-owned | "Track who logged in" is a question about the person. A client-generated UUID would identify the login attempt instead, and would not match anything in a backend. |
| Who writes to storage | `login` itself | Guarantees no future caller forgets to persist. Costs `login` its purity; accepted because caller-side persistence is the exact drift the requirement guards against. |
| Tooling | ESLint + Prettier, unit tests | Cheapest before there is code to retrofit. E2E deferred — Playwright's browser binaries are disproportionate for one page. |

## Architecture

Three browser files with one responsibility each, loaded in order.

### `session.js` (new) — storage owner

Owns the storage key and the value's shape. The only file in the app that
mentions `sessionStorage`.

```js
// Single source of truth for the signed-in user's id.
const STORAGE_KEY = "app.userId";

globalThis.Session = {
  setUserId(userId) { /* sessionStorage.setItem, guarded */ },
  getUserId() { /* sessionStorage.getItem, guarded; null when absent */ },
  clear() { /* sessionStorage.removeItem, guarded */ },
};
```

Attachment is to `globalThis`, not `window`. In a browser the two are the same
object, and `globalThis` additionally lets the unit tests load this file under
Node without a DOM environment. This is a refinement of the `window.Session`
shape shown during brainstorming; the interface is unchanged.

### `auth.js` (new) — `login` and `validateForm`, moved out of `app.js`

`login` keeps its `(username, password)` signature and gains `userId` in its
return value:

```js
function login(username, password) {
  // Stub: would POST to API_ENDPOINT; the real response supplies userId.
  const result = { success: true, user: username, userId: `stub-${username}` };
  if (result.success) Session.setUserId(result.userId);
  else Session.clear();
  return result;
}
```

The split exists because `app.js` calls `document.getElementById` at the top
level (`app.js:17`), so loading it under Node throws and `login` cannot be
tested. Moving the two pure functions out is smaller and more durable than
adding jsdom, and it gives each file one job. This is a targeted improvement in
service of the work, not general refactoring.

### `app.js` (modified) — DOM wiring only

Retains the submit listener and `API_ENDPOINT`. After the split it contains no
logic worth unit-testing.

### `index.html` (modified)

```html
<script src="session.js"></script>
<script src="auth.js"></script>
<script src="app.js"></script>
```

Load order matters: `session.js` must precede `auth.js`. A comment in
`index.html` records this, because the ordering dependency is implicit and is
the main cost of the global-namespace approach.

## Data flow

1. User submits the form; `app.js` reads username and password.
2. `validateForm` rejects missing fields (unchanged behavior).
3. `login(username, password)` runs; the stub response carries `userId`.
4. `login` persists it via `Session.setUserId`.
5. Any later page or form reads `Session.getUserId()`.

## Error handling

Every failure degrades rather than breaking login. Tracking who logged in is
not worth failing an authentication over.

| Condition | Behavior |
|---|---|
| `sessionStorage` throws (`QuotaExceededError`, or `SecurityError` when storage is disabled by policy or blocked in a private window) | All three `Session` methods catch, warn to console, and continue. `setUserId` swallows the failure; `getUserId` returns `null`. |
| No id stored | `getUserId()` returns `null`. `null` is the single "nobody is signed in" signal; there is no empty-string state to also handle. |
| `Session` undefined at call time — `auth.js` loaded without `session.js`, or in the wrong order | `login` guards with `typeof Session === "undefined"`, warns, and completes the login without persisting. Converts a broken login into a missing tracking record. |
| Login fails | `Session.clear()`. Dead code while the stub always succeeds, but without it a real failure would silently retain the previous user's id. |

## Security

- `sessionStorage` is readable by every script on the page. The stored value is
  the opaque `userId` and nothing else: never the password, never a token.
- The stub value `stub-${username}` deliberately encodes the username. That is
  acceptable for a development placeholder. The real server-supplied id should
  be opaque.
- **A client-stored `userId` is a tracking convenience, not proof of identity.**
  When the stub in `auth.js` becomes a real call to `API_ENDPOINT`, the server
  must establish identity itself from a session cookie or token, and must never
  trust a `userId` sent by the client. This is the assumption most likely to
  cause a real vulnerability if a later reader treats `Session.getUserId()` as
  authorization.
- No expiry mechanism is needed: the value dies with the tab. That was part of
  why `sessionStorage` was chosen over `localStorage`.

## Testing

Runner: `node --test` (built in, no dependency). Because `session.js` and
`auth.js` avoid DOM APIs, the tests need only a ~10-line `sessionStorage` stub
on `globalThis`; jsdom is not required.

Cases:

- `Session` set/get/clear round-trip.
- `getUserId()` returns `null` when nothing is stored.
- `login` returns a `userId`.
- `login` persists the id on success.
- `Session.clear()` removes a stored id.
- `Session` methods degrade to a warning when the storage stub throws.
- `login` completes without persisting when `Session` is undefined.
- `validateForm` rejects missing fields (existing behavior, now covered).

The clear-on-failure branch of `login` is deliberately **not** unit-tested while
the stub response is hardcoded to succeed. Reaching it would require an
injection seam that exists only for the test, which is scaffolding for a branch
that cannot fire in production yet. `Session.clear()` is covered directly; the
wiring gets its own test when the real API call replaces the stub.

## Global constraints

Inherited by every task in the implementation plan.

- ESLint + Prettier, standard config, browser globals declared; `lint` and
  `format` scripts in `package.json`.
- Unit tests via `node --test`; `test` script in `package.json`. New behavior
  ships with tests.
- No runtime dependencies. Linting, formatting, and the test runner are the
  only additions, and only the first two add `node_modules`.
- No build step. `index.html` must stay openable directly from disk.

## Assumptions

- Assumption: the forms that will later read the id are same-origin pages
  opened in the same tab; validate by confirming this when the first such form
  is added. If any of them is a separate tab or a different origin,
  `sessionStorage` will not carry the value and the persistence decision must
  be revisited.
- Assumption: the eventual login API returns a stable per-person id in its
  response body; validate against the API contract when `API_ENDPOINT` is
  implemented. If it returns only a token, the id must be derived server-side
  and exposed on a separate endpoint.

## Out of scope

Sign-out, cross-tab sync, token handling, real authentication, and any change
to the Node code under `src/`.
