# User Preferences Storage — Design

Date: 2026-09-16
Status: approved design, not yet implemented
Branch: `feature/webapp-enhancement`

## Problem

The webapp has no persistence of any kind. Every visit starts from an
identical blank state: the login form is empty, and there is no way for a
returning user to carry any choice across a page load. The request is to add
preferences storage so settings survive between sessions.

Two settings are in scope, chosen with the user:

1. **Remember username** — prefill the login form's username field on return.
2. **Theme** — a light/dark preference with a toggle control.

## Global Constraints

- **Storage is device-local.** Browser `localStorage` only. No backend, no
  network calls, no account scoping.
- **No new runtime dependencies.** `package.json` gains a `scripts` block and
  nothing else — no `dependencies`, no `devDependencies`.
- **Testing:** unit tests via Node's built-in `node:test`. No linter or
  formatter is introduced by this work. No end-to-end tests.
- **`src/` is out of scope.** The Node CLI in `src/index.js` and
  `src/utils.js` is untouched. Nothing crosses between the browser app and
  `src/` in either direction, and this work does not create such a link.
- **`login()` stays a stub.** No authentication work is in scope.

## Why device-local, and what it does not give you

`login()` currently returns `{success: true, user: username}` unconditionally
and never contacts `API_ENDPOINT`. There is no session, no token, and no
authenticated identity. Preferences therefore cannot be meaningfully scoped to
a user, and this design does not pretend otherwise: preferences belong to the
browser profile, not to a person.

Consequences, stated so they are not discovered later:

- Preferences do not follow a user to another browser, device, or profile.
- Two people sharing a browser profile share preferences.
- There is no security boundary. `localStorage` is readable by any script on
  the origin.

If a real backend arrives, syncing preferences to an account is separate work
with its own merge-conflict story. This design does not lay groundwork for it
beyond the `version` field described below.

## Architecture

Three new files, two modified.

| File | Change |
|---|---|
| `prefs.js` | New. The preferences module. |
| `styles.css` | New. Theme custom properties. |
| `test/prefs.test.js` | New. Unit tests for `prefs.js`. |
| `index.html` | Modified. Stylesheet link, pre-paint script, script tag, two checkboxes. |
| `app.js` | Modified. Wire the two checkboxes; one post-login hook. |
| `package.json` | Modified. Add a `scripts` block with `test`. |

### `prefs.js`

A classic script — no `type="module"`, no bundler — defining a single global
`Prefs`. This matches `app.js`, which already declares plain global functions
with no module system.

Public interface:

- `Prefs.get(key)` — the stored value, or the default if absent, unknown, or
  invalid. Never returns `undefined`.
- `Prefs.set(key, value)` — persist one preference.
- `Prefs.clear(key)` — reset one preference to its default.

Defaults are declared once, in this file:

```js
const DEFAULTS = { theme: "light", rememberedUsername: null };
```

`get` merges stored values over `DEFAULTS`, so a field that is missing from
storage — including a field added by a future version of the app reading an
older stored blob — resolves to its default rather than `undefined`.

### Data model

One `localStorage` key, `webapp.prefs`, namespaced to avoid collision with
anything else on the origin. Its value is a JSON object:

```json
{ "version": 1, "theme": "dark", "rememberedUsername": "ada" }
```

- `version` (number) — schema marker. **Written but not read in this
  version.** It exists so a future shape change has something to branch on.
  The current reader treats any unexpected content as "use defaults," so
  version 1 needs no migration logic.
- `theme` (string) — `"light"` or `"dark"`. Any other value is rejected on
  read (see below).
- `rememberedUsername` (string or null) — `null` means "not remembered."

A single blob rather than one key per setting, so writes are atomic and the
set of preferences and their defaults is declared in exactly one place.

## Error handling

Every branch here is a silent fallback. The governing principle: **a
preferences failure never breaks the page.** Preferences are a convenience and
hold nothing worth interrupting the user over. Nothing in this section
produces a user-facing error, an alert, or a thrown exception that escapes the
module.

| Condition | Behavior |
|---|---|
| `localStorage` access throws (Safari private mode, embedded/sandboxed contexts, blocked cookies) | Fall back to an in-memory object for the rest of the page's life. The app works normally; preferences do not survive the session. |
| Key absent | Return defaults. Not an error — this is the first-visit path. |
| `JSON.parse` throws | Treat as absent: return defaults, and overwrite on the next write. No partial recovery is attempted. |
| Parsed value is not a plain object (a string, array, or `null`) | Same as a parse failure. |
| `theme` holds an unrecognized value | Validate against `{"light", "dark"}` on read; anything else resolves to the default. Guards against hand-edited storage. |
| Write throws (quota exceeded) | Swallow the error; the in-memory value still updates so the current session stays self-consistent, even though nothing persisted. |

Note that storage access is wrapped at the point of access, not probed once at
startup — availability can differ between read and write, and a feature-detect
at load time would not catch a quota error later.

## UI behavior

### Theme

The page currently has no CSS whatsoever — no `styles.css`, no `<style>`
block, no `<link>`. Theming therefore starts by introducing a stylesheet.

`styles.css` defines CSS custom properties on `:root` for foreground,
background, and input colors, with overrides under `[data-theme="dark"]`.
Theme is applied by setting `document.documentElement.dataset.theme`. No
component needs to know the theme exists beyond consuming the properties.

**Load order is load-bearing.** `app.js` is loaded by a `<script>` tag at the
end of `<body>`. If the theme were applied there, the page would paint in
light and then visibly flip to dark — a flash of incorrectly themed content on
every load for every dark-mode user. To prevent it, `index.html` gains a small
inline script in `<head>` that reads the stored theme and sets `data-theme`
before the body renders.

That head script duplicates a minimal read of `localStorage` rather than
depending on `prefs.js`. This duplication is intentional and must carry a
comment explaining why: it has to run before any external script, so it cannot
wait for `prefs.js` to load. It is a few lines, and it must be independently
resilient — wrapped in its own `try`/`catch`, since an exception in `<head>`
before the body renders is the one place a preferences failure could plausibly
harm the page.

Resulting order in `index.html`:

1. `<link rel="stylesheet" href="styles.css">` in `<head>`
2. Inline pre-paint theme script in `<head>`
3. Body content, including the toggle
4. `<script src="prefs.js">`, then `<script src="app.js">`

A **"Dark mode" checkbox** in the body is wired in `app.js` to both
`Prefs.set("theme", ...)` and the `dataset.theme` update. Its checked state is
initialized from `Prefs.get("theme")` on load so it agrees with what the head
script already applied.

### Remember username

A **"Remember my username" checkbox** beside the login form, unchecked by
default.

- On **successful** `login()`, if the box is checked, store the username; if
  unchecked, clear it. Clearing on the unchecked path matters: otherwise
  unticking the box appears to do nothing until the next successful login,
  which reads as a bug and leaves data behind the user asked to remove.
- On page load, if `rememberedUsername` is non-null, prefill `#username` and
  pre-check the box.
- **The password is never stored, in any form.** Stated explicitly because
  "remember me" is ambiguous in the wild and this is a login form.
- Opt-in, and cleared immediately on untick, because a username is mild PII on
  a shared device.

### Out of scope

No change to `login()`, `validateForm()`, or the existing submit flow beyond a
single post-success hook for the remembered username.

## Testing

`prefs.js` is a classic script that assigns a global, so a Node test can
define a fake `localStorage` on `globalThis` and `require` the file directly.
This needs no test runner install, no DOM shim, and no dependencies — Node's
built-in `node:test` is sufficient. `package.json` gains
`"scripts": { "test": "node --test" }`.

Tests target the error-handling table, because every row there is a silent
fallback: a regression produces no error, just quietly wrong behavior. That is
the part of this design worth automated verification.

Cases to cover:

- Absent key returns defaults for both preferences.
- Round-trip: `set` then `get` returns the written value.
- Corrupt JSON returns defaults, and a later `set` overwrites cleanly.
- A parsed non-object (string, array) returns defaults.
- An unrecognized `theme` value returns `"light"`.
- Storage that throws on read falls back to in-memory and keeps working.
- Storage that throws on write leaves the in-memory value updated.
- `clear(key)` restores that key's default and leaves the other untouched.
- A stored blob missing a field resolves that field to its default.

The DOM wiring in `index.html` and `app.js` is verified by hand: load the
page, toggle dark mode, reload and confirm no flash of light theme; tick
remember-username, log in, reload and confirm the prefill; untick, reload, and
confirm the username is gone.

Deliberately not covered: the pre-paint flash is a rendering-timing property
that only a real browser can observe. Catching it automatically would mean
end-to-end infrastructure, which the user scoped out. It is on the manual
list instead.

## Risks and assumptions

- *Assumption:* the two chosen preferences are the whole near-term set.
  Validate by asking before adding a third — if preferences start
  proliferating, the single-blob shape and hand-verified DOM wiring both want
  revisiting.
- The duplicated read in the head script is the design's one knowing
  redundancy. If a third consumer of the theme value ever appears, that is the
  signal to reconsider the loading strategy rather than duplicate a third
  time.
- `version` is written but never read. It is dead weight until the first
  migration; it is included because adding it retroactively means guessing at
  the shape of un-versioned blobs already in users' browsers.
