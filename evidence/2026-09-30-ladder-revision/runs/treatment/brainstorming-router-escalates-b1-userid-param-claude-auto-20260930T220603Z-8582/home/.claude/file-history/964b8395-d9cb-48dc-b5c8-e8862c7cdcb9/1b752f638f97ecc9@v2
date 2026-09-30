# Login Identity and Tracking — Design

Date: 2026-09-30
Status: awaiting review

## Problem

The request that started this: "Add a userId parameter to the login function so we can track who logged in."

The literal change is not implementable as stated. `login(username, password)` in `app.js` is called from exactly one place — the form submit handler in the same file — and that handler has only the two form fields to work with. There is no user id anywhere in the application to pass. Establishing identity is what logging in is *for*, so a user id cannot be an input to it.

Clarifying the intent produced a larger requirement than a parameter:

- The identifier must work across the whole app, not just this form; other forms will consume it.
- It must persist, so there is a record of who logged in.

Neither an identity layer nor any persistence exists in this codebase today. This document designs both.

## Current state

- `index.html` — a static page, no build step, one classic `<script src="app.js">` (not `type="module"`). A `<form id="login-form">` with `#username` and `#password` inputs.
- `app.js` — 28 lines. `login(username, password)` is synchronous, logs to the console, never contacts `API_ENDPOINT` (declared and unused), and unconditionally returns `{ success: true, user: username }`. `validateForm` checks for empty fields. The submit handler wires them together.
- No bundler, no module system in the browser code, no browser dependencies.
- No test runner, no linter, no formatter anywhere in the repo.
- `src/index.js` and `src/utils.js` are an unrelated Node hello-world and are not touched by this work.

## Decisions taken

Settled with the requester during brainstorming:

1. **A backend is planned but not built.** The client-side identity module is designed against the interface the future server will satisfy, with storage behind a swappable seam.
2. **Both a current identity and an event log persist.** Other forms read the identity; the log is a capped buffer that ships to the backend at cutover.
3. **The identifier minted now is an opaque device id, named as such.** A browser cannot know who a person is — anything minted client-side identifies a browser profile, not a user. `Identity` exposes `deviceId` (available now) and `userId` (null until the server issues one) so consumers code against the real shape from the start and nothing has to be renamed at cutover.
4. **Successful logins only are recorded**, as `{ username, at, deviceId }`. Failed attempts are not logged: a client-side failure log is near-worthless for spotting attacks (an attacker's browser simply never reports), and it captures mistyped usernames, which are sometimes passwords typed into the wrong box. Passwords are never stored under any circumstances.
5. **Approach A — a global IIFE module** — over ES modules, because `<script type="module">` is blocked by CORS on `file://` and would require a local dev server to open the page. Globals also match the existing idiom, where `login` and `validateForm` are already globals.

## Global Constraints

- **Unit test infrastructure is set up as part of this work**: Node's built-in runner (`node --test`), zero dependencies, consistent with a repo that currently declares none. Every later task inherits it.
- No linter or formatter is being configured; this was offered and declined. Do not add one as a side effect.
- No end-to-end test infrastructure.
- No new runtime dependencies, in the browser or in Node.
- The browser app must continue to open directly from the filesystem (`file://`). Any change requiring a dev server is out of bounds.
- Tracking must never break login. A storage failure degrades tracking; it never propagates to the caller.

## Architecture

One new browser file, `identity.js`, an IIFE assigning a single `Identity` global. `index.html` loads it before `app.js`. The storage seam lives inside `identity.js` rather than in a separate file, injected through `Identity.configure({ storage })`, avoiding a load-order dependency between two new scripts.

Files changed:

| File | Change |
|---|---|
| `identity.js` | New. The identity module and its storage adapter. |
| `app.js` | `login` becomes async and takes a third parameter; the submit handler awaits it. |
| `index.html` | One added `<script src="identity.js">`, before `app.js`. |
| `test/identity.test.js` | New. Unit tests for the module. |
| `test/login.test.js` | New. Unit tests for `login` with a fake identity. |
| `package.json` | Add `"scripts": { "test": "node --test" }`. |

`identity.js` ends with a guarded export so the Node test runner can import it without a bundler or a DOM:

```js
if (typeof module !== "undefined" && module.exports) { module.exports = Identity; }
```

`app.js` needs the same guard for its own tests to import `login`. In the browser both guards are inert.

## The `Identity` surface

```js
Identity.configure({ storage })          // defaults to a localStorage adapter
Identity.getDeviceId()                   // mints + persists a UUID on first call
Identity.getUserId()                     // null until the backend issues one
Identity.setUserId(id)                   // cutover: called from the login response
Identity.recordLogin({ username })       // appends a success entry, enforces the cap
Identity.getLoginRecords()               // read the buffer
Identity.drainLoginRecords()             // read + clear, for shipping to the backend
Identity.clear()                         // logout: drops userId and the log, keeps deviceId
Identity.forgetDevice()                  // privacy reset: drops everything, deviceId included
```

The split between `clear` and `forgetDevice` is deliberate. Logging out should not discard the device id — the id identifies the browser, not the session, and re-minting it on every logout would destroy the correlation it exists to provide. Dropping it is a distinct, rarer action, so it gets a distinct name.

`getUserId()` returns `null` today, and every consumer must handle null. This is deliberate: consumers written against the real shape need no changes when the backend starts populating it.

The `storage` object passed to `configure` is the seam. Its contract is three methods — `getItem(key)`, `setItem(key, value)`, `removeItem(key)` — matching the `Storage` interface so the browser default is `window.localStorage` itself, and tests inject a plain in-memory object.

## Data model

Storage keys are namespaced to avoid collisions with anything else on the origin:

- `app.identity.deviceId` — a UUID string
- `app.identity.userId` — a string; absent until the backend issues one
- `app.identity.loginLog` — a JSON array of entries

A log entry:

```json
{ "username": "alice", "at": "2026-09-30T14:03:11.482Z", "deviceId": "f81d4fae-..." }
```

`at` is ISO-8601 from `new Date().toISOString()`. The cap is **50 entries**; on overflow the oldest is dropped. The cap exists because `localStorage` is a small, shared, origin-wide budget and an uncapped append-only log will eventually exhaust it and start throwing for unrelated code.

The device id is minted **lazily, on first login** — never on page load. Someone who visits and never logs in is never assigned a persistent identifier. It uses `crypto.randomUUID()`, falling back to a UUIDv4 assembled from `crypto.getRandomValues`. If neither is available the module throws. There is deliberately no `Math.random` fallback: a predictable identifier is worse than an absent one, because it carries the appearance of uniqueness without the property.

## Data flow

1. User submits the form. The handler reads `#username` and `#password` and calls `validateForm` as it does today.
2. On valid input, the handler calls `await login(username, password, Identity)`.
3. `login` obtains `identity.getDeviceId()` and includes it in the payload it would POST to `API_ENDPOINT`. The POST remains stubbed; this work does not implement authentication.
4. On success, `login` calls `identity.recordLogin({ username })`.
5. `login` returns `{ success, user, deviceId, userId }`.

Recording happens inside `login`, not in the submit handler, so the other forms that will call `login` cannot forget to do it. The identity object is passed as a parameter rather than read from the global, which keeps `login` testable with a fake and makes its dependency visible in its signature.

`login` is given its async shape now even though the stub has nothing to await. The real backend will make it async, and doing it now means the call site is written once instead of twice.

## Error handling

- **Storage throws.** `localStorage` throws when disabled, in some private-browsing modes, and on quota exhaustion. Every access is wrapped. On first failure the module warns once and degrades to an in-memory store for the rest of the session. Tracking is lost; login is unaffected.
- **Corrupt log.** If `app.identity.loginLog` does not parse as an array, it is reset to `[]` rather than throwing. A malformed value must not wedge login.
- **No crypto.** Throws with an explicit message, per the data model above.
- **Rejected login.** The submit handler becomes `async` and catches, so a failure surfaces in the console rather than leaving an unhandled rejection and a form that appears to have done nothing.

## Security and privacy

Recorded here because these properties are easy to lose in later edits:

- `localStorage` is readable by any script on the origin. An XSS on this page reads every username in the log and the device id. Nothing secret goes in — **no passwords, no tokens, ever**.
- The device id is a persistent tracking identifier and carries the obligations that implies. It is minted lazily and cleared by `Identity.clear()`.
- The login log is **not an audit trail**. It lives on the client, where the user can edit or delete it freely. It is a staging buffer until the server owns the record. `identity.js` carries a header comment saying so, because a file named like this one is exactly what someone later mistakes for an audit log.

## Cutover to the backend

Three changes, and nothing else:

1. `login` calls `Identity.setUserId(...)` with the id from the real response.
2. `drainLoginRecords()` ships the buffered entries to the backend.
3. The storage adapter is swapped, or supplemented with server sync.

Assumption: the future backend will accept a client-supplied device id on the login request and return a stable user id; validate against the backend API design once it is specified. If it does not, the device id becomes a purely local correlation key and step 1 is the only part that changes — consumers already handle a null `userId`.

## Testing

`node --test`, with an injected in-memory storage object.

`test/identity.test.js`:

- `getDeviceId` mints a UUID on first call and returns the same value on subsequent calls
- the device id survives a fresh module instance reading the same storage
- no device id is written to storage until `getDeviceId` is called
- `getUserId` returns null before `setUserId`, and the set value after
- `recordLogin` appends an entry with `username`, `at`, and `deviceId`
- entries are capped at 50: after 51 records, length is 50 and the oldest is gone
- `drainLoginRecords` returns the entries and leaves the buffer empty
- a corrupt `loginLog` value is recovered as an empty array
- a storage whose `setItem` throws degrades to in-memory instead of propagating
- `clear` removes the user id and the log but leaves the device id intact
- `forgetDevice` removes all three keys, and the next `getDeviceId` mints a different id

`test/login.test.js`:

- `login` passes the device id through to its result
- `login` calls `recordLogin` once on success with the submitted username
- no recorded entry contains the password, under any field name

## Out of scope

- Real authentication and the actual POST to `API_ENDPOINT`
- Tokens, sessions, and session lifetime
- Logout UI
- Failure logging — reconsidered once the server can see attempts across all browsers
- Wiring the other forms; this design exists to make that cheap, but does not do it
- Linting and formatting; offered and declined
