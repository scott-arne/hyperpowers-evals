# Persistent User ID — Design

Date: 2026-09-30
Status: Approved design, pending implementation plan

## Problem

`login()` in `app.js` takes `username` and `password` and logs the username.
There is no way to attribute a login to a stable identity, and no identity
value exists anywhere in the app: the form collects only username and
password, and the `login()` stub returns nothing that identifies a user.

The requirement is a real user ID that works across the app, persists, and is
available to forms that do not exist yet. That is an identity layer, not a
parameter — there is currently no module, no storage, and no session handling
for such a value to live in.

## Scope

In scope:

- A shared identity module that mints, persists, and exposes a user ID.
- A third `userId` parameter on `login()`, supplied by its caller.
- Unit-test infrastructure, and tests for the identity module.

Out of scope:

- Server-side authentication. `login()` remains a stub; see Layering.
- Any change to `src/index.js` or `src/utils.js`. They are an unrelated
  CommonJS demo and stay as they are.
- A logout flow. `clearUserId()` exists for a future one to call, but no UI
  invokes it in this change.
- New form fields. `userId` is not user input.

## Decisions

Each of these was chosen explicitly during brainstorming.

| Decision | Choice | Why |
|---|---|---|
| ID authority | Browser-minted, layered for a future server ID | No backend is in scope, but the design must not need a rewrite when one arrives. |
| Module wiring | Native ES modules, no build step | Makes per-form imports pleasant with zero dependencies. A bundler is not justified by one module. |
| Persistence | `localStorage`, indefinite | Matches "persists"; survives restarts and is shared across tabs. |
| Interface | Explicit `userId` parameter on `login()` | Keeps `login()` a pure function of its inputs, testable without browser storage. |
| Tooling | Unit tests only | The mint-once and storage-failure paths are the real logic. Lint and e2e were declined. |

## Architecture

### New module: `identity.js`

The only code in the app that knows where the ID is stored.

```js
export function getUserId()    // current ID; mints and persists on first call
export function clearUserId()  // remove the stored ID
```

- Storage key: `webapp.userId`.
- Value: `crypto.randomUUID()` prefixed with `anon-`, e.g.
  `anon-9f1c...`.
- `getUserId()` is idempotent: the second call in a page returns the same
  value as the first, and a reload returns the value from storage rather than
  minting a new one.

The `anon-` prefix is a load-bearing convention, not decoration. It makes a
browser-minted ID visibly distinguishable from a server-issued one so that no
consumer, log, or future backend mistakes an unauthenticated identifier for an
authenticated one.

### Layering

The indirection through `getUserId()` is what makes the anonymous ID
replaceable. When server-side authentication is added:

1. A `setUserId(id)` is added to `identity.js`, writing the server-issued ID
   over the stored anonymous one.
2. The authenticated login response calls it.
3. Every consumer continues to call `getUserId()` and does not change.

`setUserId()` is deliberately **not** implemented now. Nothing can call it
until a backend exists, and the seam that makes it cheap to add is the module
boundary, which this design already establishes.

### Changes to `app.js`

```js
function login(username, password, userId) {
  console.log("Logging in:", username, "userId:", userId);
  return { success: true, user: username, userId };
}
```

- The submit handler supplies the value:
  `login(username, password, getUserId())`.
- `app.js` gains `import { getUserId } from "./identity.js";`.
- `validateForm` is unchanged. `userId` is not user input and is not form data
  to validate.

### Changes to `index.html`

- `<script src="app.js">` becomes `<script src="app.js" type="module">`.
- No new form fields.

## Breaking changes

`login()` gains a required third parameter. The single in-repo caller
(`app.js`, submit handler) is updated in the same change, so nothing in this
repository breaks.

Assumption: no code outside this repository calls `login()`. Validate by
confirming with the requester before implementation; the function is a
browser-local stub with no exports, so external callers are unlikely.

## Operational change

ES modules do not load over the `file://` protocol. Opening the app becomes:

```
python3 -m http.server
```

then browsing to the served `index.html`, rather than double-clicking the
file. This is a direct consequence of the module-wiring decision and is
accepted.

## Error handling

`localStorage` access throws in Safari private browsing, when storage is
disabled by policy, and on quota exhaustion.

`getUserId()` catches these, falls back to an in-memory ID that lives for the
page's lifetime, and emits a single `console.warn`. Login continues to work;
only persistence degrades. The fallback ID uses the same `anon-` prefix, so
consumers cannot tell the difference and do not need to.

`clearUserId()` is likewise non-throwing: if storage is unavailable it clears
the in-memory value and returns.

## Testing

The repository currently has no test runner, no dependencies, and no scripts.

Runner: Node's built-in `node:test` with `node:assert`, run via
`npm test` → `node --test`. This adds zero dependencies, which keeps the
repository's existing zero-dependency posture, and it supports ES modules
natively.

`identity.js` reads `globalThis.localStorage`, so tests install a fake storage
object on `globalThis` rather than requiring a DOM. Cases to cover:

1. First call mints an ID, and it is prefixed `anon-`.
2. Second call returns the same ID without minting a new one.
3. With storage pre-populated before the first `getUserId()` call, the stored
   ID is returned rather than a newly minted one.
4. `clearUserId()` removes the value; the next `getUserId()` mints a new,
   different one.
5. When storage throws on read, `getUserId()` returns a usable ID and does not
   propagate the error.
6. When storage throws on write, `getUserId()` returns a usable ID and is
   still idempotent within the page.

`login()` is a stub with no logic worth testing beyond passing `userId`
through to its return value; one test covers that.

`app.js` wiring and `index.html` are not unit-tested. End-to-end testing was
declined for this change.

## Files touched

| File | Change |
|---|---|
| `identity.js` | New. The identity module. |
| `app.js` | `login()` signature, call site, import. |
| `index.html` | `type="module"` on the script tag. |
| `package.json` | Add `test` script. |
| `test/identity.test.js` | New. Unit tests. |
