# Anonymous Visitor ID — Design

Date: 2026-09-17
Status: approved (design), not yet implemented

## Problem

The request was "add a `userId` parameter to the login function so we can track
who logged in." The codebase has no user identifier to pass: the login form
collects only a username and a password (`index.html:9-10`), `login()`
(`app.js:4`) is a stub that never contacts `API_ENDPOINT`, and its single call
site (`app.js:23`) has nothing ID-shaped in scope.

Clarification established that the identifier must work across the whole app,
persist between visits, and be reachable by other forms added later. That makes
this a shared module with a persistence layer, not a parameter threaded through
one function.

## Decisions

Each was chosen by the project owner during brainstorming.

| Decision | Choice | Rejected alternatives |
|---|---|---|
| What the ID represents | Anonymous visitor ID, client-generated, persists indefinitely, identical before and after login | Per-session ID; server-issued authenticated user ID; anonymous ID linked to a user ID |
| Delivery | ES modules | Plain global script; dual CommonJS + global shim; adding a bundler |
| Consumer | Client-side only for now | Request body; cookie; third-party analytics SDK |
| Signature | Optional third parameter defaulting to `null` | Required parameter; options object |
| Module shape | Injectable-storage factory with a default bound instance | Lazy singleton touching `localStorage` directly; explicit bootstrap threading the ID as an argument |
| File extension | `.mjs` | `"type": "module"` in `package.json`; Vitest |
| Tooling | Lint + format, unit tests, static server script | End-to-end tests |

## Scope

In scope:

- `src/visitor-id.mjs` — new module owning ID generation and persistence.
- `app.js` — becomes an ES module; `login()` gains the optional third parameter;
  the call site supplies the visitor ID.
- `index.html` — `<script>` tag gains `type="module"`.
- `package.json` — scripts, devDependencies, `engines`.
- `eslint.config.mjs`, Prettier config — new.
- `test/visitor-id.test.mjs` — new.
- `README.md` — how to run locally.

Out of scope:

- Implementing the real `fetch` to `API_ENDPOINT`. `login()` stays a stub.
- Any change to `validateForm`.
- Any change to `src/index.js` or `src/utils.js`. They remain CommonJS and
  remain unreferenced by the page.
- ID rotation, expiry, cross-tab synchronization, consent gating, server-side
  correlation, and analytics event dispatch.

## Architecture

### `src/visitor-id.mjs`

Two exports:

```js
export function createVisitorIdStore(storage)
export function getVisitorId()
```

`createVisitorIdStore(storage)` returns `{ get() }`. The `storage` argument needs
only `getItem(key)` and `setItem(key, value)`, so a plain object literal
satisfies it in tests.

`getVisitorId()` is the default instance bound to `window.localStorage`, created
lazily at module scope. Call sites use it; tests use the factory.

**Data model.** One value: a v4 UUID string from `crypto.randomUUID()`, stored
under the `localStorage` key `visitorId`. No envelope, no timestamp, no version
field — a bare string, because nothing in the design needs more and a wrapper
would be a migration liability.

The key is unnamespaced. This is safe while the app is the only thing on its
origin; if that changes, prefix it.

**Resolution order for `get()`:**

1. Return the cached in-memory value if the store has one.
2. Otherwise read `storage.getItem("visitorId")`.
3. If that value is missing, empty, or not a well-formed UUID, generate a new
   one and persist it. "Well-formed" means matching
   `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
   — a v4 UUID specifically, since that is the only thing the module ever
   writes.
4. Cache the result in the store and return it.

**Invariant: `get()` never throws and never returns null or an empty string.**
This is the property the tests exist to protect. Tracking is a secondary
concern inside a login handler; it must not be able to break authentication.

**Degraded behavior.** `localStorage` throws in some private-browsing modes and
when quota is exhausted, and a stored value can be corrupt. In all such cases the
store falls back to an in-memory ID that lives for the page's lifetime. Tracking
degrades to per-page granularity rather than failing.

### `app.js`

Becomes an ES module with one import:

```js
import { getVisitorId } from "./src/visitor-id.mjs";
```

`login()` becomes:

```js
function login(username, password, userId = null) {
  console.log("Logging in:", username, "visitor:", userId);
  // Stub: would POST to API_ENDPOINT in real app
  return { success: true, user: username, userId };
}
```

The call site at `app.js:23` becomes
`login(username, password, getVisitorId())`.

The ID is resolved at the call site, not inside `login()`. `login()` stays a
function of its arguments, which keeps it testable and keeps the new parameter
meaningful; a `login()` that fetched the ID itself would make the parameter
pointless.

Defaulting to `null` rather than leaving it undefined gives un-updated callers an
explicit absent value.

### `index.html`

`<script src="app.js">` becomes `<script type="module" src="app.js">`.

Two consequences:

- `login`, `validateForm`, and `API_ENDPOINT` stop being globals. Nothing in the
  repository references them from outside `app.js`, so nothing breaks, but
  console access to them changes.
- Module scripts are deferred, so the top-level `document.getElementById` call
  now runs after DOM parsing instead of racing it.

### Data flow

```
page load
  -> app.js module evaluated (deferred)
  -> submit handler registered
user submits
  -> validateForm({username, password})
  -> valid: getVisitorId()
       -> cached? return it
       -> localStorage read; missing/corrupt/throwing? generate + persist (or fall back in-memory)
  -> login(username, password, visitorId)
  -> console.log of the result, including userId
```

Nothing leaves the browser.

## Error handling

| Condition | Behavior |
|---|---|
| No stored ID | Generate, persist, return |
| Stored ID is empty or malformed | Generate, persist over it, return |
| `getItem` throws | Generate in-memory ID, return, do not persist |
| `setItem` throws (quota, private mode) | Return the generated ID anyway; do not propagate |
| `crypto.randomUUID` unavailable | Assumption: not reachable on supported targets (secure contexts and localhost in all current browsers, Node >= 19). Validate via the Node engines floor and by running the page over HTTP rather than `file://`. If it ever is unavailable, the module must still satisfy the never-throws invariant. |

`validateForm` and the submit handler are unchanged; tracking failures cannot
reach them because `get()` absorbs its own errors.

## Testing

Runner: `node:test` with `node:assert`, no dependencies. `"test": "node --test"`.
Tests live in `test/visitor-id.test.mjs` and drive `createVisitorIdStore` with
object-literal storage fakes.

Cases:

1. Empty storage: `get()` returns a well-formed UUID and writes it under
   `visitorId`.
2. Second `get()` on the same store returns the identical value and performs no
   second write.
3. Pre-populated valid storage: returns the stored value; does not overwrite.
4. Stored value empty string: replaced with a fresh UUID.
5. Stored value malformed: replaced with a fresh UUID.
6. `getItem` throws: returns a usable ID, stable across repeat calls on that
   store.
7. `setItem` throws: returns a usable ID; the error does not propagate.
8. Across all cases: no throw, never null, never empty.

`login()` is not separately unit-tested. It remains a stub whose behavior is a
`console.log` and a literal return; there is no assertion of value to make until
it performs a real request. The parameter change is exercised through the module
tests and manual verification in the browser.

Manual verification: serve the app, submit the form, confirm the logged result
carries a `userId`, reload, and confirm the same ID appears.

Implementation follows TDD: tests for each case above are written before the
module code.

## Tooling

| Item | Choice |
|---|---|
| Lint | ESLint 9 flat config, `eslint.config.mjs`, `js.configs.recommended` |
| Format | Prettier |
| Test | `node:test` (built in) |
| Serve | `serve` as a devDependency; `"start": "serve ."` |
| Node | `"engines": { "node": ">=20" }` for global `crypto.randomUUID` |

Scripts added: `start`, `test`, `lint`, `format`.

The static server is not optional polish: module scripts do not load over
`file://`, so opening `index.html` directly now fails with a CORS error. The
README documents this.

## Risks

- **Opening `index.html` directly stops working.** Anyone used to double-clicking
  the file gets a console CORS error with no visible page failure. Mitigated by
  the README note and the `start` script.
- **Globals disappear from `app.js`.** No in-repo consumer exists, but any
  external snippet or bookmarklet relying on them would break.
- **The identifier is a browser, not a person.** It resets when storage is
  cleared, does not follow a user across devices, and does not survive private
  browsing. Any analytics built on it must not be described as identifying
  users.
- **Persistent identifiers carry consent obligations** in the EU, UK, and similar
  jurisdictions once used for analytics. Nothing leaves the browser today, so the
  obligation is not yet triggered, but it attaches the moment the ID is
  transmitted. Revisit before wiring the real request.
- **Mixed module systems.** The repo will hold ESM (`app.js`, `src/visitor-id.mjs`)
  and CommonJS (`src/index.js`, `src/utils.js`) side by side. Intentional, to
  avoid touching unrelated files; worth resolving if the Node side grows.

## Open questions

None blocking. Two deferred by decision: whether the storage key needs an origin
namespace, and whether the anonymous ID will later be linked to a server-issued
user ID.
