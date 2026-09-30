# Client-Side Session Identity — Design

Date: 2026-09-30
Status: Approved design, pending implementation plan

## Problem

The request was "add a `userId` parameter to the login function so we can track
who logged in." Clarifying that request changed its shape twice:

1. Nothing in the repo produces a `userId`. The form collects only `username`
   and `password` (`index.html:9-10`), and `login()` is called with exactly
   those two values (`app.js:23`). A `userId` the client must supply *before*
   authenticating has no source. The value belongs in `login()`'s **return**,
   where a server would assign it.
2. "Track who logged in" was confirmed to mean the identity must **persist**
   and be usable **across the app**, because other forms will need it later.
   That is a new subsystem, not a signature change, so the work was
   re-classified from a bounded change to an architectural one.

The deliverable is therefore not a new parameter. It is a persisted,
client-side current-user identity that `app.js` writes at login and that
future forms read.

## Settled constraints

These were decided with the human partner during brainstorming and are not open
for reinterpretation during implementation:

| Decision | Choice |
|---|---|
| Source of `userId` | Returned by `login()`, not passed into it |
| Persistence | Client-side only; no backend. `API_ENDPOINT` stays a stub |
| Storage mechanism | `localStorage`, with an explicit logout path |
| Stored scope | Current identity only — no change notification, no login history |
| Module strategy | Native ES modules, no bundler |

## Global constraints

Inherited by every task in the implementation plan:

- **Zero runtime dependencies.** The ES-module approach was chosen partly
  because it needs no bundler; implementation must not introduce one, nor any
  npm runtime dependency.
- **Unit tests via `node --test`.** Node's built-in runner, no test framework
  dependency. New behavior in `session.js` ships with tests.
- **No linter or formatter.** Declined for now; do not add one.
- **No end-to-end or fuzz testing.** Declined; out of scope.
- **`package.json` declares `"type": "module"`.** See "Module system" below.

## Architecture

### File layout

`session.js` is a new file at the **repository root**, alongside `app.js` — not
under `src/`. `src/` holds orphaned CommonJS files that the browser never
loads; placing an ES module there would put two module systems in one
directory. The browser half of this repo stays flat at the root.

### Module system

`package.json` gains `"type": "module"`. This is the accurate declaration for a
repo whose browser code is ESM, and it is what allows `node --test` to import
`session.js` at all — without it Node parses `.js` as CommonJS and rejects
`export` with `Unexpected token 'export'`.

Consequence: the two existing CommonJS files must be renamed so they keep
working.

- `src/index.js` → `src/index.cjs`
- `src/utils.js` → `src/utils.cjs`
- The `require('./utils')` call inside `src/index.cjs` must be updated to
  `require('./utils.cjs')`.
- `package.json`'s `"main"` must be updated from `src/index.js` to
  `src/index.cjs`.

These files are unrelated to the original request. Renaming them was explicitly
approved as part of this design; it is not incidental cleanup, and no other
change to them is in scope.

### `session.js`

The only code in the application permitted to touch `localStorage`.

```js
const STORAGE_KEY = "app.session";

export function getSession()        // -> { userId, username } | null
export function setSession(session) // -> boolean (did the write land?)
export function clearSession()      // -> void
```

**Stored record:** `{ userId, username }`. `username` is carried alongside the
id because there is no backend: a later screen that wants to show "signed in
as …" cannot resolve a bare `userId` into a name, since there is nothing to
ask. The username is already in hand at login, so it costs one field.

**No in-memory cache.** Every read goes to storage. At this scale the cost is
nil, and it makes the cross-tab case work without a subscription mechanism: a
logout in one tab is visible to the next read in another tab. The only gap is a
page that sits idle and never reads again, which no current code does. This is
why the "identity + change notification" option was not needed.

### `app.js`

- `login(username, password)` keeps its existing two-parameter signature. It
  gains a `userId` in its return value:

  ```js
  return { success: true, userId: STUB_USER_ID, username };
  ```

- `STUB_USER_ID` is a module-level constant with an **obviously fake value**.
  It must not be generated, randomized, or derived from the username. A stub
  that mints plausible-looking identifiers invites later code to treat them as
  real identity. When `API_ENDPOINT` becomes real, this constant is deleted and
  the field comes from the response.
- The returned `user` field is **renamed to `username`** for consistency with
  the stored record. This is safe: `app.js:23` is the only caller in the repo.
- `login()` does **not** write to storage. The submit handler does:

  ```js
  const result = login(username, password);
  if (result.success) {
    const stored = setSession({ userId: result.userId, username: result.username });
    if (!stored) console.warn("Session could not be persisted; login will not survive a reload.");
  }
  ```

  Keeping the write in the caller leaves `login()` a pure stand-in for a network
  call — testable, with no storage side effects — and honest about the fact
  that it becomes `async` once the real endpoint lands.

### `index.html`

- `<script src="app.js">` becomes `<script type="module" src="app.js">`.
- A logout button is added, wired to `clearSession()`. It is **always
  visible**; toggling it on session state would require UI state management,
  which is a larger idea than this design should introduce.

**Serving requirement:** module scripts are fetched under CORS rules, so
`index.html` must be served over `http://` (any static server, e.g.
`python3 -m http.server`). Opening the file directly from disk with `file://`
will no longer work. This was an accepted cost of the ES-module approach.

## Data flow

1. User submits the form.
2. `validateForm()` runs unchanged.
3. On valid input, `login(username, password)` returns
   `{ success, userId, username }`.
4. On success, the handler calls `setSession({ userId, username })`.
5. `session.js` serializes the record to `localStorage` under `app.session`.
6. Any later form calls `getSession()` and receives the record or `null`.
7. The logout button calls `clearSession()`, removing the key.

## Error handling

`localStorage` is the only real failure surface, and it fails in several ways.
Every access inside `session.js` is individually wrapped in `try`/`catch`
rather than feature-detected once at load: availability is not a stable
property, and a write can fail (quota) on a browser where a read just
succeeded. Accessing `window.localStorage` can itself throw `SecurityError`
where a browser or embedded webview blocks storage.

The failure policy differs by direction, deliberately:

- **`getSession()` never throws.** Storage blocked, key absent, unparseable
  JSON, or a valid-JSON-but-wrong-shape value all return `null` — "nobody is
  logged in," the safe reading of a failed identity read. No caller needs a
  `try`/`catch`.
- **`setSession()` returns a boolean.** A failed write means the user is logged
  in on this page and will be a stranger after a reload. Swallowing that
  produces a "it keeps forgetting me" bug with nothing in the logs. The submit
  handler warns to the console on `false`.
- **`clearSession()` never throws.** If storage is unreachable there is nothing
  to clear.

**Corrupt data self-heals.** When `getSession()` finds unparseable JSON or a
record of the wrong shape, it removes the key before returning `null`. Leaving
it would let one bad write break the app for that user on every subsequent
load, with no UI to recover.

**Validity rule:** a stored record is valid only if it is a plain object whose
`userId` and `username` are both non-empty strings. A bare string, a number,
`null`, an array, or an object missing either field is treated as corrupt.

The validity rule is enforced on **read only**. `setSession()` serializes what
it is given without inspecting it; a caller that stores a malformed record gets
`true` back and the next `getSession()` discards it. Validating on read is what
makes the app resilient to values written by an older version of the code or
edited by hand, which validating on write cannot cover.

## Security constraint

**The stored `userId` is not authentication, and must never be treated as
authentication.**

`localStorage` is fully editable by the user; anyone can set `userId` to any
value with two lines in a console. The stored record is acceptable as "who this
browser believes it is" — useful for display and prefilling. It is not evidence
of anything.

The dangerous next step is specific and foreseeable: when a backend appears,
sending the stored `userId` up and trusting it to identify the caller is an
authentication bypass. A real backend must derive identity from a credential it
issued and verifies, never from this field. This is recorded here because the
entire point of this design is that other code will come to depend on the
value.

## Testing

Unit tests for `session.js` via `node --test`, with `localStorage` supplied as
a stubbed object so the error paths are reachable:

- round-trip: `setSession()` then `getSession()` returns the record
- `getSession()` returns `null` when no key is present
- `getSession()` returns `null` and removes the key on unparseable JSON
- `getSession()` returns `null` and removes the key on wrong-shape records
  (bare string, `null`, missing `userId`, empty-string `username`)
- `getSession()` returns `null` when storage access throws
- `setSession()` returns `false` when the write throws (quota / blocked)
- `setSession()` returns `true` on success
- `clearSession()` removes the key and does not throw when storage is
  unavailable

`login()` is **not** unit-tested. It lives in `app.js` beside the
`document.getElementById("login-form")` call that runs at import time, so
importing the module under Node fails for lack of a DOM. Extracting `login()`
into its own module purely to make it testable is out of scope for this
change. Its revised return shape and the submit-handler wiring are verified by
hand in a browser. No e2e infrastructure is in scope.

## Out of scope

- Any real authentication or any call to `API_ENDPOINT`.
- Server-side recording of login events.
- A login *history*; only the current identity is stored.
- Change notification / subscription for forms on the same page.
- Session expiry. With no backend there is no authority to expire against;
  `clearSession()` via the logout button is the only exit.
- Showing or hiding UI based on session state.
- Unifying the `src/` CommonJS half with the browser half beyond the `.cjs`
  renames required by `"type": "module"`.
- Linting, formatting, e2e, and fuzz infrastructure — all explicitly declined.

## Risks

- **`file://` regression.** Anyone used to opening `index.html` from disk must
  now serve it. Accepted knowingly.
- **Shared machines.** `localStorage` survives browser restarts, so on a shared
  device the next person is treated as the previous user until logout is
  pressed. The always-visible logout button is the only mitigation; there is no
  server-side expiry to fall back on.
- **`src/` renames.** Two files outside the request's natural scope change.
  Approved explicitly; called out here so the change is not mistaken for drift.
