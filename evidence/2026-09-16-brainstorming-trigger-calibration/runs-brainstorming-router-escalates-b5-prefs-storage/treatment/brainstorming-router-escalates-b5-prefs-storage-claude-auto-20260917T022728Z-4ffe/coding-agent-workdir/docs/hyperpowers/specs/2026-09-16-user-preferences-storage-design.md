# User Preferences Storage — Design

Date: 2026-09-16
Status: approved (approach and design approved in brainstorming; spec pending review)
Branch: `feature/webapp-enhancement`

## Problem

The webapp has no way to remember anything between visits. Every setting a
user might express is lost on reload, because no persistence layer exists
anywhere in the repository. This adds one: a small preferences module the
browser app reads and writes, plus a single real preference wired into the
login page to prove the round-trip.

## Scope

In scope:

- A preferences module (`prefs.mjs`) with a declared schema, defaults,
  validation, and storage-failure handling.
- One preference set wired into the login page: "remember my username".
- Unit tests via `node:test`, runnable with `npm test`.

Out of scope:

- A settings UI with multiple controls.
- Server-side or cross-device preferences.
- Preferences for the Node CLI under `src/`.
- Lint/format tooling and end-to-end browser tests.

## Decisions

These were settled during brainstorming; each records the alternative rejected
so a future reader knows the choice was made rather than defaulted into.

| Decision | Chosen | Rejected alternative |
|---|---|---|
| Surface | Browser `localStorage` | Node CLI config file; server-side per account (needs a backend that does not exist — `login()` is a stub) |
| Scope | Module + one real preference | Module alone (no consumer to validate the interface); module + settings UI (larger) |
| Module system | ES modules, no bundler | CommonJS (needs a bundler for the browser); plain globals (weak test isolation) |
| Tooling | Unit tests only (`node:test`) | Lint/format; Playwright e2e |
| Data model | Versioned single blob | One key per preference; blob + cache + change events |

### Why a versioned single blob

One `localStorage` key holds every preference. Reads parse once and merge over
defaults; writes serialize the whole object. Per-key storage would isolate
corruption to a single preference, but it makes enumeration and `reset()` a
prefix scan over the entire store and multiplies the parse-and-validate sites.
This app has no use for that isolation.

The `version` field costs nothing today and is what makes a future rename or
type change a migration rather than a guess.

### Why not a cache and change events

A write-through cache with a change emitter is the right shape once several
components read the same preference, and it is the only shape that handles
another browser tab writing the same key. For one checkbox and one input it is
speculative, and a cache adds a staleness bug class that does not currently
exist. The interface below is a compatible starting point: adding a cache or
events later changes no call site.

## Module design

File: `prefs.mjs` at the repository root, alongside `app.js`.

### Extension and module resolution

The module uses the `.mjs` extension rather than `.js`. Root `package.json`
has no `"type"` field, so Node treats `.js` as CommonJS — which `src/index.js`
and `src/utils.js` depend on. Adding `"type": "module"` would break both, and
renaming them is churn unrelated to this task. `.mjs` makes the file ESM for
Node's test runner while leaving `src/` untouched.

Verified: `python3 -m http.server` serves `.mjs` as `text/javascript`, so the
browser accepts it.

`app.js` keeps its `.js` name. The browser decides ESM from the script tag's
`type="module"` attribute, and Node never loads `app.js`, so the CommonJS
question does not arise for it.

### Interface

```js
createPrefs(storage)   // storage defaults to localStorage, or an in-memory
                       // fallback when it is unavailable
  .get(name)           // validated value, or the schema default
  .set(name, value)    // persists; returns true if it reached storage
  .all()               // every preference, defaults filled in
  .reset()             // clears the stored blob
  .persistent          // false when running on the memory fallback
```

A default instance bound to `globalThis.localStorage` is also exported for the
page to import directly.

`createPrefs` taking its storage as a parameter is what makes the module
testable with no browser and no dependency: tests pass a `Map`-backed fake
implementing `getItem`/`setItem`/`removeItem`.

### Schema

The schema is the single source of truth for what a preference is:

```js
const SCHEMA = {
  rememberUsername: { default: false, isValid: (v) => typeof v === "boolean" },
  lastUsername:     { default: "",    isValid: (v) => typeof v === "string"  },
};
```

### Storage shape

One key, `"prefs"`:

```json
{ "version": 1, "values": { "rememberUsername": true, "lastUsername": "ada" } }
```

### Caller errors versus stored-data errors

These are deliberately different, and the distinction is the module's main
invariant:

- **Caller errors throw.** `get`/`set` with a name not in the schema, or `set`
  with a value the schema rejects, throw. These are programming mistakes;
  failing loudly beats silently storing garbage or reading a typo'd key
  forever.
- **Bad stored data never throws.** Anything already in `localStorage` is
  outside the program's control and is handled by degrading to defaults. A
  preferences layer must never be able to break the login form.

## Error handling

Every case degrades to working defaults:

| Case | Behavior |
|---|---|
| `localStorage` missing, or throwing on property access (Safari private mode) | Caught at construction; in-memory fallback; `persistent === false` |
| Corrupt JSON in the blob | Defaults |
| Valid JSON that is not an object (`"null"`, `"[1,2]"`, `"7"`) | Defaults |
| Unrecognized `version` | Defaults |
| A value failing its schema check | That key falls back to its default; other keys unaffected |
| Unknown keys present in storage | Ignored; dropped on the next write |
| `QuotaExceededError` on write | Caught; `set` returns `false` |

## Page integration

`index.html`:

- Add a "Remember my username" checkbox to the login form.
- Change the script tag to `<script type="module" src="app.js"></script>`.

Module scripts are deferred by default, so the DOM is ready when `app.js`
runs; no `DOMContentLoaded` wrapper is needed.

`app.js`:

- Import the default prefs instance.
- On load: if `rememberUsername` is true, prefill the username input from
  `lastUsername` and check the box.
- On successful submit: if the box is checked, store `rememberUsername: true`
  and the username; if not, store `false` and clear `lastUsername` —
  unchecking actively erases rather than leaving a stale value behind.

Its functions stop being globals once the file is a module. Nothing outside
the file references them, so nothing breaks.

## Security

**The password is never read into, passed to, or stored by this module.** The
schema makes this structural: there is no key it could occupy, and `set`
rejects unknown names. A test asserts no stored key ever contains the password.

Storing the username means it sits in `localStorage` in plain text, readable
by any script on the origin and by the next person at a shared machine. This
is the standard trade for a "remember me" feature and was accepted explicitly
during brainstorming. It is also precisely why the password stays out.

## Testing

`test/prefs.test.mjs`, using `node:test` and `node:assert`, run via
`npm test` (`node --test`). This adds the first `scripts` entry to
`package.json`. No dependencies are added.

Cases, all against the fake storage:

1. Defaults returned when storage is empty.
2. `set` then `get` round-trips each preference.
3. **Values survive a fresh `createPrefs` over the same storage** — this is the
   across-sessions claim, and the reason the feature exists.
4. Corrupt JSON falls back to defaults.
5. Valid-but-not-an-object JSON falls back to defaults.
6. Unrecognized `version` falls back to defaults.
7. One invalid value falls back to its default without disturbing other keys.
8. Unknown keys in storage are ignored and dropped on the next write.
9. `get`/`set` with an unknown name throws.
10. `set` with a schema-rejected value throws.
11. A storage that throws `QuotaExceededError` makes `set` return `false`
    rather than propagating.
12. Storage that is entirely unavailable yields a working instance with
    `persistent === false`.
13. `reset()` clears stored values and returns to defaults.
14. The password cannot be persisted: `set("password", "hunter2")` throws, and
    after a normal remember-username write the full serialized contents of the
    fake storage contain no occurrence of the password string.

Manual verification, since there is no e2e tooling: serve with
`python3 -m http.server`, tick the checkbox, submit, reload, and confirm the
username is prefilled.

## Files touched

| File | Change |
|---|---|
| `prefs.mjs` | New — the module |
| `test/prefs.test.mjs` | New — unit tests |
| `index.html` | Add checkbox; `type="module"` on the script tag |
| `app.js` | Import prefs; prefill on load; persist on submit |
| `package.json` | Add `scripts.test` |
| `.gitignore` | New — exclude `docs/hyperpowers` |
| `src/index.js`, `src/utils.js` | Untouched |

## Global constraints

- No new runtime or dev dependencies; no bundler; no build step.
- `src/` and its CommonJS convention stay untouched.
- Tests accompany the module (`node:test`), written test-first.
- No passwords persisted, ever.
