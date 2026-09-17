# User Preferences Storage — Design

Date: 2026-09-16
Status: approved for planning

## Problem

The browser half of this project (`index.html` + `app.js`) keeps no state
between visits. A returning user retypes their username every time. More
generally, the project has nowhere to put a user-facing setting: there is no
persistence layer, no settings state, and no module that would own one.

This design adds a client-side preferences facility and uses it to deliver the
first concrete preference: an opt-in remembered username.

## Scope

In scope:

- A preferences storage module, `prefs.js`, owning one `localStorage` key.
- One registered preference pair: `rememberUsername` (the opt-in flag) and
  `username` (the remembered value).
- A "Remember me" checkbox in the login form, and the wiring in `app.js` that
  hydrates from, and writes to, the preferences module.
- A `node:test` unit suite for `prefs.js` and an `npm test` script.

Out of scope:

- The Node CLI under `src/`. It is unrelated to the browser half, nothing
  crosses the boundary, and it gets no preferences in this work.
- Any server-side or cross-device preference sync.
- Storing anything about the password, in any form.
- Theming, layout, or any other preference. The facility is built so these are
  cheap to add later; none are added now.
- Lint, formatting, e2e, and DOM-level test infrastructure (see Global
  Constraints).

## Decisions Already Settled

These were resolved during brainstorming and are inputs to the plan, not open
questions.

1. **Browser webapp, not the CLI.** The human partner selected the
   `index.html`/`app.js` surface.
2. **The stored preference is a remembered username**, to prefill the login
   form. Never the password.
3. **Opt-in via a "Remember me" checkbox**, not automatic. Silently persisting
   an identifier is a surprising default, and a shared machine would leak the
   previous user's username with no way to have declined.
4. **Client-side `localStorage`.** A remembered username must be readable
   *before* authentication, so it cannot be stored server-side keyed to the
   account. `sessionStorage` does not survive a browser session, and a cookie
   would transmit the username on every request for no benefit.
5. **A single versioned document**, rather than one key per preference or a
   narrow no-abstraction feature module. Per-key storage offers no natural
   place to hang a version, so a future shape change would mean sniffing each
   key to guess its vintage; a narrow feature module would not deliver the
   requested facility, and preference #2 would force the skipped refactor.
6. **`prefs.js` stays a classic script, not an ES module.** `app.js` is loaded
   by a plain `<script src>` tag and uses top-level function declarations.
   Converting to `type="module"` would break opening `index.html` over
   `file://`.

## Global Constraints

- **Zero runtime and development dependencies.** `package.json` has none
  today; this work adds none. Tests use Node's built-in `node:test` and
  `node:assert`.
- **No build step and no bundler.** Scripts are loaded directly by `<script
  src>` tags and must work when `index.html` is opened over `file://`.
- **Tooling set up as part of this work: unit tests only.** A `test/` directory,
  an `npm test` script, and the `prefs.js` suite. Lint, formatting, e2e, and
  jsdom were considered and explicitly declined.
- **Match existing style.** `src/` uses CommonJS; `app.js` uses browser globals
  and double-quoted strings. Follow the local pattern in each file.
- The password must never be read into, passed to, or written by the
  preferences layer.

## Architecture

One new module plus small edits to the two existing browser files.

```
index.html  --loads--> prefs.js   (owns localStorage; no DOM knowledge)
            --loads--> app.js     (owns DOM; calls Prefs, never localStorage)
```

The boundary is strict in one direction: `app.js` never touches `localStorage`
directly, and `prefs.js` never touches the DOM. That is what makes the storage
layer testable in Node with nothing but a fake `localStorage` object, and it
keeps the key name and document shape a private detail of one file.

### Dual export

`prefs.js` ends with:

```js
if (typeof module !== "undefined") { module.exports = Prefs; }
```

so the same source serves as a browser global and as a Node-requirable module.
This mirrors the CommonJS already used in `src/`.

## Data Model

A single `localStorage` key, `webapp.preferences`, holding:

```json
{
  "version": 1,
  "values": { "rememberUsername": true, "username": "alice" }
}
```

`version` is the schema version of the document, currently always `1`. It
exists so a later shape change has a defined migration point; it is the one
element of this design that serves a future need rather than a present one,
retained because it is a single JSON field now and an unpleasant retrofit once
real preferences exist in real browsers.

### Registry

A defaults table doubles as the set of valid preference names. A name absent
from it is not a preference.

| Name | Type | Default | Validator |
|---|---|---|---|
| `rememberUsername` | boolean | `false` | strict boolean |
| `username` | string | `""` | string, length <= 256 |

The length cap bounds what a buggy or hostile write can park in storage.

Adding a future preference means one row in each of the defaults and validator
tables, and nothing else.

## Module Interface

| Call | Behavior |
|---|---|
| `Prefs.get(name)` | Returns the stored value, or the default when absent or invalid. |
| `Prefs.set(name, value)` | Validates, then persists the whole document. |
| `Prefs.clear(name)` | Resets one preference to its default. |
| `Prefs.clearAll()` | Removes the `webapp.preferences` key entirely. |

## Error Handling

The governing rule is an asymmetry: **bad calling code throws; bad stored data
degrades silently.** A misspelled preference name is a defect that should
surface immediately during development. A mangled `localStorage` entry is a
condition that occurs in the wild and must never break a login page.

| Condition | Behavior |
|---|---|
| `get`/`set` with an unregistered name | Throw |
| `set` with a value failing its validator | Throw |
| Key absent | All defaults |
| `JSON.parse` fails | All defaults; the next write overwrites the garbage |
| Document is not an object, or `values` is missing or not an object | All defaults |
| A single field fails its validator | Only that field falls back to its default; sibling fields survive |
| Unknown keys present in stored `values` | Ignored on read, dropped on the next write |
| `version` is anything other than `1` (higher, lower, missing, or not a number) | All defaults — only the known version is readable, and a future shape must not be guessed at. When a version 2 exists, this row becomes "run the migration for any known older version; default for anything else." |
| `localStorage` access throws (private mode, storage disabled) | Fall back to an in-memory store for the lifetime of the page; preferences stop persisting and the app keeps working |
| `setItem` throws (quota exceeded) | Caught; the in-memory value is retained; no crash |

Per-field fallback is deliberate: it removes the main drawback of a
single-document model, since one corrupt field now costs only itself rather
than every preference.

## Data Flow

### Hydrate, on page load

`app.js` runs after the DOM is parsed (its `<script>` tag is at the end of
`<body>`, unchanged). It reads `rememberUsername`, sets the checkbox to match,
and when true, prefills the username input from `username`.

### Persist, on successful login

Gated on `result.success`, not on form submission, so a rejected login does not
durably remember a mistyped username. `login()` is currently a stub that always
returns `{ success: true }`, so this distinction has no observable effect today;
it is the correct shape for when the real `API_ENDPOINT` call replaces the stub,
and it costs nothing now.

When the checkbox is checked: write `rememberUsername = true` and `username`.

### Opt out, on checkbox change

Unchecking clears the stored username and flag immediately, on the `change`
event — not at the next submit. A user who unchecks the box and leaves without
logging in has made an explicit opt-out, and the identifier must already be gone
at that point. Deferring the clear to a submission that may never happen would
leave it in storage.

## Testing

`node:test` with `node:assert`, run via `npm test` (`node --test`). `prefs.js`
is required directly with a fake `localStorage` object installed as a global, so
the whole storage layer is exercised as pure logic — no browser, no jsdom, no
dependencies.

Cases:

1. Empty storage returns every default.
2. `set` then `get` round-trips a value.
3. A malformed JSON document yields defaults and does not throw.
4. A non-object document, and a document missing `values`, yield defaults.
5. A wrong-typed field falls back while its siblings retain their stored values.
6. A document whose `version` is not `1` yields defaults — covering a higher
   version, a missing `version`, and a non-numeric one.
7. `get` and `set` throw on an unregistered preference name.
8. `set` throws on a value failing its validator, including an over-length username.
9. `clear(name)` restores that preference's default and leaves others alone.
10. `clearAll()` removes the key.
11. A `localStorage` whose property access throws is survived: the module
    degrades to in-memory and does not throw.
12. A `localStorage` whose `setItem` throws is survived.
13. No value written to storage ever contains the password. This encodes the
    invariant from Global Constraints as an executable assertion.

### Known coverage gap

The `app.js` DOM wiring — hydrate, persist, and opt-out — is not unit-tested,
because doing so requires jsdom and the project is holding at zero
dependencies. These are roughly a dozen lines of glue over a fully tested
module. They are verified manually:

- Open `index.html`, check "Remember me", log in, reload: the username is
  prefilled and the box is checked.
- Uncheck the box, reload: the field is empty and the box is unchecked.
- With the box unchecked from a clean state, log in and reload: nothing is
  remembered.

This gap is accepted, not overlooked. Adding jsdom would close it.

## Files Touched

| File | Change |
|---|---|
| `prefs.js` | New. The preferences module. |
| `index.html` | Add the "Remember me" checkbox; load `prefs.js` before `app.js`. |
| `app.js` | Hydrate on load, persist on successful login, clear on opt-out. |
| `test/prefs.test.js` | New. The unit suite above. |
| `package.json` | Add a `scripts.test` entry running `node --test`. |
| `.gitignore` | Already created alongside this spec. Ignores `docs/hyperpowers` and `docs/superpowers`. No further change needed. |

## Risks and Assumptions

- **A remembered username is a stored identifier.** It sits in plaintext
  `localStorage`, readable by any script on the origin. This is accepted: the
  value is low-sensitivity, the checkbox makes it visible and refusable, and
  the password is never involved. It is worth restating if a future preference
  carries anything more sensitive, which would change this calculus.
- **Assumption: the real `login()` will report failure via a falsy
  `result.success`.** The current stub always succeeds, so the failure path is
  unexercised. Validate when the real API call replaces the stub, by confirming
  a rejected login leaves stored preferences untouched.
- **`version` is speculative.** No migration exists or is planned. It is
  retained because it is one field now and expensive later; if the project
  would rather not carry it, removing it reduces this design to a
  single-key store with no other change.
