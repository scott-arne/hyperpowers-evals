# Persistent Session Identity — Design

Date: 2026-09-16
Status: awaiting review

## Problem

The request was "add a `userId` parameter to the login function so we can track
who logged in." `login()` has exactly one call site — the submit handler in
`app.js` — and nothing there has a user ID to pass. The form collects a username
and a password; `login()` is a stub that returns `{ success: true, user: username }`
without contacting `API_ENDPOINT`.

The follow-up clarified the real requirement: the identity must work across the
app, persist beyond a single call, and be readable by forms that do not exist
yet. That is a session store, not a parameter. A caller-supplied `userId` could
not satisfy it — the caller would have to invent the value, which identifies an
attempt rather than a person.

## Decisions

Each was confirmed with the maintainer during brainstorming.

| Decision | Choice | Why |
|---|---|---|
| Backend | Stub, async-shaped | `login()` returns a Promise resolving a placeholder `userId`. The async boundary is the expensive-to-reverse change; paying for it now, with one call site, is the cheapest it will ever be. |
| Persistence | `sessionStorage` | Survives refresh and in-app navigation; cleared when the tab closes. Keeps the blast radius of a shared machine or an XSS bug to one tab session. Swapping to `localStorage` later is a one-line change behind the store's interface. |
| Sharing | Native ES modules | `<script type="module">`, no bundler. Later forms `import` instead of depending on script load order. |
| Record shape | `{ userId, username, loginAt }` | "Track" requires a timestamp; `loginAt` is also the precondition for session expiry later, without a migration. |
| Write path | `login()` writes (approach A) | One write path, so a caller cannot forget to persist and the stored `username` cannot drift from the one that authenticated. |

## Architecture

Three modules, each with one job.

### File extensions

The two new modules are named `.mjs`, not `.js`. Without `"type": "module"` in
`package.json`, Node treats a `.js` file as CommonJS; on Node 22.7+ it recovers
by detecting the ESM syntax and reparsing, so a `.js` module would still load —
but it emits a `MODULE_TYPELESS_PACKAGE_JSON` warning on every run and pays a
reparse cost. Verified on the Node 26.8.2 installed here. Adding
`"type": "module"` would silence that and simultaneously break `src/index.js`
and `src/utils.js`, which this design leaves untouched. `.mjs` is unambiguously
ESM on every Node version, needs no `package.json` change, and is irrelevant to
the browser, which goes by the `type="module"` attribute and the served MIME
type. `app.js` keeps its name — Node never loads it.

### `src/session.mjs`

The only code in the app that touches `sessionStorage`. Knows nothing about
login, forms, or the DOM.

```
getSession()              -> SessionRecord | null
getUserId()               -> string | null
setSession(record)        -> void
clearSession()            -> void
```

`SessionRecord` is `{ userId: string, username: string, loginAt: string }`,
where `loginAt` is an ISO 8601 timestamp. Stored as JSON under the single
storage key `"session"`.

Reads return `null` for "not logged in" — never `undefined`, never a partially
populated object. One shape for callers to check matters when the callers are
forms nobody has written yet.

### `src/auth.mjs`

`login(username, password)` and `validateForm(formData)`, moved out of `app.js`.
`validateForm` is unchanged. `login` becomes `async`. Holds `API_ENDPOINT`.
Imports `session.mjs`. No DOM access, which is what makes it testable.

`login()` resolves `{ success: true, userId, username, loginAt }`.

### `app.js`

DOM wiring only: read the inputs, call `validateForm`, `await login(...)`, log
the result. Imports from `./src/auth.mjs`. Loaded via
`<script type="module" src="app.js">`.

## Data flow

Submit handler reads `#username` and `#password` → `validateForm` → on valid,
`await login(username, password)` → `login` generates the stub `userId`, builds
`{ userId, username, loginAt }`, calls `setSession(record)`, resolves
`{ success: true, ...record }` → handler logs the result.

Any later form calls `getUserId()` and receives the persisted value with no
login involved.

### The stub `userId`

`crypto.randomUUID()`, generated inside `login()`. It stands in for a
server-issued ID and is the one line that changes when the real API call lands.
`loginAt` is `new Date().toISOString()`.

`crypto.randomUUID()` requires a secure context — it is available on `https://`
and on `http://localhost`, but not on a plain-HTTP non-localhost origin. Local
development over `localhost` and any real deployment over HTTPS both satisfy
this.

## Error handling

All three failure points live in `session.mjs`.

**`sessionStorage` unavailable.** Access throws in some privacy modes and in
sandboxed iframes — checking `typeof sessionStorage` is insufficient because the
access itself throws. Every storage call is wrapped. On failure the store falls
back to an in-memory value for the page's lifetime and logs once. The app
degrades to "works but does not survive a refresh" rather than a dead submit
handler.

**Corrupt or foreign data under the key.** `getSession()` parses inside a `try`
and validates that `userId` and `username` are non-empty strings. On any
failure it clears the key and returns `null`. A bad record never propagates as a
half-populated session.

**Quota exceeded on write.** Caught and logged; the in-memory value still
updates, so the current page keeps working.

`login()` has no failure path worth designing while it is a stub — it always
resolves success. When the real `fetch` lands, rejection handling goes there,
and the handler's `await` already has the right shape for it.

## Testing

Unit tests via `node --test` (built into Node, no dependencies — it fits a repo
that has stayed dependency-free). Tests live in `test/` as
`test/session.test.mjs` and `test/auth.test.mjs`. A `"test": "node --test"`
script is added to `package.json`. Coverage:

- `session.mjs` round-trip: `setSession` then `getSession` returns an equal record.
- `getUserId()` returns `null` when nothing is stored.
- Corrupt data: a non-JSON string under the key yields `null` and the key is cleared.
- Incomplete data: a record missing `userId` yields `null` and the key is cleared.
- Storage unavailable: with a throwing storage, `setSession`/`getSession` still
  round-trip in memory and do not throw.
- `auth.mjs`: a successful `login()` persists a record whose `username` matches
  the argument and whose `userId` is a non-empty string.

Node has no `sessionStorage` global, so `session.mjs` resolves its backing store
through a small internal seam that defaults to `globalThis.sessionStorage` and
accepts an override for tests. This is the same seam the storage-unavailable
fallback needs, so it is not test-only scaffolding.

`app.js` is not unit tested — it is DOM wiring, and testing it would require a
DOM harness the maintainer declined.

## Global constraints

- Unit-test infrastructure (`node --test`) is set up as part of this work.
- No linter or formatter, no end-to-end tests, no fuzz or mutation testing.
- No new runtime or development dependencies. The repo stays dependency-free.

## Out of scope

- **A subscribe/observer mechanism on the store.** Nothing needs to react to
  login state yet. YAGNI.
- **Session expiry.** `loginAt` makes it possible later without a migration.
- **A logout UI.** `clearSession()` exists as the API; no button consumes it yet.
- **`src/index.js` and `src/utils.js`.** The CommonJS pair is unrelated, is not
  loaded by the page, and is left untouched. Note that `src/` will then hold
  both CommonJS and ESM files; adding `"type": "module"` to `package.json`
  would break the pair, so this design does not add it. Browser-loaded ESM does
  not need that field.
- **The real API call to `API_ENDPOINT`.** The async shape is built for it; the
  call is not.

## Consequences

`<script type="module">` means `index.html` can no longer be opened by
double-clicking it — browsers block module loads over `file://`. The page must
be served, e.g. `python3 -m http.server` or `npx serve`. This follows from the
ES-modules decision and is stated here so it is not discovered later. The README
gains a line recording how to serve the page.

## Assumptions

- Assumption: no code outside this repository calls `login()` or depends on its
  synchronous return value; validate by confirming with the maintainer that this
  fixture app is self-contained.
- Assumption: later forms will read the identity rather than write a second,
  differently-shaped one; validate when the first such form is specified.
