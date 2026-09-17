# User Preferences Storage — Design

Date: 2026-09-17
Status: approved in chat, pending spec review
Branch: `feature/webapp-enhancement`

## Problem

The app has no way to remember anything between visits. `index.html` and
`app.js` implement a login form whose `login()` is a stub; there is no
storage, no settings, and no configuration module anywhere in the repo. Any
future feature that wants to remember a user choice has nowhere to put it,
and would invent its own `localStorage` key on the spot.

This spec defines a preferences store: a small, generic key/value module that
persists user settings in the browser across sessions, with an interface that
can later be pointed at a server without changing its callers.

## Scope

In scope:

- A generic, schema-free key/value preferences store with an async API.
- A swappable storage-adapter seam, with a `localStorage` adapter and an
  in-memory adapter.
- Per-user namespacing, with an anonymous namespace before login.
- Graceful degradation when browser storage is unavailable or full.
- One real consumer: remembering the last username and pre-filling the login
  field.
- Unit-test infrastructure using Node's built-in test runner.

Out of scope:

- Any server-side or account-scoped storage. The adapter seam exists so this
  can be added later; no backend work happens here.
- Real authentication or session persistence. `login()` remains a stub.
- A settings UI. Callers define their own preference keys as they need them.
- Cross-tab change subscriptions or a reactive event bus.
- Linting and formatting tooling (explicitly deferred).
- Any change to `src/index.js` or `src/utils.js`, which are unrelated Node
  code.

## Decisions

Each of the following was chosen explicitly during brainstorming; the
rationale is recorded because the alternatives are all defensible.

**Generic key/value store, no fixed schema.** The app has no settings today,
so enumerating them would be guesswork. Callers own their own keys.

**Device-scoped `localStorage`, behind an async interface.** The async
signature is the expensive thing to retrofit — it changes every call site —
so it is paid for now, while the adapter seam itself is small. Chosen over
synchronous `localStorage` (cheaper today, costs a full call-site sweep
later) and over a server backend (no backend, session, or auth exists).

**Per-username namespaces, anonymous before login.** A server preferences
API is inherently per-account, so a store with no identity would mismatch
the adapter swap it was designed to enable. Also avoids users of a shared
browser inheriting each other's settings.

**One JSON document per namespace, not one key per preference.** A document
gives whole-namespace reads in a single parse, an obvious versioning hook,
and a shape that maps onto a future `GET`/`PATCH` API. Per-key storage was
rejected because reading a whole namespace would mean prefix-scanning every
key in `localStorage`. The document's known weakness — lost updates across
tabs — is addressed by read-modify-write (below).

**Never throw on environment failure; expose `isPersistent()`.** A theme
that fails to save must not break a login form. The flag preserves the
information so a UI can warn, without forcing every caller into a `catch`.

**ES modules.** Native imports, no build step, and Node's test runner can
import the same files the browser does. Accepted cost: `index.html` must be
served over HTTP; opening it via `file://` no longer works.

**Anonymous and logged-in preferences stay separate.** Auto-merging on login
requires a conflict policy with no evidence behind it. `all()` plus `set()`
makes a caller-side merge simple if one is ever wanted.

## Architecture

Three new files, browser-only:

| File | Responsibility |
|---|---|
| `src/prefs/store.js` | Public API, namespacing, defaults, read-modify-write, versioning, adapter selection and fallback |
| `src/prefs/local-storage-adapter.js` | Serialize to and from `window.localStorage`; detect unusable storage |
| `src/prefs/memory-adapter.js` | Per-page in-memory storage; the degraded fallback and the test double |

Plus `src/prefs/package.json` containing exactly `{"type": "module"}`. This
scopes ESM to this directory so Node parses these files as modules, without
adding a top-level `"type": "module"` that would break the CommonJS
`src/index.js` and `src/utils.js`.

### Adapter interface

The entire contract a future backend must satisfy:

```js
{
  async load(namespace) -> object | null,   // the stored document, or null
  async save(namespace, doc) -> void
}
```

Two methods suffice because the store always reads and writes whole
documents. Both are async so a network-backed adapter needs no signature
change.

### Public API

```js
const prefs = createPreferences();            // selects the best available adapter
const prefs = createPreferences({ adapter }); // or inject one (tests)
prefs.setUser(username);             // null/omitted -> anonymous namespace
await prefs.get(name, fallback);     // fallback returned when unset
await prefs.set(name, value);
await prefs.remove(name);
await prefs.all();                   // whole namespace as a plain object
prefs.isPersistent();                // false once degraded to memory
```

`isPersistent()` is synchronous: it describes the environment, not stored
state, and a UI deciding whether to show a "settings won't be saved" warning
should not have to await it.

`createPreferences` takes an optional `{ adapter }`. When omitted it probes
the environment and selects the `localStorage` or memory adapter; when
supplied it uses that adapter as-is and skips the probe. This is how the
tests drive the store without a browser.

### Storage layout

- Key: `prefs:anon`, or `prefs:user:<encodeURIComponent(username)>`. The
  encoding prevents usernames containing `:` from colliding across
  namespaces.
- Value: `JSON.stringify({ v: 1, values: { … } })`.
- The version lives in the document rather than the key so a future
  migration can read old data and upgrade it in place.
- Preference values are anything `JSON.stringify` round-trips.

### Data flow

`set(name, value)`:

1. `adapter.load(namespace)` — re-read immediately before writing.
2. Parse; on failure or `null`, start from an empty document.
3. Apply the change to `values`.
4. `adapter.save(namespace, doc)`.

Step 1 on every write is what makes the document layout safe across tabs.
Without it, a tab holding a stale document erases changes another tab made
in the meantime. Under `localStorage` the underlying read is synchronous, so
the cost is negligible.

`get(name, fallback)` loads the document and returns `values[name]` when the
key is present, otherwise `fallback`. A stored value of `null` is a real
value and is returned as-is; only an absent key yields the fallback.

## Error handling

The store distinguishes environment failures from programmer errors.

**Environment failures never throw:**

- *Storage unavailable* — at construction, the store writes, reads, and
  deletes a sentinel key inside a `try`. If that throws (private mode,
  storage disabled) or the API is missing, it uses the memory adapter and
  `isPersistent()` returns `false`.
- *Quota exceeded on write* — the store switches to the memory adapter for
  the remainder of the page, `isPersistent()` becomes `false`, and the
  operation still resolves. The value stays readable for this page; it will
  not survive a reload.
- *Corrupt document* — a parse failure is treated as an empty namespace with
  a `console.warn`. The corrupt value is overwritten by the next write.

**Programmer errors reject:** `set()` with `undefined`, a function, or a
non-string/empty `name`. These are bugs in calling code; swallowing them
would mean a value silently never persists with nothing to debug.

**Version rules:** a document whose `v` is lower than the current version
runs through migrations (none exist at v1). A document with an unrecognized
or newer `v` is treated as empty, and the next write overwrites it.

## Integration

`app.js` changes in three places:

1. Import `createPreferences` and construct the store at module scope.
2. On page load, `await prefs.get('lastUsername', '')` and, when non-empty,
   pre-fill `#username`.
3. In the submit handler, after a successful `login()`, first
   `await prefs.set('lastUsername', username)` — still in the anonymous
   namespace — and only then `prefs.setUser(username)`. The order matters:
   reversing it would write `lastUsername` into the per-user namespace,
   where the login form cannot read it before the user has logged in.

`index.html` changes in one place: `<script src="app.js">` becomes
`<script type="module" src="app.js">`.

`package.json` gains `"scripts": { "test": "node --test" }`. No
dependencies are added.

`src/index.js` and `src/utils.js` are not touched.

The last username is written to the *anonymous* namespace, because it must
be readable before anyone has logged in. This is intentional and is the one
preference that is deliberately not per-user.

## Testing

Node's built-in `node:test` and `node:assert`, run with `npm test`. No
dependencies, consistent with the repo's current zero-dependency state.

Store logic, against the memory adapter (no browser needed):

- `get` returns the fallback for an unset key, and a stored `null` as `null`.
- `set` then `get` round-trips strings, numbers, booleans, arrays, objects.
- `remove` deletes a key; `get` then returns the fallback.
- `all` returns the whole namespace and reflects writes and removals.
- Values written under one username are invisible under another and under
  the anonymous namespace.
- `setUser` switches namespaces without losing the previous one's values.
- A concurrent-write simulation: mutate the document behind the store's back
  between its load and save, and assert the foreign change survives — this
  is the read-modify-write guarantee.
- `set` rejects for `undefined`, a function, and an invalid name.
- A document with an unrecognized `v` reads as empty.

`localStorage` adapter, against a fake:

- Round-trips a document through a minimal fake `localStorage`.
- Writes under the expected key, including a username needing encoding.
- A fake whose `setItem` throws a quota error causes fallback to memory,
  `isPersistent() === false`, and no rejection.
- A fake whose constructor probe throws selects the memory adapter from the
  start.
- Malformed JSON in storage reads as an empty namespace.

Not covered by automated tests: real-browser reload behavior. Verified
manually by serving the directory, logging in, reloading, and confirming the
username pre-fills.

## Known limitations

- **Persistence is per logged-in session, not per reload.** The app has no
  session persistence, so after a refresh the user is anonymous again and
  sees the anonymous namespace until they log in again — at which point
  their preferences reappear. Fixing this properly requires real auth, which
  is out of scope.
- **Preferences are device-scoped.** They do not follow a user to another
  browser or machine until a server adapter exists.
- **`localStorage` is readable by any script on the origin.** Nothing
  secret belongs in preferences; this store must never hold credentials or
  tokens.
- **`file://` no longer works** for opening `index.html`, a consequence of
  ES modules. Any static server works.

## Assumptions

- Assumption: the target browsers support ES modules and `localStorage`
  natively (no transpilation or polyfill expected). Validate by confirming
  the intended browser support baseline with the project owner before
  release; the fallback path already covers `localStorage` being absent.
- Assumption: no future requirement will need preferences larger than the
  ~5MB `localStorage` origin budget. Validate by reviewing when the first
  large preference value is proposed; the quota path degrades safely in the
  meantime.
