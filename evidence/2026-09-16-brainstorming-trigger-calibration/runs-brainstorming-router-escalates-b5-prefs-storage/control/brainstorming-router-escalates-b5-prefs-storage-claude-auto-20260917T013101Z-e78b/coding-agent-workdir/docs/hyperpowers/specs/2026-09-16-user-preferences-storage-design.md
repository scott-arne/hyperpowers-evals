# User Preferences Storage — Design

Date: 2026-09-16
Status: Approved design, pending implementation plan

## Problem

The webapp has no persistence of any kind. Every page load starts from a blank
login form, and there is nowhere for user-facing settings to live. We want user
preferences that survive a browser session so that settings the user chooses
once are still in effect the next time they open the app.

## Scope

In scope:

- A new browser-side preferences module with a declared schema, typed defaults,
  and validation.
- Persistence to `localStorage` under a single key.
- Wiring into the existing login form so the feature is observable: a remembered
  username and a light/dark theme.
- Zero-dependency unit test infrastructure using Node's built-in test runner.

Out of scope:

- The Node module under `src/` (`index.js`, `utils.js`). It is an unrelated
  CommonJS greeting stub with no settings, and this work does not touch it.
- Server-side or cross-device preference sync.
- Any change to authentication behavior. `login()` remains the existing stub.
- A general settings screen or preferences UI beyond the two controls described
  below.

## Decisions

These were settled during brainstorming and are not open questions.

1. **Surface: browser, backed by `localStorage`.** The login form is the only
   interactive surface in the repo. "Persists across sessions" means surviving a
   tab close.
2. **Fixed schema with defaults**, not a generic key-value bag. The module owns
   the list of valid keys, their defaults, and their validators. Retrofitting
   validation onto data already sitting in users' browsers is expensive, so the
   schema exists from the first commit.
3. **Tooling: `node:test` with an injected storage backend**, no new
   dependencies. The injection seam is what makes browser storage code testable
   under Node, and it is worth having regardless of testing.

## Architecture

### File layout

| Path | Status | Purpose |
|---|---|---|
| `preferences.mjs` | new | The preferences module |
| `test/preferences.test.mjs` | new | Unit tests |
| `app.js` | modified | Reads and writes preferences; wires up UI |
| `index.html` | modified | Adds the two controls, theme styling, module script tag |
| `package.json` | modified | Adds the `test` script |

`preferences.mjs` lives at the repo root alongside `app.js`, because the root is
where the browser code lives. `src/` is the separate Node module and stays
untouched.

### Why `.mjs`

The module has two consumers: the browser (via `<script type="module">`) and
Node's test runner. Node imports `.mjs` as an ES module natively, regardless of
`package.json`. The alternative — adding `"type": "module"` to `package.json` —
would reinterpret every `.js` file in the repo as ESM and break
`src/index.js`'s `require('./utils')`. The `.mjs` extension gets one file format
serving both consumers with no collateral damage.

### Storage layout

All preferences live under a single `localStorage` key:

- Key: `webapp:preferences`
- Value: a JSON object mapping preference names to values, e.g.
  `{"rememberedUsername":"alice","theme":"dark"}`

One key rather than one key per preference. This means a single read and a
single write per operation, makes the whole store trivially clearable, keeps the
`localStorage` namespace clean, and leaves room to add a `version` field if the
schema ever needs migration. Per-preference keys would make partially-written,
mutually-inconsistent state representable.

## Public API

```js
export const SCHEMA = {
  rememberedUsername: { default: "",      validate: v => typeof v === "string" },
  theme:              { default: "light", validate: v => v === "light" || v === "dark" },
};

export function createPreferences(storage = globalThis.localStorage) {
  // returns { get, set, reset, all }
}
```

### `createPreferences(storage?)`

Factory returning a preferences instance. `storage` is any object implementing
the `getItem(key)` / `setItem(key, value)` / `removeItem(key)` subset of the Web
Storage API. Defaults to `globalThis.localStorage`.

If no usable storage is available — `globalThis.localStorage` is absent, or
touching it throws, as in some privacy modes — the instance falls back to an
in-memory object with the same interface. Preferences then work normally for the
lifetime of the page and simply do not persist. Callers never have to
special-case this.

### `get(key)`

Returns the stored value for `key` if one is present and passes its validator,
otherwise the schema default. Never returns `undefined` for a valid key.

### `set(key, value)`

Validates and persists. Returns `true` when the value was written, `false` when
the write was rejected by the storage backend.

### `reset(key?)`

With a key, removes that preference so subsequent reads return its default.
With no argument, clears the entire store.

### `all()`

Returns a plain object containing every schema key mapped to its effective
value — stored-and-valid, or default. Useful for applying all preferences at
page load in one pass.

## Error handling

The governing rule: **bad data degrades to defaults; bad code throws.**

Stored data is untrusted. It can be edited by hand, left over from an older
version of the app, or corrupted. None of those may break the page.

| Situation | Behavior |
|---|---|
| Stored JSON fails to parse | Entire store treated as empty; all keys return defaults |
| Stored value fails its validator | That key returns its default; sibling keys are unaffected |
| Stored data contains an unknown key | Ignored on read; dropped on the next write |
| `get`, `set`, or `reset` called with a key not in `SCHEMA` | Throws `Error` |
| `set` called with a value failing its validator | Throws `Error` |
| `storage.setItem` throws (quota exceeded, private mode) | Caught; `set` returns `false` |
| `storage.getItem` throws | Caught; treated as an empty store |

The distinction is deliberate. A key or value the *programmer* supplied wrongly
is a defect that should surface loudly at development time. A value that
*storage* supplied wrongly is an expected runtime condition and must degrade
silently to a working default.

A preferences failure must never prevent the user from logging in.

## UI wiring

Without a caller the module is unobservable, so the login form uses it.

### `index.html`

- Add a **"Remember me"** checkbox (`#remember-me`) inside the login form.
- Add a **theme toggle** button (`#theme-toggle`) outside the form.
- Add a small `<style>` block defining the default appearance and a
  `[data-theme="dark"]` rule, so the toggle produces a visible change.
- Change `<script src="app.js">` to `<script type="module" src="app.js">`.

### `app.js`

On page load:

1. Create the preferences instance.
2. Read `theme` and set it as `data-theme` on the `<html>` element.
3. Read `rememberedUsername`; if non-empty, pre-fill `#username` and check
   `#remember-me`.

On theme toggle click: flip between `light` and `dark`, apply it to
`<html data-theme>`, and persist immediately.

On successful login — meaning the existing `login()` stub returned
`{ success: true }` — store the username if "Remember me" is checked, and
`reset("rememberedUsername")` if it is not.

### Security constraint

**The password is never stored, persisted, or passed to the preferences
module.** Only the username is remembered. This is a hard constraint on the
implementation, not a preference.

## Testing

Add to `package.json`:

```json
"scripts": { "test": "node --test" }
```

`test/preferences.test.mjs` exercises the module against a Map-backed fake
storage object implementing `getItem` / `setItem` / `removeItem`. No browser and
no dependencies required.

Cases:

1. An empty store returns the schema default for every key.
2. `set` then `get` round-trips a valid value.
3. A value persists across a fresh `createPreferences` over the same storage —
   this is the "survives a session" property.
4. Corrupt JSON in storage returns defaults for every key rather than throwing.
5. A single invalid stored value falls back to its default while a valid sibling
   key still returns its stored value.
6. `get` and `set` with a key absent from `SCHEMA` throw.
7. `set` with a value failing its validator throws, and does not modify the
   store.
8. A `setItem` that throws causes `set` to return `false` rather than
   propagating.
9. `reset(key)` restores that key's default; `reset()` clears everything.
10. With no storage available, the in-memory fallback supports get/set for the
    life of the instance.

## Consequences and risks

- `localStorage` is origin-scoped and per-browser. Preferences do not follow a
  user across devices or browsers. This is understood and accepted; cross-device
  sync would require a server and is out of scope.
- A remembered username is mildly sensitive: anyone with access to the browser
  profile can read it. This is the standard, expected behavior of a "Remember
  me" checkbox, and it is opt-in via an unchecked-by-default box.
- Adding a preference later means editing `SCHEMA`. That is the intended cost of
  the fixed-schema decision.
- Switching `app.js` to a module script makes it load deferred rather than
  synchronously. The existing code already attaches its submit handler after the
  form element is parsed, so behavior is unchanged, but the implementation
  should confirm the handler still binds.

## Assumptions

- Assumption: the login form is the only surface that needs preferences in the
  foreseeable term; validate by revisiting if a second consumer appears.
- Assumption: `light` and `dark` are the only themes needed; validate by
  extending the `theme` validator if a third is requested.
