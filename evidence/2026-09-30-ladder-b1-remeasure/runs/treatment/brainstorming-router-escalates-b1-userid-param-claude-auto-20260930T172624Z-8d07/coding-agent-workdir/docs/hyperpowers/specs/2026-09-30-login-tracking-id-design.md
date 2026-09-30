# Login Tracking ID — Design

Date: 2026-09-30
Status: Approved in chat, pending spec review

## Problem

The request was "add a `userId` parameter to the login function so we can track
who logged in." The repo has no user identifier. `index.html` collects only a
username and a password, and `login` in `app.js` is a stub that logs the
username and returns a literal. There was nothing to pass as `userId`.

Clarification established that the intended value is a **client-generated
correlation ID** that persists across page loads, so that login attempts from
the same browser can be linked — including first attempts and failed attempts,
which occur before any account is known.

## Decisions

Each of these was decided explicitly; they are requirements, not inferences.

| Decision | Choice | Rejected alternatives |
|---|---|---|
| What `userId` is | Client-generated correlation ID | The username (redundant); a server-returned database key (would be a return value, not a parameter) |
| Lifetime | Persistent in `localStorage` | Ephemeral per-attempt |
| Scope | Browser-scoped, with an explicit reset | Never-reset browser ID; account-scoped ID |
| Storage unavailable | Pass explicit `null` | In-memory substitute ID; blocking the login attempt |
| Code location | `src/tracking.js`, dual-mode module | Inline in `app.js`; separate browser-global file |
| Tooling | `node --test`, zero dependencies | No tooling; ESLint + Prettier |
| `crypto.randomUUID` unavailable | `Math.random` fallback | Return `null` |

### Privacy posture

A durable browser-scoped identifier sent with every login attempt is a tracking
identifier. Two properties bound it deliberately:

- **It resets.** `clearTrackingId()` exists so the identifier does not
  accumulate history indefinitely. See the known gap below.
- **It is never invented.** When storage is unavailable, the value is `null`.
  No identifier is fabricated for users who have disabled storage, and no
  ephemeral value is passed off as a durable one.

The ID is written to the browser console by `login`'s existing log statement.
This is acceptable for an opaque UUID and is called out so it is a known
property rather than a surprise.

## Architecture

### New module: `src/tracking.js`

Owns the identifier. Knows nothing about forms, authentication, or `login`.

```js
const STORAGE_KEY = "login.trackingId";

function createTracker({ storage, generateId }) {
  return {
    getTrackingId() { /* ... */ },   // string | null
    clearTrackingId() { /* ... */ }, // void
  };
}
```

A **factory** plus a **default instance** bound to the real `localStorage` and
the real generator. `app.js` consumes the default instance; tests call the
factory with injected stubs. This injection seam is what makes the storage
failure paths testable.

### Dual-mode export

`app.js` is browser-global script code with no module system; `src/` is
CommonJS. The module must serve both. The default instance is constructed once
at module scope and its two methods are what both export paths expose:

```js
const defaultTracker = createTracker({
  storage: resolveStorage(),   // null when localStorage access throws
  generateId: defaultGenerateId,
});
const { getTrackingId, clearTrackingId } = defaultTracker;

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createTracker, STORAGE_KEY, getTrackingId, clearTrackingId };
} else {
  globalThis.LoginTracking = { getTrackingId, clearTrackingId };
}
```

`createTracker` must therefore accept a `storage` of `null` (the
storage-unavailable case resolved at construction time) in addition to a
storage object whose methods throw at call time. Both yield `null` from
`getTrackingId()`. Because the methods are destructured off the instance, they
must not depend on `this`.

Public surface: `getTrackingId(): string | null` and `clearTrackingId(): void`.

### ID generation

Prefer `crypto.randomUUID()`. It is defined only in a secure context —
`file://` qualifies in Chrome and Firefox, plain `http://` on a non-localhost
host does not. When it is unavailable, fall back to a `Math.random`-based
identifier and persist it normally.

The fallback carries a comment stating that this value is a correlation ID and
must never be used as a secret or for authorization. The risk being mitigated
is not weak randomness — a correlation ID needs collision resistance, not
unpredictability — but a future reader mistaking it for a token.

## Data flow

`index.html` loads the module before the app:

```html
<script src="src/tracking.js"></script>
<script src="app.js"></script>
```

The submit handler, after validation passes:

```js
const userId = LoginTracking.getTrackingId();
const result = login(username, password, userId);
```

`login` becomes:

```js
function login(username, password, userId = null) { /* ... */ }
```

The `= null` default is deliberate: a future call site that omits the argument
receives the same honest `null` as a storage failure, keeping "no ID" a single
value rather than splitting it across `null` and `undefined`.

`login` adds `userId` to its returned object, so the existing
`console.log("Login result:", result)` surfaces it without new logging code.

## Error handling

`getTrackingId()` and `clearTrackingId()` never throw and never block a login
attempt.

| Condition | Result |
|---|---|
| `localStorage` access throws at resolve time (disabled, private browsing) | `storage` is `null`; `getTrackingId()` returns `null` |
| `storage` method throws at call time | `null` |
| No stored value | generate, persist, return it |
| `setItem` throws (quota exceeded) | `null` — not the unpersisted ID |
| Stored value is empty or whitespace | treat as absent, regenerate |
| `crypto.randomUUID` undefined | `Math.random` fallback, then persist |

The quota row applies the same principle as the storage-unavailable decision: a
generated-but-unpersisted ID would look durable without being durable, which is
the failure mode that in-memory substitution was rejected for.

## Testing

`node --test` (built into Node 18+). `package.json` gains
`"scripts": { "test": "node --test" }` and no dependencies.

Tests in `src/tracking.test.js`, driving `createTracker` with stub storage:

1. Empty storage: generates, persists, returns an ID
2. Second call returns the same ID (durability guarantee)
3. `getItem` throws: returns `null`
4. `setItem` throws: returns `null`, nothing cached in memory
5. `clearTrackingId()` removes the key; next call returns a different ID
   (reset guarantee)
6. Empty stored string is treated as absent
7. Injected non-crypto generator still persists and round-trips
8. `storage: null` at construction: `getTrackingId()` returns `null` and
   `clearTrackingId()` is a no-op that does not throw

**Untested, by decision:** the `index.html` script tag, script load order, and
the `app.js` handler wiring. There is no DOM harness and jsdom is not being
added for a fixture this size. These three are verified manually. The tested
surface is `src/tracking.js`, which is where the durability, reset, and
null-on-failure guarantees live.

## Known gaps

- **`clearTrackingId()` has no caller.** The app has no logout. Adding one is
  out of scope. The reset path must be wired when a logout is introduced;
  until then the identifier is reset-capable but never actually reset.
- **Script load order is uncoupled.** `index.html` must load
  `src/tracking.js` before `app.js`. Reordering the tags breaks the feature
  silently. Without a module system there is no way to enforce this.

## Out of scope

- Adding a logout control
- Sending the ID to `API_ENDPOINT` (`login` remains a stub)
- Consent gating for the tracking identifier
- Linting and formatting tooling
- Any change to `src/index.js` or `src/utils.js`
