# Persistent User Identity — Design

Date: 2026-09-30
Status: Approved (design), pending implementation plan

## Problem

The webapp needs to track who logged in. The request arrived as "add a
`userId` parameter to the `login` function", but the identifier is
server-issued, must persist across browser restarts, and will be consumed by
forms that do not exist yet. That is shared identity state, not a function
parameter.

## Why `login()` gains no parameter

`login(username, password)` is called from exactly one place, the submit
handler in `app.js`, which holds only the username and password the user
typed. Nothing in the repo produces a `userId` before login runs.

Because the identifier is issued by the server, it flows *out* of `login`,
not in. A `userId` parameter would require the caller to already know the
answer `login` exists to provide. The signature is therefore unchanged; the
identifier arrives in the return value and is persisted from there.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| ID origin | Server-issued | Authoritative identity. A client-minted UUID identifies a browser, not a person, and is editable via devtools. |
| Persistence | `localStorage` | Survives browser restarts and is shared across tabs, which is what "persists" requires here. |
| Shedding the identity | `clearUserId()` ships with the change | `localStorage` outlives the visit, so on a shared machine the previous user's id is present at the next visit. The capability to clear must exist from the start, not be retrofitted. |
| Stored contents | `userId` only | No password, no auth token. An identifier in `localStorage` is low-stakes; a credential there is a security decision with a much higher cost of being wrong. |
| Code sharing | ES modules | Future consumers depend on this layer; implicit global load-order is where that turns into bugs. |
| Module location | Repo root, not `src/` | `src/` is CommonJS Node code and `package.json` declares no `"type"`. An ES module there creates a module-system collision for no benefit. |
| Tooling | `node:test` unit tests only | Preserves the repo's zero-dependency property. Linting rejected as not worth the first dependencies for ~60 lines. |

## Architecture

### New: `session.js` (repo root)

Sole owner of persisted identity. Exports exactly:

- `USER_ID_KEY` — the storage key constant, so no consumer hardcodes the string
- `getUserId()` → stored id, or `null`
- `setUserId(id)` → persists the id
- `clearUserId()` → removes it

Every `localStorage` access is wrapped in `try`/`catch` with an in-memory
fallback. Safari private mode and storage-disabled browsers throw on access
rather than returning `null`; an identity layer that propagates that
exception would take the login flow down with it.

`session.js` resolves `globalThis.localStorage` at call time rather than
capturing a reference at import. This is a deliberate testability
constraint: it is what lets a test substitute a throwing stub to exercise
the fallback path.

### Changed: `app.js`

Becomes an ES module. Three changes:

1. Imports `setUserId` from `session.js`.
2. The stub `login()` returns `{ success, user, userId }`. The existing
   `user` field is retained — the addition is purely additive and cannot
   break an unseen reader. `userId` is marked in a comment as the field the
   real API will supply.
3. On successful login the submit handler calls `setUserId(result.userId)`
   and logs the userId as the record of who logged in.

### Changed: `index.html`

One attribute: `<script type="module" src="app.js">`.

**Consequence:** `type="module"` is fetched under CORS rules, so
`index.html` no longer works when opened directly as a `file://` URL. The
page must be served (e.g. `python3 -m http.server`). This was raised and
accepted during design.

### Not touched

`src/index.js`, `src/utils.js`, `README.md`, `package.json` (no dependencies
are added).

## Error handling

- **No `userId` in the login response:** nothing is stored, a warning is
  logged. `login`'s success/failure reporting is unchanged.
- **`localStorage` unavailable or throwing:** degrade to the in-memory
  fallback silently.

Neither case can break the form submission path.

## Testing

`node:test`, built in, zero dependencies, native ESM support. Coverage for
`session.js`:

- round-trip: `setUserId` then `getUserId` returns the id
- empty: `getUserId` returns `null` when nothing is stored
- clear: `clearUserId` removes a stored id
- fallback: with a `localStorage` stub that throws, `setUserId` /
  `getUserId` still round-trip in memory and no exception escapes

Tests define `globalThis.localStorage` themselves, since Node does not
provide one.

## Out of scope

- A logout button in the UI. `clearUserId()` ships; the button waits for an
  actual logout flow to design.
- Replacing the stub `login()` with a real `fetch` to `API_ENDPOINT`. The
  response shape is designed so only the call itself changes later.
- Storing a session or auth token. If that requirement arrives, the storage
  boundary must be revisited before reusing this module — a credential does
  not belong in the same low-stakes store as an identifier.
- Linting and formatting infrastructure.
- End-to-end and fuzz testing.

## Assumptions

- Assumption: the real login API will return a stable, server-issued user
  identifier in its response body; validate via the API contract once the
  backend exists.
- Assumption: no consumer outside this repo reads `login()`'s return value
  in a way that a purely additive field would disturb; validate via the
  additive-only change itself, which is safe under either answer.
