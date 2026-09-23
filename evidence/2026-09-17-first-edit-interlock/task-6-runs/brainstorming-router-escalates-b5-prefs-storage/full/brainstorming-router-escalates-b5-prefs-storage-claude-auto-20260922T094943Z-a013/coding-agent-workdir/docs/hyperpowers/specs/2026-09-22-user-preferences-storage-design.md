# User Preferences Storage — Design

Date: 2026-09-22
Status: Approved (design), pending spec review

## Problem

The webapp (`index.html` + `app.js`) has no way to remember anything between
page loads. Every visit starts from a blank form. There is no storage layer of
any kind in the repository, so any setting the app might want to keep — now or
later — has nowhere to go.

This design adds a small browser-local preferences store and proves it end to
end with one real preference.

## Scope

In scope:

- A `preferences.js` module providing get/set/remove/all over an injected
  storage backend, with defaults and non-throwing failure behavior.
- One preference wired end to end: remember the entered username across page
  loads.
- Unit test infrastructure (`node:test`) and tests covering the module's edge
  cases.

Out of scope:

- Any server, database, preferences API, or cross-device synchronization.
- Real authentication. `login()` in `app.js` remains the existing stub; this
  design does not change it.
- A settings panel or any preference beyond the one named above.
- The Node-side files `src/index.js` and `src/utils.js`. They are unrelated to
  the webapp and are not modified.

## Decisions

### Storage venue: browser `localStorage`

Preferences persist per device and per browser. They do not follow a user
across devices and are lost if the user clears site data.

The alternative — preferences stored server-side against a user account — was
rejected as out of proportion. It requires a backend, a database, a
preferences endpoint, and real authentication, none of which exist here. The
current `login()` returns `{ success: true, user: username }` for any input,
so there is no user identity to key preferences against.

This choice is not a dead end: a local store can later become the client-side
cache in front of a synced store, behind the same module API.

### Module format: browser global plus CommonJS export guard

`preferences.js` attaches its factory to `window.Preferences` when a `window`
exists, and also assigns to `module.exports` behind a `typeof module !==
'undefined'` guard so the Node test runner can require it.

The alternative, ES modules, was rejected for a specific cost: `<script
type="module">` is fetched under CORS rules, so `index.html` would stop working
when opened directly from disk via `file://` and would require a local web
server to run. The repository today is plain `<script>` tags, CommonJS, and no
build step; this choice matches that and preserves double-click-to-run.

Consequence: `index.html` must load `preferences.js` before `app.js`, because
`app.js` reads the global when it runs.

### Storage layout: one key holding one JSON object

All preferences live under a single `localStorage` key, `webapp.prefs`, whose
value is a JSON object mapping preference names to values.

The alternative, one `localStorage` key per preference, avoids read-modify-write
overwrites between simultaneously-open tabs. That risk is accepted: this is a
single-page app with a handful of settings, and a lost write requires two tabs
writing different preferences within the same moment. The layout is an internal
detail of the module, so changing it later does not affect callers.

### Password handling

The password is never written to storage under any circumstance. The
"remember" preference persists the username only.

`localStorage` is readable by any script executing on the page, so a persisted
password would be exposed to any third-party script or successful XSS. This
constraint holds regardless of future preferences added to the store.

## Architecture

### `preferences.js`

A factory, not a singleton, so tests can construct instances against fake
backends:

```js
createPreferences({ storage, defaults })
```

- `storage` — an object implementing `getItem`, `setItem`, and `removeItem`.
  The browser passes `window.localStorage`. Tests pass fakes. Injection is what
  makes the failure modes below testable in Node without a DOM shim.
- `defaults` — an object of preference name to default value.

Returned API:

| Method | Behavior |
|---|---|
| `get(key)` | Stored value if present, else the default, else `undefined`. |
| `set(key, value)` | Persists the value. Returns `true` on success, `false` if the write could not be persisted. |
| `remove(key)` | Deletes the stored value. The default applies again on the next `get`. |
| `all()` | Defaults merged under stored values, as a new object. |

### Data flow

On construction the module probes the storage backend once, reads
`webapp.prefs`, and holds the parsed object in memory as the working copy.
`get` and `all` read only from that copy. `set` and `remove` update the copy
first and then attempt to write the whole object back as JSON. Reads therefore
never depend on storage being healthy after construction, and a failed write
never leaves the in-memory copy disagreeing with what the caller just set.

### `app.js` integration

- On page load: read `rememberUsername` and `username`; if remembering, prefill
  the username field and check the checkbox.
- On form submit: if the checkbox is checked, store `rememberUsername: true`
  and the entered username. If unchecked, store `rememberUsername: false` and
  remove the stored username.
- Validation and the `login()` stub are unchanged. Preference handling must not
  alter whether or how login proceeds.

### `index.html`

- A `<script src="preferences.js">` tag before the existing `app.js` tag.
- A labeled checkbox with id `remember-username` inside the login form.

## Error handling

Preferences are non-essential. The module must never prevent the page from
loading or the form from submitting.

| Condition | Behavior |
|---|---|
| Storage unavailable (private browsing, disabled storage, restricted `file://` context). Detected at construction by writing a probe key, reading it back, comparing, and removing it; a throw or a mismatched read-back both mean unavailable. | Mark the instance non-persistent for its lifetime and skip all further backend writes. All methods work against the in-memory copy; nothing survives a reload. No throw. |
| Stored value is not parseable JSON, or parses to something other than a plain object. | Treat as empty. Defaults apply. The bad value is overwritten on the next successful `set`. No throw. |
| `setItem` throws (quota exceeded, or Safari private-mode quota of zero). | Keep the new value in memory so the current page session behaves correctly; `set` returns `false`. No throw. |
| `get` called with a key that has no stored value and no default. | Return `undefined`. No throw. |

## Testing

`test/preferences.test.js`, using `node:test` and `node:assert`. A `"test":
"node --test"` script is added to `package.json`. No dependencies are added.

Three fake backends drive the cases: a working in-memory fake, one that throws
on `setItem`, and one that throws on any access.

Cases to cover:

- `get` returns a stored value; returns the default when unset; returns
  `undefined` for an unknown key with no default.
- `set` persists such that a newly constructed instance over the same backend
  reads the value back — this is the assertion that stands in for "survives a
  reload".
- `remove` deletes the stored value and restores the default.
- `all` merges defaults under stored values without mutating the defaults
  object.
- Corrupted JSON in `webapp.prefs` yields defaults rather than a throw.
- A non-object JSON value (for example `"[]"` or `"null"`) yields defaults
  rather than a throw.
- An unavailable backend still supports get/set within the instance, and does
  not throw at construction.
- A quota-exceeded `setItem` returns `false` while leaving the value readable
  in memory.

The `app.js` wiring is verified manually in a browser: enter a username with
the box checked, reload, confirm the field is prefilled; uncheck, submit,
reload, confirm it is empty. Manual verification is proportionate here because
the wiring is a handful of DOM calls and the repository has no DOM test
infrastructure; introducing one for this would exceed the scope agreed.

## Files

| File | Change |
|---|---|
| `preferences.js` | New. The module. |
| `test/preferences.test.js` | New. Unit tests. |
| `index.html` | Modified. Script tag and checkbox. |
| `app.js` | Modified. Prefill on load, persist on submit. |
| `package.json` | Modified. `test` script. |
| `src/index.js`, `src/utils.js` | Untouched. |

## Risks and assumptions

- Assumption: the preferences store is only ever consumed by this page.
  Validate via the next preference added — if a second consumer appears, the
  single-blob layout and the global attachment both warrant revisiting.
- Accepted: preferences do not survive clearing site data, and do not follow a
  user to another browser or device. This is inherent to the chosen venue and
  was agreed explicitly.
- Accepted: cross-tab simultaneous writes can lose one preference update.
