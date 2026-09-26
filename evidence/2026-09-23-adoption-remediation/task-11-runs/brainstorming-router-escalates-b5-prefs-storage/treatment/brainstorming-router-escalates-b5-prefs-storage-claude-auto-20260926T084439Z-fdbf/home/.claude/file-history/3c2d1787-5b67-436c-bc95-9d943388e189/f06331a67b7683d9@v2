# User Preferences Storage — Design

Date: 2026-09-26
Status: Approved in brainstorming, pending spec review

## Problem

The webapp has no way to remember anything between visits. Every page load starts
from the same blank state, and there is no module any feature can use to store a
user setting. The request is for preferences that persist across sessions.

There are no settings in the app today, so this change has to create both the
storage mechanism and a first real consumer of it — otherwise "settings persist"
is untestable.

## Scope

In scope:

- A browser-local preferences module with a small, explicit interface.
- One starter preference — "remember my username" — wired into the existing
  login form, so persistence is observable by reloading the page.
- Unit-test infrastructure, since the repo currently has none.

Out of scope:

- Server-backed or account-scoped preferences. There is no backend in this repo
  and `login()` in `app.js` is a stub that returns a hardcoded success, so there
  is no account to attach preferences to.
- A dedicated settings UI section. The page has only a login form; settings
  chrome for preferences that do not exist yet would be speculative.
- Cross-device sync.

## Global Constraints

- **Unit tests are part of this work.** Node's built-in test runner
  (`node:test` + `node:assert`), run via `npm test`. Every task that adds
  behavior adds tests with it.
- **No third-party dependencies.** `package.json` currently declares none;
  the built-in runner keeps it that way.
- **No linter, formatter, or end-to-end test infrastructure** is set up by this
  work. That was considered and declined; match the existing file style by hand.
- **The password is never persisted.** Not to localStorage, not anywhere.

## Decisions

### Storage location: browser localStorage

Preferences live in the browser and follow the device.

Rejected: server-backed per-account storage. It would give real cross-device
persistence, but requires building an API, a datastore, and real authentication
first — far beyond the request, and unattachable to a stubbed `login()`.

Rejected: an async `get`/`set` interface over localStorage as a seam for a future
server backend. The seam is speculative. If a backend arrives it will arrive with
an auth system, and adapting a small, well-bounded module at that point costs
less than carrying an awkward abstraction until then.

### One key holding one object

All preferences live under a single localStorage key, `webapp.preferences`,
containing one JSON object.

Chosen over a key per preference because reads and writes stay atomic, defaults
merge in exactly one place, the app occupies one namespace instead of scattering
entries across the origin, and a `version` field gives a migration handle. The
cost — writing one preference rewrites the whole object — is irrelevant at this
size.

### `DEFAULTS` is the schema

A single `DEFAULTS` constant declares which preferences exist and the type of
each. It is the only place the set of valid preferences is defined.

## Data Model

Stored shape:

```json
{
  "version": 1,
  "rememberUsername": false,
  "lastUsername": ""
}
```

| Field | Type | Default | Meaning |
|---|---|---|---|
| `version` | number | `1` | Schema version of the stored object. |
| `rememberUsername` | boolean | `false` | Whether to prefill the username field on load. |
| `lastUsername` | string | `""` | The username to prefill. Empty when not remembering. |

`version` is managed by the module and is not a preference. It is not a key in
`DEFAULTS`, it is not readable or writable through `get`/`set`, and it is not
included in what `all()` returns. It exists only in the serialized object.

## Components

### `prefs.js` (new, repo root)

A classic script — not an ES module — exposing a single `Prefs` object, with a
CommonJS `module.exports` tail so tests can require it. This matches the existing
`src/utils.js` pattern and avoids converting `index.html` to module loading for
the sake of one file.

Interface, all synchronous:

- `Prefs.get(name)` — the stored value, or the default when absent.
- `Prefs.set(name, value)` — persist. Returns `true` if the value reached
  localStorage, `false` if it is only held in memory.
- `Prefs.all()` — a copy of the merged preferences, excluding `version`. Callers
  cannot mutate internal state through it.
- `Prefs.reset()` — return every preference to its default.

### `index.html` (modified)

Adds one checkbox to the login form, `id="remember-username"`, unchecked in the
markup. Adds a `<script src="prefs.js">` tag before the existing `app.js` tag, so
`Prefs` is defined when `app.js` runs.

### `app.js` (modified)

On load: read `rememberUsername`. If true, check the box and prefill the username
input from `lastUsername`.

On submit: if the box is checked, write `rememberUsername: true` and the submitted
username to `lastUsername`. If it is unchecked, write `rememberUsername: false`
and set `lastUsername` to `""` — unticking actively erases the stored username
rather than leaving an orphaned value behind.

The password is read from the form for the existing stubbed `login()` call and is
never passed to `Prefs`.

### `package.json` (modified)

Adds `"scripts": { "test": "node --test" }`.

### `test/prefs.test.js` (new)

Unit tests for the module, injecting a fake `localStorage` so each case controls
the store exactly.

## Error Handling

The governing rule: `get` and `set` never throw for storage reasons. A browser
that will not persist should yield a working app with forgetful settings, not a
broken page.

| Condition | Behavior |
|---|---|
| localStorage unavailable (private mode, disabled, `SecurityError` on access) | Fall back to an in-memory object for the page's lifetime. `set` returns `false`. |
| Stored JSON unparseable | Discard it, use defaults, overwrite on the next write. |
| Stored `version` is not `1` | Discard to defaults. |
| Quota exceeded on write | Keep the in-memory value, return `false`. |
| A stored field's type does not match its default | Ignore that field, use the default. Other fields are unaffected. |

Two conditions **do** throw, because they are programmer errors rather than
environment conditions:

- `get` or `set` with a `name` not present in `DEFAULTS`. This turns a typo into
  an immediate error instead of a silently discarded setting.
- `set` with a value whose type does not match that preference's default.

Version handling is deliberately a discard rather than a migration. With one
shipped version there is nothing to migrate from; a real migration path is
cheaper to write when a v2 exists and its shape is known.

## Security Considerations

localStorage is readable by any script running on the page and by every tab on
this origin, and it survives on shared machines until explicitly cleared. Storing
a username under those properties is acceptable; storing a password is not.

Three things enforce that:

- `DEFAULTS` contains no field a password could be written to, and unknown names
  throw.
- `app.js` never passes the password value to `Prefs`.
- A test asserts that no password-shaped key is ever written to the store.

The feature is opt-in and defaults to off, so nothing is retained on a shared
device unless the user asks for it.

## Testing Strategy

`npm test` runs `node --test` over `test/`. Tests inject a fake `localStorage`
rather than relying on a browser, so failure modes such as quota exhaustion and a
throwing storage accessor can be exercised directly.

Cases:

1. Empty store — `get` returns each default; `all()` equals `DEFAULTS`.
2. Round-trip — `set` then `get` returns the written value.
3. Persistence — a value written by one module instance is readable by a freshly
   loaded instance backed by the same store. This is the actual claim the feature
   makes.
4. Corrupt JSON in the store — falls back to defaults, does not throw.
5. localStorage absent or throwing on access — stays in memory, does not throw,
   `set` returns `false`.
6. Quota exceeded — `set` returns `false`, the in-memory value is still readable.
7. Unknown preference name — `get` and `set` both throw.
8. Wrong value type passed to `set` — throws.
9. Stored `version` mismatch — resets to defaults.
10. Stored field with a wrong type — that field falls back to its default while
    others are preserved.
11. No password-shaped key is ever present in the written object.

Manual verification, since there is no end-to-end harness: load `index.html`,
tick the box, submit, reload, and confirm the username is prefilled and the box
is still checked; then untick, submit, reload, and confirm the field is empty.

## Files Touched

| File | Change |
|---|---|
| `prefs.js` | New. The preferences module. |
| `test/prefs.test.js` | New. Unit tests. |
| `index.html` | Add the checkbox and the `prefs.js` script tag. |
| `app.js` | Load preferences on start, write them on submit. |
| `package.json` | Add the `test` script. |
