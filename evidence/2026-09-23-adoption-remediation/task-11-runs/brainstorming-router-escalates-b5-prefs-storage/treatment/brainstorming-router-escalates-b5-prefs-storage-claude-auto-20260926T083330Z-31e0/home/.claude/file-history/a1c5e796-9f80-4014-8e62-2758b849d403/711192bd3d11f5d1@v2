# User Preferences Storage — Design

Date: 2026-09-26
Status: Approved in chat, pending spec review

## Problem

Settings do not persist across sessions because the webapp has no storage
layer. The browser half of the repo (`index.html`, `app.js`) is a login form
with a stubbed `login()`; nothing is written anywhere, and there are no
user-facing settings at all. This design adds the missing persistence layer and
one real preference that uses it, so the persistence is observable rather than
taken on faith.

## Scope

In scope:

- A browser preferences module, `prefs.js`, backed by `localStorage`.
- One preference wired end-to-end: an opt-in "Remember my username" checkbox on
  the login form.
- Unit tests for the module.

Out of scope:

- The Node half of the repo (`src/index.js`, `src/utils.js`). It is an
  unrelated `greet` demo with no user-facing surface; it is not touched.
- Server-side or cross-device preference sync. The API is a stub with no
  session token, so there is nothing to authenticate a preferences call
  against. The design leaves room for this later (see Future Extension).
- A general settings panel. No settings exist today; inventing options would be
  speculative.

## Decisions

These were settled during brainstorming and are fixed for this work.

| Decision | Choice | Reasoning |
|---|---|---|
| Surface | Browser webapp | The only half of the repo with a user-facing surface and a user identity, however stubbed. |
| Scoping | Per-device, anonymous | Works today with no server dependency. Per-user-local was rejected: it implies an isolation guarantee `localStorage` does not provide, since any script on the origin can read it. |
| Deliverable | Module plus one real setting | Smallest version that makes "settings persist" demonstrably true, and designing against one real caller is what keeps the interface honest. |
| Storage failure | Degrade silently | A private-browsing or quota failure must never break login. |
| Module format | Classic script with dual-export tail | Matches the repo's existing plain-script style and avoids a collateral edit to the unrelated `src/` tree. |
| Test infrastructure | `node:test` + `node:assert`, zero dependencies | Keeps the repo dependency-free and forces the storage to be injectable, which is better design regardless. |

## Global Constraints

- **No new runtime or dev dependencies.** `package.json` gains a `test` script
  and nothing else.
- **Unit tests are required** for `prefs.js`, using `node:test` and
  `node:assert`.
- **No linter or formatter** is being introduced; this was offered and not
  selected. Match the existing file style by hand.
- **No credentials in storage.** Passwords, tokens, and any
  password-adjacent value must never be written to preferences.
  `localStorage` is readable by any script on the origin and persists
  indefinitely.
- `src/` and its CommonJS style must remain untouched.

## Architecture

### `prefs.js` (new, repo root)

Sits alongside `app.js`, the browser half. Contains no DOM access, which is
what makes it testable without a DOM environment.

Public surface:

```js
createPrefs(storage)  // factory; storage defaults to safeStorage()
  .get(key, fallback) // fallback returned when key is absent
  .set(key, value)    // value === undefined behaves as remove(key)
  .remove(key)
  .clear()
```

Internal helper:

```js
safeStorage()  // probes localStorage; returns an in-memory shim on failure
```

The module ends with a dual-export tail so the same file serves the browser
(as a classic script defining a global) and the test runner (via `require`):

```js
if (typeof module !== "undefined") {
  module.exports = { createPrefs, safeStorage };
}
```

### Data model

All preferences live in a single `localStorage` entry under the key
`webapp.prefs`, holding one JSON object:

```json
{ "rememberUsername": true, "lastUsername": "alice" }
```

One key rather than key-per-preference, for three reasons: a single
read-and-parse per access; an atomic `clear()`; and, the reason that actually
matters, a `clear()` that cannot wipe unrelated entries written by other
scripts on the same origin.

Writes are read-modify-write of the whole object, so a preference written by
future code is preserved rather than dropped by an older caller.

### Data flow

1. **Page load.** `app.js` reads preferences. If `rememberUsername` is true, it
   checks the box and pre-fills `#username` with `lastUsername`.
2. **Checkbox unchecked.** Writes `rememberUsername: false` and removes
   `lastUsername` immediately, so opting out takes effect without requiring
   another login.
3. **Checkbox checked.** Writes `rememberUsername: true`.
4. **Submit.** After validation passes, if the box is checked, stores
   `lastUsername`.

The password field is never read into, or written from, the store.

### UI change

`index.html` gains one checkbox inside the existing form, unchecked by default,
with an associated label. No other markup changes.

## Error Handling

| Condition | Behavior |
|---|---|
| `localStorage` absent, disabled, or throwing on probe | `safeStorage()` returns an in-memory shim. The app works normally; preferences do not survive a reload. No error surfaced, no console output. |
| `setItem` throws after a successful probe (quota exceeded) | Caught. The instance switches to the in-memory shim, seeded with the current preference object, for the rest of the page's lifetime. Subsequent reads and writes stay consistent; nothing further is persisted. |
| Stored value is not valid JSON | Treated as `{}`. Overwritten on the next write. |
| Stored value is valid JSON but not an object (e.g. `"null"`, `"[]"`, `"3"`) | Treated as `{}`. |
| `set(key, undefined)` | Treated as `remove(key)`, so "not set" has one representation. |

Silent degradation is a deliberate choice: the failure modes are environmental
rather than programmer error, and none of them should interrupt a login.

## Testing

`test/prefs.test.js`, run via `npm test` → `node --test`.

Test doubles: a plain object implementing `getItem` / `setItem` /
`removeItem`, plus a variant whose methods throw.

Cases:

- `set` then `get` round-trips a value.
- `get` on a missing key returns the supplied fallback.
- `remove` deletes a key; a later `get` returns the fallback.
- `clear` empties the store.
- A write preserves unrelated keys already in the blob.
- Corrupt JSON in the backing key degrades to the fallback rather than throwing.
- A storage that throws on probe never propagates an error, and the store
  behaves as in-memory for the life of the instance.
- A storage that succeeds on probe but throws on `setItem` does not propagate;
  a value written after the throw is still readable from the same instance.
- `set(key, undefined)` is equivalent to `remove(key)`.

### Known coverage gap

The `app.js` DOM wiring is **not** covered by automated tests. This is the
accepted trade from choosing zero-dependency `node:test` over vitest + jsdom.
Verification of the checkbox behavior is manual: load `index.html` in a
browser, submit with the box checked, reload, and confirm the username is
pre-filled and the box is still checked; then uncheck it and confirm the
username is gone after a reload. This must be reported as a manual check, not
an automated one.

## Future Extension

Server-backed, per-account preferences remain available later without redoing
this work: a sync layer would treat the local store as a cache and reconcile it
against the API once `login()` returns a real session token. The single-blob
data model maps directly onto a JSON request body. No part of this design needs
to be undone to get there.
