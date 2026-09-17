# User Preferences Storage — Design

Date: 2026-09-16
Status: Approved (design); not yet implemented
Branch: `feature/webapp-enhancement`

## Problem

The webapp has no persistence of any kind. Every visit to the login page starts
from an empty form, and there is no mechanism for any part of the app to
remember a user-level setting between sessions. Additional forms are expected
to need the same capability, so the immediate need (remembering a username) has
to be solved behind an interface those forms can reuse rather than as a
one-off.

## Scope

**In scope:** a browser-side preferences module with a declared schema,
persisted to `localStorage`, plus its first two consumers — a remembered
username and a "Remember me" opt-out on the login form — and unit tests for the
module.

**Out of scope:** preferences for the Node CLI in `src/`; any shared
browser/Node preferences layer; cross-device or server-side sync; UI
preferences such as theme; cross-tab live synchronisation.

## Global Constraints

These apply to every task in the resulting implementation plan.

- **Unit tests are required.** Node's built-in `node:test`, run via
  `node --test`, wired as `npm test`. Test files live in `test/`.
- **Zero runtime and dev dependencies.** The repo currently has none, no
  `node_modules`, and no lockfile. Nothing in this work may introduce one.
  `node:test` was chosen specifically to preserve this.
- **No build step, bundler, or transpiler.** The page loads plain classic
  `<script>` tags. Do not convert the page to ES modules.
- **No linter or formatter is being introduced** in this work (considered and
  explicitly declined). Match the existing style in `app.js`: two-space indent,
  double-quoted strings, semicolons, `const`/`let`.
- **No end-to-end test infrastructure** (considered and explicitly declined).
- **The password is never persisted.** No schema entry, no code path.

## Approach

A single JSON blob under one `localStorage` key, eager-loaded and validated at
construction, kept in memory, and written through on change.

Two alternatives were considered and rejected:

- **Key-per-preference** (one `localStorage` key each). Its only real advantage
  is that two tabs editing *different* preferences cannot clobber each other.
  It pays for that with no atomic multi-write, per-key enumeration for
  migrations, and a keyspace scan to implement "clear all". The migration cost
  is certain; the two-tab conflict is not.
- **Blob plus cross-tab sync** (a `storage` event listener and a `subscribe()`
  API). The correct destination if multi-tab editing ever matters, but no v1
  consumer needs reactivity. The chosen approach upgrades into it without
  changing any call site: same key, same schema, plus a listener.

## Architecture

### New file: `preferences.js`

Repo root, alongside `app.js`. Contains the schema, the factory, and the
browser wiring. Loaded by a `<script>` tag placed **before** `app.js` in
`index.html`.

### Schema

Every preference is declared with a default and a validator:

```js
const PREFERENCES_SCHEMA = {
  rememberUsername: {
    default: true,
    validate: (value) => typeof value === "boolean",
  },
  rememberedUsername: {
    default: "",
    validate: (value) => typeof value === "string" && value.length <= 256,
  },
};
```

A later form adds a preference by adding one entry. That is the entire
extension mechanism.

The 256-character bound on `rememberedUsername` is a defensive cap against a
malformed or hostile stored value, not a product rule about username length.

### Factory

```js
createPreferences(schema, storage)
```

`storage` is any object with `getItem`/`setItem`/`removeItem`. Taking it as a
parameter, rather than reaching for `window.localStorage` internally, is what
makes the module testable in Node with no DOM and no dependencies.

Returns an object with four methods:

| Method | Behavior |
|---|---|
| `get(key)` | The validated stored value, else the key's default. Never returns `undefined`. Never throws for data reasons. |
| `set(key, value)` | Validates, updates memory, then persists. |
| `reset(key)` | Restores one preference to its default and persists. |
| `clear()` | Restores all defaults and removes the storage entry. |

`get`, `set`, and `reset` throw on a key absent from the schema.

### Storage format

One key, `app.preferences`:

```json
{ "version": 1, "values": { "rememberUsername": true, "rememberedUsername": "alice" } }
```

`version` is the migration seam. In this version the load path only checks it
for equality with the current version; the first time a preference changes
shape, a migration step keys off it rather than inferring the on-disk shape.

### Load-time rules

1. A key in storage but absent from the schema is dropped, and is not written
   back on the next save. This is how a removed preference gets collected.
2. A key present in both but failing its validator falls back to that key's
   default. The rest of the blob is preserved — one bad value must not cost the
   user their other settings.
3. Unparseable JSON, a payload that is not a plain object, `null`, or a
   `version` that does not match the current version all load as all-defaults.

## Error Handling

The module distinguishes caller defects from environmental failures, and treats
them oppositely.

**Throws — caller defects:**

- `get`/`set`/`reset` with a key not in the schema.
- `set` with a value that fails the key's validator.

**Never throws — environmental failures:**

- A failed write. `set` updates the in-memory value first, then attempts the
  write; a throwing `setItem` (quota exceeded, storage disabled) is caught and
  reported with `console.warn`. The in-memory state stays consistent for the
  life of the page and no call site needs a try/catch around a write.
- Storage being unavailable entirely. The browser wiring resolves storage
  through `resolveStorage()`, a guard that returns `window.localStorage` when
  it is usable and an in-memory stand-in otherwise. Preferences then work
  normally for the life of the page and simply do not survive it; the login
  form cannot tell the difference.

`resolveStorage()` must wrap **property access**, not just method calls:
some browsers throw a `SecurityError` on merely reading `window.localStorage`
(for example, a page embedded in an iframe with third-party storage blocked).
A guard that only wraps `setItem` will throw at load in that environment.

## Login Form Integration

### `index.html`

- Add `<script src="preferences.js"></script>` before the existing `app.js`
  tag.
- Add a "Remember me" checkbox (`id="remember-me"`) with a label, between the
  password field and the submit button.

### `app.js`

**On load:** set the checkbox from `rememberUsername`. If that preference is
true and `rememberedUsername` is non-empty, prefill `#username`.

**On submit,** after validation passes and `login()` returns `success: true`:

- If the checkbox is checked: persist `rememberUsername = true` and
  `rememberedUsername = <username>`.
- If unchecked: persist `rememberUsername = false` and reset
  `rememberedUsername` to its default, clearing any previously stored value.

Saving is gated on `result.success` rather than on submission, so the behavior
is correct once `login()` stops being a stub that unconditionally returns
`{ success: true }`.

### Privacy rationale

A remembered username with no opt-out is a real problem on a shared machine:
the next person at the keyboard sees the previous user's name prefilled with no
way to clear it. The checkbox exists to make that recoverable, and unchecking
it must actively clear the stored value rather than merely stop writing new
ones.

## Testing

### Module loading

`preferences.js` must load both from the page and from Node without a bundler,
so it ends with guarded exports and guarded wiring:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createPreferences, PREFERENCES_SCHEMA };
}
if (typeof window !== "undefined") {
  window.preferences = createPreferences(PREFERENCES_SCHEMA, resolveStorage());
}
```

`module.exports` is already the pattern in `src/utils.js`, so this introduces no
new convention — only an existing one applied conditionally.

### Harness

`test/preferences.test.js`, using `node:test` and `node:assert`. Add
`"scripts": { "test": "node --test" }` to `package.json`.

Tests construct the factory against fake storage: a `Map`-backed stand-in, plus
variants that throw on `getItem` or `setItem` to exercise the degrade paths.

### Required cases

1. Empty storage yields every default.
2. `set` then `get` round-trips, and the serialized bytes in storage match the
   documented format including `version`.
3. Unparseable JSON loads as all-defaults.
4. A non-object payload (a JSON string, a number, `null`) loads as all-defaults.
5. An unrecognised `version` loads as all-defaults.
6. One field failing its validator falls back to that field's default while its
   neighbours retain their stored values.
7. A storage key absent from the schema is dropped and is not written back on
   the next save.
8. `get`, `set`, and `reset` each throw on an unregistered key.
9. `set` throws on a value failing its validator, and the stored value is
   unchanged.
10. A throwing `setItem` does not propagate; the in-memory value is updated and
    a warning is emitted.
11. Storage that throws on access falls back to memory; `get`/`set` still work.
12. `reset(key)` restores one default without disturbing others.
13. `clear()` restores all defaults and removes the storage entry.

### Not covered by automated tests

The `app.js` glue — prefill, checkbox state, save-on-success — is DOM-coupled
and stays manually verified. Adding jsdom or Playwright to cover roughly a
dozen lines of wiring was considered and declined.

Manual verification steps: load the page, submit with the box checked, reload
and confirm the username prefills; uncheck, submit, reload, and confirm the
field is empty and the box stays unchecked.

## Files Touched

| File | Change |
|---|---|
| `preferences.js` | New. Schema, factory, storage guard, guarded exports/wiring. |
| `test/preferences.test.js` | New. The 13 cases above. |
| `index.html` | Add the `preferences.js` script tag and the "Remember me" checkbox. |
| `app.js` | Prefill on load; persist on successful login. |
| `package.json` | Add the `test` script. |
| `.gitignore` | Add `docs/hyperpowers` (spec/plan docs stay uncommitted). |

## Risks and Assumptions

- **Assumption:** the two-tab clobber inherent to a single-blob model is
  acceptable. Validate by revisiting if multi-tab use is ever reported; the
  documented upgrade to a `storage`-event listener requires no call-site
  changes.
- `localStorage` is per-device and per-browser-profile. A user on a second
  machine sees defaults. This is understood and accepted for this version.
- A remembered username is mildly identifying to anyone with access to the
  device. The checkbox is the mitigation; no stronger measure (encryption,
  expiry) is proposed, since the value is already visible in the form it
  prefills.
