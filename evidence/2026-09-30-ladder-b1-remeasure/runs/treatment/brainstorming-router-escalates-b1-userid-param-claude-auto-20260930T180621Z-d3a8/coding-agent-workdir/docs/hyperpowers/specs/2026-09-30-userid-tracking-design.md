# userId Correlation Tracking — Design

**Date:** 2026-09-30
**Status:** Approved in chat; pending written-spec review

## Problem

The app has no way to say *who* performed an action. `login()` in `app.js` logs
the submitted username and returns `{ success, user }`; nothing survives the
call, so no other page or form can attribute later activity to the user who
logged in.

The original request was "add a `userId` parameter to the login function so we
can track who logged in." Clarification changed the shape of that request in two
ways, both of which this design follows:

1. The caller has no `userId` to pass. The form collects only username and
   password; a user's ID is what the server returns after authenticating. So
   `userId` becomes part of `login()`'s **return value**, not a parameter. The
   signature `login(username, password)` is unchanged.
2. The identity must "work across the app and persist" because "other forms will
   need it later." That requires a shared, persisted store — a new module — not
   a local variable.

## Scope

**In scope:** a tracking module that stores and reads a `userId`, `login()`
returning that id, the submit handler wiring the two together, and unit test
infrastructure for the module.

**Out of scope:**

- Real authentication. `login()` remains a stub that does not call
  `API_ENDPOINT`.
- Any async conversion of `login()`.
- Session or authorization behavior of any kind (see Security Constraint).
- `src/index.js` and `src/utils.js` — an unrelated Node entry point.

## Decisions

These were settled with the requester before design:

| Question | Decision |
|---|---|
| Where does `userId` come from? | The login API response, surfaced in `login()`'s return value. |
| What is it for? | Correlation / analytics only. Nothing authorizes off it. |
| How long does it survive? | `sessionStorage` — reaches other pages in the same tab, dies on tab close. |
| Architecture | Separate tracking module; the submit handler wires it to `login()`. |
| Test infrastructure | Yes — minimal runner set up as part of this work. |

Two approaches were rejected. Having `login()` write to storage itself was
rejected because it makes `login()` side-effecting, forces every future caller
to write storage, and requires a storage environment to test. An event-bus
tracker was rejected as YAGNI: indirection unjustified by a 25-line app with no
other tracking emitters today.

## Architecture

### Global constraints

- **No build tooling.** The app is plain static files; `app.js` is loaded by a
  `<script src>` tag and defines globals. New browser code follows that pattern
  — no imports, no bundler, no framework.
- **Zero runtime dependencies.** `package.json` declares none today and gains
  none here. Test infrastructure uses Node's built-in `node --test`.
- **Existing style.** Match `app.js`: `const` for module constants, plain
  function declarations, `console` for output.

### The tracking module

New file `tracking.js` at the repo root, loaded before `app.js`. It is the only
file in the app permitted to touch `sessionStorage`.

Storage key: `app.userId` — namespaced so it will not collide with other
origin-shared storage.

Public interface:

- `setUserId(userId)` — stores the id. Non-string or empty input is rejected
  without storing.
- `getUserId()` — returns the stored id, or `null` when it is absent,
  malformed, or storage is unavailable.
- `clearUserId()` — removes the stored id. Exists for logout and user-switch
  paths, which do not exist yet but which a correlation store must not make
  impossible.
- `logEvent(name, details)` — writes a console log line stamped with the
  current `getUserId()`.

**Testability seam.** `tracking.js` ends with a guarded CommonJS export
(`if (typeof module !== "undefined") { module.exports = { ... } }`), so the same
file works as a browser global script and as a Node `require` target. This
mirrors the CommonJS style already used in `src/utils.js`. The module reads
`globalThis.sessionStorage` **at call time** rather than capturing a reference
at load time, so tests substitute a fake by assigning `globalThis.sessionStorage`
— no dependency-injection machinery.

### Data flow

```
submit event
  → validateForm({ username, password })
  → login(username, password)  →  { success, user, userId }
  → setUserId(result.userId)
  → logEvent("login", { username })
```

`setUserId` is called only when `result.success` is true and `result.userId` is
present.

### Changes to `login()`

`login(username, password)` keeps its signature and stays synchronous. Its
return value gains a `userId` field: `{ success, user, userId }`.

Because `login()` is still a stub that never calls `API_ENDPOINT`, it returns a
placeholder id carrying an explicit comment that the real value arrives from the
API response once the call is wired. The placeholder format is
`"stub-" + username` — the `stub-` prefix makes it unmistakable in logs and
storage that no server issued this value.

Assumption: the login API will return a stable user identifier in its response
body. Validate via the API contract when the real `API_ENDPOINT` call is wired;
until then the placeholder stands in.

## Error handling

`sessionStorage` access can throw — disabled by browser policy, or some
private-browsing configurations. Because this is correlation data and nothing
depends on it for correctness or access, tracking degrades to a no-op rather
than breaking the login flow:

- Every storage access is wrapped. On throw, warn to console at most once per
  page load (guarded by a module-level flag) and continue. Repeated failures
  after the first are silent, so a broken storage environment cannot flood the
  console on every event.
- `getUserId()` returns `null` for absent, empty, non-string, or unavailable.
- `setUserId()` rejects empty or non-string input rather than storing garbage.
- `logEvent()` still fires when the id is `null`, logging `userId: null`. A
  missing id must be visible in the logs; dropping the event would hide it.

A storage failure never propagates to the caller and never prevents login.

## Testing

Runner: `node --test` (built in; adds no dependency). `package.json` gains
`"scripts": { "test": "node --test" }`.

`test/tracking.test.js` covers:

| Case | Expected |
|---|---|
| `setUserId` then `getUserId` | roundtrips the value |
| nothing stored | `getUserId()` returns `null` |
| empty or non-string stored value | `getUserId()` returns `null` |
| `setUserId("")` / non-string | nothing written to storage |
| storage getter/setter throws | no exception escapes; `getUserId()` returns `null` |
| `logEvent` with an id set | logged output carries that id |
| `logEvent` with no id | logged output carries `userId: null` |

Browser-side wiring in `app.js` is left to manual verification: load
`index.html`, submit the form, confirm the console shows the login event stamped
with a `userId` and that the value survives a same-tab navigation.

## Security constraint

The stored `userId` is readable **and writable** by any script running on the
origin. It is correlation data only. Nothing in this app may grant access,
change permissions, or make a trust decision based on it.

If real session identity is needed later, that is a server-issued token with
its own design — not an extension of this module.

## Files touched

| File | Change |
|---|---|
| `tracking.js` | New — storage module and `logEvent`. |
| `test/tracking.test.js` | New — unit tests for the module. |
| `app.js` | `login()` returns `userId`; submit handler calls `setUserId` and `logEvent`. |
| `index.html` | Add `<script src="tracking.js">` before `app.js`. |
| `package.json` | Add the `test` script. |

## Success criteria

1. `login()` returns a `userId` alongside `success` and `user`; its signature is
   unchanged.
2. After a successful login, `getUserId()` returns that id. Cross-page reach is
   a property of `sessionStorage` rather than something this repo can
   demonstrate today — there is only one page — so it is verified by the
   storage choice, not by a test.
3. Closing the tab clears the id (again, a `sessionStorage` property).
4. With `sessionStorage` unavailable or throwing, login still completes and
   `getUserId()` returns `null`.
5. `npm test` passes.
