# Login User Identity — Design

Date: 2026-09-30
Status: Approved for planning

## Problem

`login(username, password)` in `app.js` logs a username and returns a synchronous
stub result. Nothing in the application records *who* logged in in a way that
survives a page reload or is reachable from anywhere other than the submit handler
that called `login`.

The request was to add a `userId` parameter. The requirement behind it is larger:
the identity must name the actual person, persist across page loads, and be
available to forms that do not exist yet. A parameter alone cannot satisfy that —
there is no identity source, no storage, and no shared module in the application
today. This design introduces the smallest identity layer that meets the stated
requirement.

## Scope

In scope:

- An `AppSession` accessor that owns reading and writing the persisted user id.
- `login` accepting an optional trailing `userId` and becoming asynchronous.
- A stubbed server-issued identity response, shaped so the real endpoint can be
  swapped in without changing callers.
- Unit-test infrastructure and tests for the session accessor.

Out of scope:

- Real authentication. `login` remains a stub; no request is sent to
  `API_ENDPOINT`.
- Authorization of any kind. See "Security boundary".
- Additional forms. The design provides the accessor they will use; it does not
  build them.
- Changes to `src/index.js` or `src/utils.js`, which are an unrelated Node program
  never loaded by the browser.

## Decisions

Each of these was chosen explicitly during brainstorming; the rejected option is
recorded so a later reader does not re-litigate it.

| Decision | Chosen | Rejected alternative |
|---|---|---|
| Identity source | Server-issued, stubbed until a real endpoint exists | Client-minted id (identifies a browser, not a person) |
| Persistence | `sessionStorage` | `localStorage` (outlives the person's use of a shared machine); in-memory (lost on reload) |
| Sharing mechanism | Global accessor `window.AppSession` | ES modules (blocked over `file://`, needs a dev server); bare storage-key convention (makes storage the public interface) |
| Parameter shape | Optional, trailing, defaults to `null` | Required (would break the existing call site) |
| Test tooling | Node's built-in `node:test` | A third-party runner (the project has no dependencies today) |

## Architecture

### Components

**`session.js`** (new). The only code in the application permitted to touch
`sessionStorage`. Loaded by a classic `<script>` tag and assigns a single global:

```js
window.AppSession = { getUserId, setUserId, clearSession };
```

- `getUserId()` → `string | null`. Returns the stored id, or `null` when absent or
  unreadable.
- `setUserId(id)` → `void`. Stores a non-empty string id. A `null`, `undefined`, or
  empty value is rejected without clearing existing state.
- `clearSession()` → `void`. Removes the stored id.

**`index.html`**. Gains `<script src="session.js"></script>` immediately before the
existing `app.js` tag. Load order is a correctness requirement — `app.js` reads
`window.AppSession` at submit time — and carries a comment saying so.

**`app.js`**. `login` gains the parameter and becomes `async`; the submit handler
becomes `async` and awaits it.

### Storage contract

- Key: `app.userId`
- Value: a non-empty string
- Store: `sessionStorage` — survives reload, cleared when the tab closes

The key is an implementation detail of `session.js`. Consumers go through the
accessor so the storage mechanism can change without finding every reader.

### The login signature

```js
async function login(username, password, userId = null)
```

The parameter is an **input hint**; the server response is **authoritative**.

- On a first login in a tab, `userId` is `null` and the server issues an id.
- On a re-login within the same tab, the caller passes the id currently in
  `sessionStorage` so the server can correlate the two sessions.
- If the response carries an id that differs from the one passed in, the response
  wins and the stored value is overwritten, with a `console.warn`. A mismatch
  normally means a stale session.

Resolved shape:

```js
{ success: true, user: username, userId: "<server-issued id>" }
```

The stub resolves this through a `Promise` rather than returning synchronously, so
the asynchronous shape is real from the first commit and swapping in the real
`fetch` against `API_ENDPOINT` is a change confined to the body of `login`.

### Data flow

1. Submit handler calls `validateForm` (unchanged).
2. Handler reads any known id: `const knownId = window.AppSession.getUserId()`.
3. Handler awaits `login(username, password, knownId)`.
4. On success, handler calls `window.AppSession.setUserId(result.userId)`.
5. Future forms read the id with `window.AppSession.getUserId()`.

## Security boundary

**The stored user id records who logged in. It must never decide what someone is
permitted to do.**

The value lives in `sessionStorage`, which is readable and writable by any script
running on the page, including injected script. It is a tracking and correlation
aid, not a credential. Authorization decisions belong on the server, against a real
session that the client cannot forge.

This is recorded explicitly because a stored user id is exactly the kind of value
that later gets read as "the current user is allowed to…". A future change that
gates behavior on `AppSession.getUserId()` is a defect against this design.

The `sessionStorage` choice also bounds exposure in time: the identity does not
outlive the tab, so a shared machine does not hand the next person a live identity.

## Error handling

- **Storage unavailable.** Safari private mode throws on `sessionStorage` access.
  Every storage call in `session.js` is wrapped; on failure the accessor falls back
  to a module-level in-memory value for the lifetime of the page and logs once.
  Login must keep working when storage does not.
- **Login rejects** (network failure, once the real endpoint exists). The handler
  catches, logs the error, and leaves the existing stored id untouched. A failed
  login must not clear a good session.
- **Success response missing `userId`.** Treated as a server error: logged, and the
  stored value is not overwritten.
- **Invalid id passed to `setUserId`.** Rejected without clearing existing state, so
  a bad write cannot silently destroy a good id.

## Testing

Unit-test infrastructure is set up as part of this work, using Node's built-in
`node:test` runner. This keeps the project dependency-free, which matches a
`package.json` that currently declares no dependencies and no scripts.

- Add a `test` script to `package.json` invoking `node --test`.
- Tests live in `test/`, mirroring the source file name (`test/session.test.js`).
- `session.js` is written so it can be loaded under Node with a fake
  `globalThis.sessionStorage`, which is what makes it testable without a browser or
  a DOM library.

First tests, covering the behavior this design actually rests on:

1. `getUserId()` returns `null` when nothing is stored.
2. `setUserId(id)` then `getUserId()` round-trips the value.
3. `clearSession()` removes a stored id.
4. `setUserId(null)` / `setUserId("")` leaves an existing id intact.
5. A `sessionStorage` that throws on access degrades to in-memory rather than
   propagating the error.

End-to-end tests of the submit flow are deliberately not set up; the application is
one form and the flow is thin.

## Assumptions

- Assumption: the eventual real endpoint returns the user id in the login response
  body. Validate via the API contract when the backend exists; if the id arrives in
  a header or a cookie instead, only the body of `login` changes.
- Assumption: the application continues to be opened directly from the filesystem
  at least some of the time. Validate by asking how the app is run; if it is always
  served, the ES-module approach rejected above becomes preferable and the accessor
  names carry over unchanged.
