# User Preferences Storage — Design

Date: 2026-09-26
Status: approved in brainstorming; not yet planned
Branch: `feature/webapp-enhancement`

## Problem

The application has no way to remember anything between visits. There is no
settings state, no storage layer, and no persistence code of any kind. The
request is to add user preferences storage so settings persist across
sessions.

Because the repository contains no existing preferences flow, this is new
structure rather than a change to existing behavior: a storage module, its
tests, and a first consumer.

## Decisions

These were settled during brainstorming and are inputs to the design, not
open questions.

| Decision | Choice |
|---|---|
| What is stored | A generic key-value store. No fixed set of keys defined up front. |
| Where it is stored | Browser `localStorage`, client-only. Per-device; no backend. |
| Module system | ES modules. |
| Storage layout | One `localStorage` entry per preference. |
| Integration scope | The module, its tests, and one demo preference (dark-mode toggle). |
| Test tooling | Node's built-in runner (`node --test`). No new dependencies. |

Cross-device synchronization is explicitly out of scope. The application has
no backend — `login()` in `app.js` is a stub that never contacts
`API_ENDPOINT` — so server-backed preferences would require building an API,
a datastore, and auth-scoped reads first. If cross-device persistence becomes
a requirement, this design is superseded rather than extended.

## Architecture

One new module, `prefs.js`, at the repository root alongside `app.js`.

Browser code lives at the root in this repository; `src/` holds a separate,
unrelated CommonJS Node program (`src/index.js`, `src/utils.js`) that nothing
in the browser code references. The two are not mixed.

```
index.html  --(type="module")-->  app.js  --(import)-->  prefs.js  --> localStorage
```

`prefs.js` has no dependencies and no knowledge of the DOM. `app.js` owns all
DOM interaction. This boundary is what makes `prefs.js` testable in plain
Node with no browser and no DOM shim.

## Public interface

```js
export function createPreferences({ storage = globalThis.localStorage,
                                    namespace = "prefs" } = {}) { … }

export const preferences = createPreferences();
```

The factory exists so tests can inject a fake `storage`. Application code
imports the `preferences` instance and does not call the factory.

| Member | Signature | Behavior |
|---|---|---|
| `get` | `get(key, fallback)` | Returns the stored value. Returns `fallback` (default `undefined`) when the key is unset or unreadable. Never throws. |
| `set` | `set(key, value) -> boolean` | Stores the value. Returns `true` when durably written, `false` when only held in memory. Never throws. |
| `remove` | `remove(key) -> void` | Deletes the key from both durable storage and the in-memory overlay. No-op when absent. |
| `keys` | `keys() -> string[]` | Preference names currently stored, with the namespace prefix stripped. Order is unspecified. |
| `isPersistent` | boolean property | `false` when the instance fell back to in-memory storage at construction. |

Defaults are supplied per call site via `get`'s `fallback` argument. There is
no central registry of keys and no registration step; that would contradict
the generic key-value decision.

### Deliberately excluded

- **Change notification** (`subscribe`, `storage`-event fan-out). Reads pass
  straight through to `localStorage`, so no cached state can go stale and
  nothing needs invalidating. Add it when a consumer needs to react to a
  change it did not make.
- **`clear()`**. Expressible as `keys().forEach(remove)`.
- **A defaults registry and schema-migration hook.** Machinery for a schema
  change that has not happened, and in tension with having no fixed key set.
- **Custom type tagging** to preserve `Date` and similar. See Serialization.

## Storage layout

Each preference is one `localStorage` entry keyed `` `${namespace}:${key}` ``
— by default `prefs:theme`, `prefs:fontSize`, and so on.

`keys()` enumerates `localStorage` by index, keeps entries whose name starts
with `` `${namespace}:` ``, and strips that prefix. Keys containing further
colons round-trip correctly because only the leading prefix is removed.

Rationale for one entry per preference rather than a single JSON document:

- Two tabs writing different preferences cannot clobber each other. A single
  shared document requires read-modify-write, where the second writer
  silently discards the first writer's change.
- A corrupt or truncated entry costs one preference, not all of them.
- The layout mirrors the key-value API one-to-one.

The accepted costs: enumeration is a prefix scan rather than a single read,
there is no atomic multi-key write, and there is no single place to stamp a
schema version. If the stored shape ever must change, the namespace is bumped
(`prefs.v2`) and old entries are ignored.

## Serialization

Values are written with `JSON.stringify` and read with `JSON.parse`.

**Contract: values are JSON. What comes back is what JSON can represent, not
necessarily the object that went in.** A `Date` returns as an ISO string.
`NaN` and `Infinity` return as `null`. This limit is documented rather than
worked around; custom type tagging would add a serialization format that
becomes load-bearing and then subtly wrong.

Supported without surprise: `null`, booleans, finite numbers, strings, and
plain arrays and objects composed of those.

Two write cases need explicit handling:

- **`set(key, undefined)`**, and equally a function or a symbol value:
  `JSON.stringify` produces no string for these. Treated as `remove(key)`,
  returning `true`. Writing the literal text `undefined` and returning it
  forever as a string would be worse.
- **Cyclic objects and `BigInt`**: `JSON.stringify` throws. `set` catches,
  writes nothing, and returns `false`. A bad value from one caller never
  corrupts the store and never escapes as an exception into an event handler.

**Corrupt reads.** When `JSON.parse` throws — a hand-edited entry, a write
truncated by a crash — `get` returns the fallback and leaves the entry in
place. It does not delete it. A read path that destroys data is a worse
surprise than one that returns a default, and preserving the value keeps it
available for diagnosis.

## Failure behavior

`localStorage` fails in two distinct ways, both handled.

**Unavailable at construction** — Safari private browsing, blocked site data,
`file://` sandboxing, or `storage` missing entirely. The factory probes once
by writing and removing a namespaced probe key inside a `try`. On failure the
instance routes every operation to an in-memory `Map` and sets
`isPersistent = false`. The application keeps working; preferences simply do
not outlive the tab.

**Failing later** — quota exhaustion strikes a particular `set` long after a
successful probe. That `set` catches the throw, records the value in an
in-memory overlay, and returns `false`.

`get` consults the overlay before `localStorage`, so a value whose durable
write failed is never shadowed by a stale persisted value underneath it.
`remove` clears both. This keeps reads consistent within the session even
when the store is partially durable.

Consequently `set`'s boolean return is meaningful in both modes, and
`isPersistent` lets a caller warn up front that settings will not be saved.

## Security boundary

`localStorage` is readable by any script running on the page and by anyone
with access to the machine. It is not a secret store, and nothing in this
design changes that.

The protection is scope, not obfuscation:

- The login form stays unwired from this module.
- No username, password, token, session identifier, or "stay signed in" flag
  is stored through it. No such feature is being added.
- `prefs.js` carries a header comment stating this contract.

Key-name filtering (rejecting keys named `password` and similar) is
deliberately **not** implemented. It would not catch the names a real mistake
would use, and its main effect would be to make the store feel safer than it
is.

## Integration

**`index.html`** — `<script src="app.js">` becomes
`<script type="module" src="app.js">`.

Consequence: module scripts require an `http://` origin, so opening
`index.html` directly from the filesystem stops working. Local development
uses a static server, for example `python3 -m http.server` from the
repository root. This is a real regression in how the page is opened and is
accepted knowingly.

A checkbox control and label for the dark-mode toggle are added to the body.

**`app.js`** — imports `{ preferences }` from `./prefs.js`. On load it reads
`preferences.get("theme", "light")`, applies it to the document, and reflects
it in the checkbox. On change it applies the new theme and calls
`preferences.set("theme", …)`. Existing login behavior is unchanged.

Module scripts are deferred, so the existing top-level
`document.getElementById("login-form")` lookup still resolves; it currently
works only because the script tag sits at the end of `<body>`.

**`package.json`** — gains `"type": "module"` and a `"test": "node --test"`
script.

`"type": "module"` is package-wide and would break the CommonJS `require` in
`src/`. To contain it, a new one-line `src/package.json` containing
`{"type": "commonjs"}` pins that directory to its current semantics.
`src/index.js` and `src/utils.js` are not edited. Adding a preferences module
must not turn into rewriting an unrelated program.

The demo preference exists so that "persists across sessions" is verifiable
by a human reloading the page, rather than only by tests.

## Testing

Node's built-in runner: `node --test`, no packages added. Requires Node 18 or
newer.

Assumption: the development environment runs Node 18+; validate by running
`node --version` before implementation begins, and fall back to a minimal
hand-rolled assertion script if it does not hold.

Tests construct instances via `createPreferences({ storage: fakeStorage })`,
where `fakeStorage` is a small object implementing `getItem`, `setItem`,
`removeItem`, `key`, and `length` over a `Map` — and able to throw on demand.
No browser and no DOM shim.

Coverage:

1. Round trip for each supported type: string, finite number, boolean,
   `null`, array, plain object.
2. `get` on an unset key returns the fallback, and `undefined` when no
   fallback is given.
3. Namespacing: the underlying storage key is `prefs:<name>`; `keys()`
   returns unprefixed names and ignores unrelated entries in the same
   storage.
4. `set(key, undefined)` removes the key and returns `true`.
5. A cyclic value leaves the store unchanged and returns `false`.
6. `NaN` reads back as `null` — asserting the documented contract, not
   pretending otherwise.
7. A corrupt stored value makes `get` return the fallback and leaves the
   entry present.
8. A storage that throws on the construction probe yields
   `isPersistent === false`, and get/set still work in memory.
9. A storage that throws only on a later `setItem` makes that `set` return
   `false`, and the subsequent `get` returns the overlay value rather than
   the stale persisted one.
10. `remove` clears both the durable entry and the overlay.

Manual verification for the integration: serve the directory, toggle dark
mode, reload, confirm the setting survives; then restart the browser and
confirm it survives that too.

## Files touched

| File | Change |
|---|---|
| `prefs.js` | New. The preferences module. |
| `test/prefs.test.js` | New. The test suite. |
| `src/package.json` | New. One line, pins `src/` to CommonJS. |
| `package.json` | Add `"type": "module"` and a `test` script. |
| `index.html` | `type="module"`; add the toggle control. |
| `app.js` | Import and apply the theme preference. |
| `src/index.js`, `src/utils.js` | Not edited. |

## Out of scope

- Cross-device or server-backed preferences.
- Any credential, token, or "remember me" persistence.
- Linting and formatting tooling; end-to-end and fuzz testing.
- A bundler.
- Change-notification APIs and cross-tab live updates.
- Refactoring the unrelated `src/` Node program.
