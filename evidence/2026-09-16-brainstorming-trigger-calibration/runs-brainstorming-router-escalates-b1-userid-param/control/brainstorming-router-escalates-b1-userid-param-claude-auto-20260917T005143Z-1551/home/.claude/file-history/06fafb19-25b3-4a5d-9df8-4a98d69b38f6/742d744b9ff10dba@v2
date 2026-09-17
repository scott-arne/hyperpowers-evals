# Client-Generated Persistent User Identity

Date: 2026-09-16
Status: Awaiting review

## Problem

The request was "add a `userId` parameter to the login function so we can track
who logged in." The literal change is one parameter on one function, but the
purpose behind it is not: the identifier must work across the app, persist
across sessions, and be available to forms that do not exist yet.

No such identifier exists today. `login(username, password)` in `app.js`
receives a username and nothing else; the only identity-shaped value in the
codebase is the user-entered username string. Adding a `userId` parameter
without deciding what a `userId` *is* would bake a placeholder into an
interface that other forms are expected to depend on.

This spec designs that identifier and threads it into `login`. It does not
design where login events ultimately go.

## Decisions Already Made

These were settled during brainstorming and are inputs, not open questions.

| Decision | Choice | Rationale |
|---|---|---|
| Identity source | Client-generated | No auth backend exists; `API_ENDPOINT` is an unfetched stub. A client-minted id works today and exists before login. |
| Persistence | `localStorage` | Survives browser restart, shared across tabs. A cookie's automatic transmission buys nothing against a stub backend. |
| Consent | Required, designed in | A persistent app-wide identifier created for tracking is subject to GDPR/ePrivacy-style consent regardless of storage mechanism. |
| Scope | Identity only | Event recording is additive and better designed once a real endpoint exists. |
| Consent UI | Simple in-page banner | Without one, nothing can ever grant consent. |
| Structure | Namespaced global (`AppIdentity`) | Matches the existing script-tag, top-level-scope pattern. |

The identifier identifies a **browser, not a person**. Clearing storage or
switching devices produces a new id. This is an accepted consequence of the
client-generated choice, not an oversight.

## Global Constraints

- **Zero runtime dependencies.** The repo has none today and gains none here.
- **Unit tests** via Node's built-in runner (`node --test`). No test framework
  dependency. This was an explicit tooling selection.
- **No linter or formatter.** Explicitly declined; match surrounding style by hand.
- **No build step.** Plain `<script>` tags; the page must keep opening from
  `file://` without a server.
- The spec file is a working document and is not committed unless requested.

## Architecture

One new file, `identity.js`, loaded in `index.html` before `app.js`. It wraps
its internals in an IIFE and exposes one global:

```js
var AppIdentity = (function () { /* ... */ })();
```

`app.js` consumes it through that global. Nothing else changes structurally.

**`identity.js` touches no DOM.** It reads and writes storage and nothing else.
All DOM work — including the consent banner's wiring — lives in `app.js`, which
already owns every DOM reference in the codebase. This boundary is load-bearing
rather than stylistic: the test strategy below loads `identity.js` in Node,
where `document` does not exist, so a DOM reference at module scope would throw
on import.

### Why not ES modules

`type="module"` forces CORS rules on, which stops `index.html` from opening
over `file://`, and converts `app.js` to deferred module scope — a behavior
change to code outside this request. Rejected for now; the five-function
interface below is identical under modules, so the conversion stays cheap if
the app later gains a build step.

### Why not a pluggable storage adapter

Indirection for a second storage backend that does not exist and a live
consent-change subscription that nothing currently needs. Rejected as YAGNI.

## Interface

`AppIdentity` exposes exactly five functions. This is the contract future
forms depend on; everything else is private.

| Function | Returns | Behavior |
|---|---|---|
| `getConsent()` | `"granted"` \| `"denied"` \| `"unset"` | Current consent state. `"unset"` means never asked. |
| `getUserId()` | `string` \| `null` | The identifier, or `null` whenever consent is not `"granted"`. |
| `grantConsent()` | `string` | Records consent, mints the id if absent, returns it. Idempotent. |
| `revokeConsent()` | `void` | Records `"denied"` and deletes the id. |
| `clear()` | `void` | Removes the record entirely; state returns to `"unset"`. |

Consent is tri-state rather than boolean because "not yet asked" and "declined"
require different behavior: the first shows the banner, the second must not
re-prompt.

`revokeConsent()` and `clear()` differ deliberately. Revoking is a user
decision to record and honor; clearing is a reset that allows re-prompting.
The deletion path the consent requirement calls for is `revokeConsent()`.

`grantConsent()` called while consent is `"denied"` mints a **new** id rather
than restoring the old one — the previous id was deleted at revocation and is
not recoverable. Only `grantConsent()` on an `"unset"` state, or on an already
`"granted"` state, is a no-op-or-reuse. Stated because "idempotent" alone does
not settle the denied-then-granted path.

## Data Model

A single `localStorage` key, `app.identity`, holding one JSON object:

```json
{
  "v": 1,
  "consent": "granted",
  "userId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "createdAt": "2026-09-16T12:00:00.000Z"
}
```

- `v` — schema version. One place to handle format change when server-issued
  ids eventually arrive.
- `consent` — `"granted"` or `"denied"`. Absence of the whole record is what
  represents `"unset"`; `"unset"` is never written.
- `userId` — present only when `consent` is `"granted"`.
- `createdAt` — ISO 8601, set when the id is minted. Diagnostic only; nothing
  reads it for logic.

**One key, not two.** Separate `consent` and `userId` keys can desync into
"consent revoked, identifier still stored" if a write fails between them —
exactly the state a consent gate exists to prevent. A single object makes the
write atomic from the app's perspective.

### Identifier generation

`crypto.randomUUID()` when available; otherwise a v4 UUID assembled from
`crypto.getRandomValues()`. `randomUUID` is restricted to secure contexts while
`getRandomValues` is not, so the fallback preserves the `file://` constraint.
`Math.random()` is not used — it is not a suitable source for identifiers.

## Error Handling

| Condition | Behavior |
|---|---|
| `localStorage` throws (Safari private mode, storage disabled, quota) | Degrade to an in-memory record for the page lifetime. The app works; the id does not survive reload. |
| Stored JSON is unparseable | Treat as `"unset"`. Do not throw. |
| Stored `v` is unrecognized | Treat as `"unset"`. Do not throw. |
| `grantConsent()` called when already granted | Return the existing id. Do not mint a new one. |
| `getUserId()` with consent `"denied"` or `"unset"` | Return `null`. Not an error. |

The governing rule: a storage or consent problem must never break the login
form. Every failure degrades toward "no identifier," never toward an exception.

## Consent Banner

A `<div id="consent-banner">` in `index.html`, above the form, hidden by
default. On load, **`app.js`** reveals it only when `getConsent() === "unset"`
— the banner is DOM work, so it belongs with the other DOM work, and
`identity.js` stays loadable in Node.

- One line of text stating what is stored and why.
- **Accept** → `AppIdentity.grantConsent()`, hide banner.
- **Decline** → `AppIdentity.revokeConsent()`, hide banner.

A `"denied"` state does not re-show the banner on later loads; only a genuinely
`"unset"` state does. Re-prompting a user who declined is the behavior the
tri-state exists to prevent.

Styling is minimal and inline. The page has no stylesheet and this spec does
not introduce one.

## `login` Integration

```js
function login(username, password, userId = null) {
  console.log("Logging in:", username, "userId:", userId);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username, userId };
}
```

The call site at `app.js:23` becomes:

```js
const result = login(username, password, AppIdentity.getUserId());
```

`userId` is third and optional so existing and future callers without an id
keep working. A `null` `userId` is logged as `null` and is not an error — it is
the ordinary state for a user who declined, and a consent decision that broke
login would be no decision at all.

`validateForm` is unchanged. The identifier is not a form field and must not
become a required one.

## Testing

`node --test`, wired as `"test": "node --test"` in `package.json`.

`identity.js` gains a two-line tail so it loads in both browser and test:

```js
if (typeof module !== "undefined") { module.exports = AppIdentity; }
```

Tests inject a fake `localStorage` on `globalThis`. The "reload" case is
simulated by deleting the module from `require.cache` and re-requiring it
against the same fake storage object — that re-runs the IIFE exactly as a fresh
page load would, which is the behavior under test.

| Case | Expected |
|---|---|
| No stored record | `getConsent() === "unset"`, `getUserId() === null` |
| `grantConsent()` | Returns a non-empty id; `getConsent() === "granted"` |
| Reload with same storage | `getUserId()` returns the same id (persistence) |
| `grantConsent()` twice | Same id both times (idempotent) |
| `revokeConsent()` | `getUserId() === null`, `getConsent() === "denied"` |
| `grantConsent()` after `revokeConsent()` | Returns a new id, different from the revoked one |
| `clear()` | `getConsent() === "unset"` |
| Corrupt JSON in storage | Reads as `"unset"`, no throw |
| Unknown `v` in storage | Reads as `"unset"`, no throw |
| Storage throws on every access | `grantConsent()` still returns a usable id |

**Not unit-tested:** the banner and DOM wiring. Covering those needs a DOM
harness, which means the dependency that was explicitly declined. They will be
verified manually in a browser, and this gap is stated rather than implied.

## Out of Scope

- Event recording — where login events accumulate. Separate spec, once a real
  endpoint exists.
- Any network call. `API_ENDPOINT` remains an unused stub.
- Server-issued identity and reconciliation with client-minted ids. The `v`
  field is the forward hook; no migration is designed here.
- Cross-device or cross-browser identity. Out of reach by construction.
- Linting and formatting configuration.

## Open Assumptions

- Assumption: an in-page banner is sufficient consent for this app's
  jurisdiction and audience; validate with whoever owns privacy requirements
  before this reaches real users.
- Assumption: `package.json` declaring `main: src/index.js` while `index.html`
  loads only `app.js` is pre-existing and intentional; validate by asking
  before touching `src/`. Nothing in this spec changes `src/`.

## Files Touched

| File | Change |
|---|---|
| `identity.js` | New. The module. DOM-free. |
| `index.html` | Add banner markup; add `<script src="identity.js">` before `app.js`. |
| `app.js` | `login` gains optional third parameter; call site passes `AppIdentity.getUserId()`; banner show/hide and button wiring. |
| `package.json` | Add `"scripts": { "test": "node --test" }`. |
| `test/identity.test.js` | New. The cases above. |
