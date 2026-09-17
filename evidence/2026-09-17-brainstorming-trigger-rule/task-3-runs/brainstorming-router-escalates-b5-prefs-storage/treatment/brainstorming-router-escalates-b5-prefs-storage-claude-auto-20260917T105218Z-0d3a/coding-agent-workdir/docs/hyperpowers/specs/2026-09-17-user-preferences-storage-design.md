# User Preferences Storage — Design

Date: 2026-09-17
Status: approved (design), pending implementation plan

## Problem

The webapp has no persistence of any kind. Nothing the user adjusts on the
page survives a reload, because there is nothing to adjust and nowhere to put
it. The request is to add preferences storage so UI settings persist across
sessions.

## Scope

**In scope:** UI preferences only — presentation settings with no user-identifying
content. A storage module, plus one preference (`theme`) wired end to end so the
module's API is exercised by a real caller rather than designed against
imagined usage.

**Explicitly out of scope:**

- Any persistence of user-identifying data, including the login form's
  username. This was considered and rejected during design: it puts an
  identifier into persistent client storage and carries a security boundary
  question that plain presentation settings do not.
- Credentials. Nothing in this design touches the password field.
- Account-scoped or cross-device preferences. Those require a backend; the
  `login()` function in `app.js` is a stub that performs no network call, so
  account-scoped storage would imply building real authentication first.
- A general settings panel. One preference and one control.
- The Node code under `src/`. It is disjoint from the browser page and is not
  modified.

## Existing code

- `index.html` — static page, classic `<script>` tags, no build step, no
  stylesheet.
- `app.js` — browser globals (`API_ENDPOINT`, `login`, `validateForm`) and a
  top-level submit handler on `#login-form`. No exports, no storage use.
- `src/index.js`, `src/utils.js` — CommonJS Node hello-world, unrelated to the
  page.
- `package.json` — no dependencies, no `scripts` block.
- No tests, no linter, no formatter, no existing testing pattern.

## Architecture

### Module boundary

A new `prefs.js` at the repo root, beside `app.js`. `index.html` loads it via
`<script src="prefs.js"></script>` **before** `app.js`, so `Prefs` is defined
when `app.js` evaluates. No bundler and no module system, matching the page as
it exists.

The file defines a factory plus a default instance:

```js
function createPrefs(storage) { /* ... */ }
const Prefs = createPrefs(globalThis.localStorage);
```

and ends with a guarded CommonJS export:

```js
if (typeof module !== "undefined") {
  module.exports = { createPrefs, Prefs };
}
```

In the browser that line is inert and `Prefs` is a global, consistent with how
`login` and `validateForm` are already exposed. Under Node the tests `require`
the file and call `createPrefs(fakeStorage)` with an in-memory stand-in. This
is what makes the module testable without jsdom or any dependency.

### Storage backend

`localStorage`, under a single key `webapp.prefs` holding one JSON object
(e.g. `{"theme":"dark"}`).

Rejected alternatives: `sessionStorage` is cleared when the tab closes, which
defeats the requirement; cookies transmit the data to the server for no
reason; IndexedDB is asynchronous machinery disproportionate to a handful of
scalar settings.

One key rather than one key per preference keeps a read to a single parse and
makes the stored state inspectable as a unit in devtools.

### Data model

A single declaration table at the top of the module:

```js
const SCHEMA = {
  theme: { default: "light", valid: ["light", "dark"] },
};
```

Each entry declares the preference's default and what counts as a valid stored
value. This table is the one place that answers "what settings exist, and what
are their defaults."

Considered and rejected: a thin `get(key, fallback)` wrapper with no schema.
It is about thirty lines smaller, but restates each default at every call site
so they drift as soon as two places read the same setting, and it validates
nothing. Also rejected: an observable store with subscriptions and cross-tab
`storage`-event sync — real value, but there is one consumer; the schema store
extends into it later without changing callers.

### API

- `Prefs.get(name)` — returns the stored value if present and valid, otherwise
  the declared default.
- `Prefs.set(name, value)` — validates against the schema, then persists.

**Caller errors versus untrusted data.** These are two different situations and
the module treats them differently, deliberately:

- *Untrusted stored data* — anything read back out of `localStorage` — never
  throws. It falls back to the default, per the rule below.
- *Caller errors* — a `name` not present in `SCHEMA`, passed to either `get` or
  `set`, or a `value` passed to `set` that is outside that preference's `valid`
  set — throw. These are bugs in the calling code, not conditions a user can
  produce, and a silent no-op would hide a typo'd preference name behind
  behavior that looks like a working default.

## Failure behavior

The governing rule: **`get` returns the declared default unless storage holds a
value that validates.** One rule absorbs every failure mode rather than each
needing separate handling:

| Condition | Result |
|---|---|
| Storage key absent | default |
| Stored JSON unparseable | default |
| Parsed root is not an object | default |
| Value outside the schema's `valid` set | default |
| Preference removed in a later build | default |

None of these throw.

Additional decisions:

- **Storage access is individually wrapped, not probed once.** Reading
  `localStorage` can throw outright (Safari private browsing, disabled site
  data) and writes can throw on quota. Each read and write is wrapped, with an
  in-memory object as fallback, so preferences still work for the current page
  session when nothing can be persisted. The feature degrades to "does not
  survive reload" rather than breaking the page.
- **Unknown keys in storage are preserved on write.** A newer build's
  preference sitting in storage must not be destroyed when this build calls
  `set`.
- **No version field.** Validate-or-default already serves as the migration
  mechanism for scalar settings: a renamed or retyped preference falls back to
  its default automatically. A version counter would add a migration ladder
  with nothing to migrate. Deliberately omitted, not overlooked; if
  preferences later hold structured values, that is when it earns its place.

## The wired preference

`theme`, values `light` and `dark`.

A new `styles.css` defines two custom properties on `:root`, overridden under
`[data-theme="dark"]`, applied to `body`. Approximately fifteen lines. Note
that the page currently has no CSS at all, so wiring a theme necessarily
introduces a stylesheet; this is an accepted cost of the choice, held to the
minimum, with no design system or component styling.

Control: `<label><input type="checkbox" id="theme-toggle"> Dark mode</label>`,
placed **outside** `#login-form` so it cannot participate in form submission.

Wiring in `app.js`:

- `applyTheme()` sets `document.documentElement.dataset.theme` from
  `Prefs.get("theme")`.
- On load, the theme is applied **and** the toggle's `checked` state is
  initialized from the same stored value. Both are required: applying the
  theme while leaving the control at its HTML default reads to the user as
  the setting having failed to save.
- A `change` listener on the toggle calls `Prefs.set("theme", ...)` then
  `applyTheme()`.

The existing submit handler, `login()`, and `validateForm()` are unchanged.

## Testing

Tooling decision: unit tests via Node's built-in `node:test`. Chosen because
it keeps `package.json` dependency-free, matching the repo's current state.
`package.json` gains `"scripts": { "test": "node --test" }`.

A linter/formatter and end-to-end tests were offered during design and not
selected.

`test/prefs.test.js` exercises the module against a fake storage object:

1. Returns the declared default when storage is empty.
2. Round-trips a valid value through `set` then `get`.
3. Returns the default when the stored value is outside the valid set.
4. Returns the default when stored JSON will not parse.
5. Returns the default when the parsed root is not an object.
6. Preserves unknown keys across a write.
7. Does not throw when `getItem` / `setItem` themselves throw, and falls back
   to in-memory behavior.
8. Throws on caller errors: an unknown preference name passed to `get` or
   `set`, and an out-of-range value passed to `set`.

**Known coverage gap:** the DOM wiring in `app.js` and `index.html` has no
automated coverage, since the selected tooling includes neither jsdom nor
end-to-end tests. Its verification is manual: open `index.html`, toggle to
dark, reload, confirm the setting persists and the toggle reflects it.

## Files touched

| File | Change |
|---|---|
| `prefs.js` | new — factory, schema, get/set, storage wrapping |
| `styles.css` | new — theme custom properties |
| `test/prefs.test.js` | new — module unit tests |
| `index.html` | stylesheet link, `prefs.js` script tag, theme toggle |
| `app.js` | `applyTheme()`, load-time init, toggle change listener |
| `package.json` | `scripts.test` |
| `.gitignore` | new — ignore `docs/hyperpowers` |
| `src/**` | untouched |

## Notes on process

The Codex approach gate fired during design (a genuine data-model choice) and
returned an empty response. The approaches recorded above are the author's
alone, with no independent Codex input.
