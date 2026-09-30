# Anonymous User ID Tracking — Design

Date: 2026-09-30
Status: Approved for planning

## Problem

`login(username, password)` in `app.js` has no way to report *who* logged in
beyond the username typed into the form. The request was to add a `userId`
parameter so logins can be attributed.

Investigation showed there is no source for such a value: the only call site
(`app.js`, the form submit handler) has just `username` and `password` in
scope, `index.html` has no field carrying an identifier, and the repository
contains no user record, session, or auth state. `API_ENDPOINT` is a stub that
is never called.

The identifier therefore has to be created by the application itself, stored
somewhere, and made available to `login` and to forms that do not exist yet.
That is a small subsystem, not a parameter.

## Decisions

Each of these was chosen explicitly during brainstorming.

| Decision | Choice | Rationale |
|---|---|---|
| Origin of the ID | Client-minted anonymous UUID | No backend exists; `API_ENDPOINT` is a stub. Identifies a browser, not a person. |
| Storage | `localStorage` | Satisfies "persist" across restarts. No server-side correlation to gain from a cookie while the API is stubbed. |
| Module loading | Classic script + namespace global | Matches the existing `app.js` pattern; no build step; keeps `index.html` openable over `file://`. |
| Who supplies the value | The caller passes it into `login` | Keeps `login` a pure function of its arguments and testable without stubbing browser storage. |
| Tooling | `node --test`, zero dependencies | The fallback paths in `getUserId` need coverage; the repo had no runner. |

## Scope boundary

This identifier is for **logging and correlation only**.

It is client-minted and stored in `localStorage`, which the user can read,
edit, and delete. It must never gate an authorization decision, be treated as
proof of identity, or be trusted by a server as authentic. If a future backend
needs trustworthy identity, that is a server-issued value flowing *out* of
authentication, not this one flowing in.

## Privacy note

A persistent identifier that follows a person across visits is a tracking
identifier. Under GDPR/ePrivacy this is generally personal data requiring a
lawful basis and often consent, even though the value is a random UUID with no
name attached.

Assumption: this app has no EU users today, or consent is handled outside this
change. Validate via a check with whoever owns privacy for the app before the
identifier is used for anything beyond local `console.log` output. If consent
is required, the mint step gains a consent check; the rest of this design is
unaffected.

## Architecture

Three files: one new, two modified.

### New: `tracking.js` (repository root)

The repository root holds browser code (`app.js`, `index.html`); `src/` holds
Node/CommonJS code. `tracking.js` is browser code and belongs at the root.

Exposes a single namespace global with one function:

```
window.Tracking = { getUserId() }
```

`getUserId()` is read-through-and-mint:

1. Attempt to read `localStorage` key `app.userId`.
2. If the value is a non-empty string, return it.
3. Otherwise generate a UUID, attempt to store it, and return it.

Nothing is minted at script load. An ID is created only on the first call, so a
visitor who never interacts with a form is never assigned one.

The read-through shape is what makes the identifier work across the app without
coordination: any form calls the same function and receives the same value.
There is no initialization step to forget and no ordering requirement beyond
the script tag.

ID generation prefers `crypto.randomUUID()` and falls back to a UUIDv4 built
from `crypto.getRandomValues`. The fallback is required, not defensive padding:
`crypto.randomUUID` is only available in a secure context, and this page is
intended to remain openable over `file://`, where that guarantee varies by
browser.

The file ends with a guarded CommonJS export
(`if (typeof module !== "undefined" && module.exports)`) so the module can be
loaded by the test runner. This is inert in the browser.

### Modified: `index.html`

One line added: `<script src="tracking.js"></script>` immediately before the
existing `app.js` tag.

Both are classic scripts, so this ordering is load-bearing. A future form that
adds its own script must also come after `tracking.js`.

### Modified: `app.js`

- `login(username, password)` becomes `login(username, password, userId)`.
  The parameter is appended last, so any two-argument call continues to work.
- The return value gains the field: `{ success, user, userId }`.
- The log line includes the identifier alongside the username.
- The submit handler calls `login(username, password, Tracking.getUserId())`.
- The top-level DOM wiring is wrapped in `if (typeof document !== "undefined")`
  so the file can be loaded outside a browser.
- A guarded `module.exports` tail is added, as in `tracking.js`.

The last two are inert in the browser and exist solely so `login` can be unit
tested. Today the file throws immediately when loaded in Node, because
`document.getElementById("login-form")` runs at top level.

## Data flow

1. Page loads. `tracking.js` defines `window.Tracking`. No storage access, no
   ID minted.
2. User submits the form. `validateForm` runs first and short-circuits on
   missing fields, unchanged.
3. On a valid form, `Tracking.getUserId()` reads or mints the identifier.
4. `login(username, password, userId)` is called.
5. `login` logs the username and identifier, and returns
   `{ success: true, user: username, userId }`.

## Error handling

Governing rule: **tracking must never break login.** Observability that takes
down the flow it observes is worse than no observability.

| Condition | Behavior |
|---|---|
| `localStorage` read or write throws (private browsing, storage disabled by policy, quota exhausted, sandboxed iframe) | Fall back to a module-scoped in-memory ID minted once per page load. Emit one `console.warn` for the page, not one per call. Correlation narrows to a single page visit; the app keeps working. |
| Stored value is absent, empty, or not a string | Treat as absent and re-mint. `localStorage` is user-writable, so presence is not validity. |
| ID generation fails entirely | `getUserId()` returns `null`. |
| `userId` is `null` or `undefined` at `login` | `login` proceeds normally and records the value as-is. It performs no validation, because the field is a logging passthrough. |

No path in `getUserId()` propagates an exception to the submit handler.

## Testing

Runner: `node --test`, invoked through `npm test`. No dependencies added.
`package.json` gains a `scripts.test` entry.

Tests live in `test/tracking.test.js` and drive the modules through their
guarded CommonJS exports, with `localStorage` and `crypto` supplied as stubs.

Cases:

1. Mints and stores an ID when storage is empty.
2. Returns the same ID on a second call rather than re-minting.
3. Re-mints when the stored value is corrupt, empty, or a non-string.
4. Falls back to an in-memory ID when `localStorage` throws, and returns a
   stable value across calls within the page.
5. Warns exactly once when storage is unavailable, not once per call.
6. `login` includes `userId` in its return value.
7. `login` succeeds when `userId` is `null`.

## Out of scope

- Sending the identifier to a server. `API_ENDPOINT` remains an unused stub.
- Any authorization or identity use of the value (see Scope boundary).
- Migrating the repository to ES modules or adding a bundler. Considered and
  rejected: ESM would require serving the page over HTTP instead of opening it
  directly, and nothing here justifies a build pipeline.
- A linter or formatter. Offered and declined for now.
- Wiring the identifier into other forms. None exist yet; `getUserId()` is
  shaped so they need no new plumbing when they do.
