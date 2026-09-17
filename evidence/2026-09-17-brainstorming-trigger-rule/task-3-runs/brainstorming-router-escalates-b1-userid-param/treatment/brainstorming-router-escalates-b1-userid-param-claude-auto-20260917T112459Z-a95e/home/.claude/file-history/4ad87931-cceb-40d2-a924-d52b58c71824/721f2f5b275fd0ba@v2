# Login `userId` and Persisted Session Identity — Design

Date: 2026-09-17
Status: Approved in brainstorming; not yet planned
Repository: `drill-test-project`, branch `feature/webapp-enhancement`

## Problem

`login()` in `app.js` takes a username and password and returns
`{ success: true, user: username }`. The submit handler logs that object and
discards it, so nothing in the application can answer "who is logged in?" after
the handler returns.

The request was to add a `userId` parameter to `login()` "so we can track who
logged in." Clarification established that the identity must outlive the call:
it has to persist across page loads and be readable by forms that do not exist
yet. That is not a parameter addition — the browser side of this repository has
no state layer, no module system, and no shared identity of any kind. This
design introduces that layer.

## Scope

In scope:

- An optional `userId` parameter on `login()`.
- A new `session.js` owning a persisted identity record in `sessionStorage`.
- Wiring `login()` to write that record.
- Unit-test infrastructure, which the repository does not currently have.

Out of scope:

- Real authentication. `login()` remains a stub; `API_ENDPOINT` is still unused.
- Logout UI. `Session.clear()` exists, but nothing calls it yet.
- The future forms that will read the identity. They do not exist, and this
  design only guarantees the interface they will use.

## Settled Decisions

Each of these was chosen by the human partner during brainstorming.

| Decision | Choice |
|---|---|
| Persistence lifetime | `sessionStorage` — survives reload and in-tab navigation, cleared on tab close |
| Default `userId` | The username, produced inside `login()` |
| Structure | A `session.js` classic script exposing a `Session` global |
| Stored shape | JSON record `{ userId, username }` under key `session.user` |
| Storage-failure behavior | Warn on the console; never block login |
| Tooling | Unit tests via Node's built-in `node --test`; no linter, no e2e, no fuzzing |

`localStorage` was rejected: it would leave a user identifier on the machine
after the browser closes, which is a deliberate choice rather than a default.
In-memory-only was rejected because it cannot satisfy "other forms will need it."
Converting the browser side to ES modules was rejected because `type="module"`
is blocked by CORS on `file://`, and this repository has no dev server or build
step. Inline `sessionStorage` calls were rejected because they duplicate the
storage key and record shape into every future consumer.

## Architecture

### `session.js` (new)

A classic script — no module syntax — loaded by `index.html` in a `<script>`
tag placed **before** `app.js`, so the global exists by the time `app.js`
registers its submit handler.

It is the only code in the application that touches `sessionStorage`. That
single-owner property is what makes the eventual swap to a server-issued id a
one-line change, and it is the reason this file exists at all.

Public surface, exactly three functions:

- `Session.setUser({ userId, username })` — serializes the record and writes it
  under `session.user`.
- `Session.getUser()` — returns the parsed record, or `null` when no user is
  stored.
- `Session.clear()` — removes the key. Needed for a future logout, and for
  tests to reset state between cases.

There is intentionally no `getUserId()`. `getUser()?.userId` covers it, and
keeping the surface at three functions means less to maintain. If future forms
want only the id, adding it then is one line.

The file ends with `if (typeof module !== "undefined") module.exports = Session;`
so it works as a browser global and as a CommonJS import. That matches the
convention already used in `src/`, and it is what lets the unit tests require
the module without a DOM.

### Stored record

Key: `session.user`. Value: JSON, of the shape

```json
{ "userId": "alice", "username": "alice" }
```

Both fields hold the same value today. They exist separately because they
diverge the moment `API_ENDPOINT` becomes a real call and the server returns its
own id: consumers key off `userId` and display `username`, and neither consumer
changes at the swap. A bare string under key `userId` was rejected for this
reason — widening a string to an object later is a breaking read for anything
already written to a live `sessionStorage`.

No `loggedInAt` timestamp and no schema version field. Nothing described needs
either, and both are cheap to add later.

**Constraint: the session record holds an identifier and a display name only.**
No tokens, no credentials, no password. `sessionStorage` is readable by any
script on the page, so a later change that puts a bearer token in this record
would turn a benign store into a credential store. This constraint is recorded
here so that change is a deliberate one rather than an accident.

### `app.js` (modified)

`login()` becomes:

```js
function login(username, password, userId = username)
```

The parameter is optional and defaults to the username, per the settled
decision. The function keeps its current stub behavior and gains one step:

1. Log: `console.log("Logging in:", username, userId)`.
2. Persist: `Session.setUser({ userId, username })`.
3. Return: `{ success: true, user: username, userId }`.

The submit handler is **unchanged**. It does not pass a `userId` because it has
none to pass — `index.html` collects only a username and a password — and the
default covers it.

The DOM wiring at the bottom of `app.js` gets a guard:

```js
if (typeof document !== "undefined") { /* existing addEventListener block */ }
```

Without it, requiring `app.js` in Node throws at load on
`document.getElementById("login-form")`, and `login()` cannot be unit-tested at
all. This is a two-line change to code the feature already touches.

`app.js` also gains the same trailing CommonJS export guard as `session.js`:

```js
if (typeof module !== "undefined") module.exports = { login, validateForm };
```

Without it, requiring `app.js` yields an empty object and `login()` is still
untestable even with the DOM guard in place.

`login()` refers to `Session` as a bare identifier, which resolves to
`globalThis.Session` in both environments: the browser sets it via the script
tag, and the tests assign `globalThis.Session` before calling `login()`. No
`require` of `session.js` inside `app.js` — that would make `app.js` a module in
a way the classic-script loading model does not support.

### `index.html` (modified)

One added line: `<script src="session.js"></script>` immediately before the
existing `<script src="app.js"></script>`. Order matters and is load-bearing.

### The swap point

When `API_ENDPOINT` becomes a real `fetch`, the server-issued id replaces the
default at exactly one line inside `login()`. No other file changes. Every
consumer continues to call `Session.getUser()` and read the same two fields.

## Data Flow

```
submit handler
  -> validateForm({ username, password })
  -> login(username, password)            // userId defaults to username
       -> console.log
       -> Session.setUser({ userId, username })
            -> sessionStorage.setItem("session.user", JSON.stringify(record))
       -> returns { success, user, userId }

any later form
  -> Session.getUser()
       -> sessionStorage.getItem("session.user") -> JSON.parse -> record | null
```

## Error Handling

All three cases are handled inside `session.js`; no caller needs a `try/catch`.

| Case | Behavior | Rationale |
|---|---|---|
| `sessionStorage` throws on write | `setUser` catches, warns on the console, returns normally | Throws in Safari private mode and when cookies are blocked. Blocking login because persistence is unavailable would be a worse bug than the one being fixed. |
| Stored JSON is malformed | `getUser` catches the parse error and returns `null` | A caller receiving `null` behaves as it would for a logged-out user, which is the safe reading. Throwing into an unrelated form is not. |
| Key absent | `getUser` returns `null` | Not an error — the ordinary "nobody has logged in yet" state. |

`setUser` reports failure only to the console. Making a storage failure visible
to the user was considered and rejected: it is not actionable by them, and login
itself still succeeded.

## Testing

The repository has no test runner, no dependencies, and no `scripts` block.
This design adds unit tests using Node's built-in runner, which keeps the
dependency count at zero.

- Add `"scripts": { "test": "node --test" }` to `package.json`.
- Tests require `session.js` and `app.js` via their CommonJS export guards and
  inject a fake `sessionStorage` object rather than needing a DOM.
- `session.js` reads `sessionStorage` as a bare identifier, so tests assign
  `globalThis.sessionStorage` to a fake with `getItem`/`setItem`/`removeItem`,
  and reset it between cases. Cases 6 and 7 additionally assign
  `globalThis.Session` before calling `login()`.

Cases to cover:

1. `setUser` then `getUser` round-trips both fields.
2. `getUser` returns `null` when the key is absent.
3. `getUser` returns `null` when the stored value is malformed JSON, and does
   not throw.
4. `setUser` does not throw when the storage backend throws on write.
5. `clear` removes the record; a subsequent `getUser` returns `null`.
6. `login(username, password)` persists a record whose `userId` equals the
   username.
7. `login(username, password, explicitId)` persists a record whose `userId` is
   the explicit id and whose `username` is still the username.

End-to-end infrastructure and fuzz/mutation testing were considered and
rejected: a browser driver is a heavy dependency for one form with a stubbed
login that makes no network call, and the only parse in the codebase is a single
`JSON.parse` already guarded by `try/catch`. Linting and formatting were offered
and declined.

Manual verification: open `index.html`, submit the form, confirm the console
line carries both values and that `sessionStorage` holds the record under
`session.user`.

## Files Touched

| File | Change |
|---|---|
| `session.js` | New. The `Session` global, the storage key, and all error handling. |
| `app.js` | `login()` gains the optional third parameter, logs and returns the id, calls `Session.setUser`; DOM wiring gets a `typeof document` guard; file gains a CommonJS export guard. |
| `index.html` | One `<script src="session.js">` tag before `app.js`. |
| `package.json` | A `test` script. |
| `test/session.test.js` | New. The seven cases above. |

`src/index.js` and `src/utils.js` are not touched. They are a separate Node
entry point that the page never loads.

## Risks and Assumptions

- **Assumption: `session.js` loading before `app.js` is sufficient ordering.**
  Both are synchronous classic scripts with no `defer` or `async`, so this holds
  today. Validate by loading the page and confirming no `Session is not defined`
  error. Adding `defer` to either tag later would break it.
- **Assumption: the future forms are same-origin pages in this app.**
  `sessionStorage` is per-origin and per-tab; a form opened in a new tab will
  not see the record. Validate when the first additional form is built. If
  cross-tab identity turns out to be required, that is a return to
  `localStorage` and a re-decision, not a patch.
- The password parameter remains unused, as it is today. This design does not
  change that and does not store it.
- `userId` is client-supplied and unverified. Until a real API issues it, it is
  a tracking convenience, not an authorization fact, and nothing should make a
  trust decision based on it.

## Next Step

Hand this spec to the writing-plans skill to produce an implementation plan.
No code is written before that plan exists.
