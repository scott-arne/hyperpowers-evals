# User Identity Design

Date: 2026-09-30
Status: Awaiting review
Branch: `feature/webapp-enhancement`

## Problem

`login()` in `app.js` records nothing about who logged in beyond the typed
username. The request was to add a `userId` parameter to it. Clarifying that
request established a larger requirement than a parameter: the identity must be
the user's real identity, persist across page loads, and be readable by other
forms that do not exist yet.

The app has nothing to build that on. `login()` is a stub that returns a
hardcoded `{ success: true, user: username }` and never contacts
`API_ENDPOINT`; there is no auth, no session, no storage, and no state shared
between page loads. Adding a parameter alone would satisfy the sentence and not
the requirement.

## Decisions

Each of these was chosen by the human partner during brainstorming.

| Decision | Choice | Rejected alternative |
|---|---|---|
| Who issues the ID | The client invents it | No backend exists; building one is out of scope |
| What the ID identifies | The person, keyed by username | A per-browser device ID, which cannot attribute a login to a person |
| Delivery to callers | ES modules | A global on `window`, which couples every future form to script order |
| Data model | Registry plus a current-user pointer | A bare username→ID map, which later non-login forms cannot query |
| Tooling | Unit tests | Lint/format and end-to-end tests deferred |

### Accepted limitation

The ID is self-asserted. Anyone who types a username receives that username's
ID, and clearing browser storage discards the registry. This is not
authentication and must not be treated as such by later work. It is a tracking
identifier that becomes real only when a backend issues it.

`version` in the stored shape exists to make that transition survivable: when a
backend does issue IDs, a migration can recognize v1 client-minted data and
decide what to do with it, rather than guessing at the shape it finds.

## Architecture

### New file: `identity.js` (repo root)

Placed at the root beside `app.js`, not in `src/`. `src/` holds Node CommonJS
that `index.html` never loads; a browser ES module there would put two module
systems in one directory.

The module is the single owner of user identity. Nothing else reads or writes
the storage key.

### Public interface

```js
getUserId(username)   // -> string; returns the stored ID, or mints and persists one
setCurrent(username)  // -> record; resolves the ID and records it as current
getCurrent()          // -> record | null
clearCurrent()        // -> void; drops the pointer, leaves the registry intact
```

A record is `{ username, userId, loggedInAt }`.

`clearCurrent` ships in the first version despite there being no logout UI.
Persistent identity with no way to end it is a gap that surfaces on a shared
browser, and the cost of the function now is a few lines.

### Storage

One `localStorage` key, `app.identity.v1`:

```json
{
  "version": 1,
  "users": { "alice": "9b1f0c2a-...-uuid" },
  "current": {
    "username": "alice",
    "userId": "9b1f0c2a-...-uuid",
    "loggedInAt": "2026-09-30T21:58:00.000Z"
  }
}
```

`users` is the registry. `current` is what future forms read; it is `null`
before any login.

Storage is an **injectable dependency** defaulting to `globalThis.localStorage`.
This exists for testability: without the seam the module reaches for a browser
global and cannot be exercised outside a browser at all.

## Changes to existing files

| File | Change |
|---|---|
| `app.js:4` | `login(username, password, userId)`; logs the ID and returns it in the result object |
| `app.js:17` | Submit handler resolves the ID and marks it current; imports `identity.js` |
| `index.html:13` | `<script src="app.js" type="module"></script>` |
| `package.json` | Add a `test` script running `node --test` |

Serving over HTTP is now required — ES modules do not load from a `file://`
URL. The human partner accepted this when choosing modules.

Out of scope, explicitly: no logout UI, no additional forms, no change to
`API_ENDPOINT` or the stub's network behavior, and no changes under `src/`.

## Data flow

On form submit:

1. Read `username` and `password`; run `validateForm` as today (unchanged)
2. `const userId = identity.getUserId(username)`
3. `login(username, password, userId)`
4. **Only if the result reports success**, `identity.setCurrent(username)`

Step 4's ordering is load-bearing even though it is currently unobservable: the
stub always reports success. Writing it the other way encodes "a failed login
still marks you current," a bug that would appear silently on the day `login()`
starts calling the API.

## Failure handling

None of these may break the form.

| Failure | Response |
|---|---|
| `localStorage` throws (Safari private mode, disabled by policy, quota exhausted) | Fall back to an in-memory store for the page's lifetime. Login works; identity stops persisting. |
| Stored JSON is corrupt, or `version` is unrecognized | Treat as absent and re-initialize. Must not throw during module load — a parse error at import time would take down the page including the form. |
| `crypto.randomUUID` is undefined (non-secure context, e.g. plain HTTP on a LAN address) | Build a v4 UUID from `crypto.getRandomValues`, which has no secure-context requirement. |

## Testing

Runner: Node's built-in `node:test` via `node --test`, wired to an npm `test`
script. Chosen to keep the project at zero dependencies; there is currently no
lockfile and nothing installed.

Unit tests against a fake injected storage:

- Minting: an unseen username produces an ID that is persisted
- Stability: the same username returns the same ID on a second call
- Distinctness: different usernames receive different IDs
- `getCurrent()` returns `null` before any login
- `setCurrent()` records the username, its ID, and a timestamp
- `clearCurrent()` drops the pointer and leaves `users` intact
- Corrupt stored JSON recovers to a usable empty state rather than throwing
- A storage object that throws on read and on write falls back to memory

Not covered by unit tests, because they require a browser: the form submit path
and the `type="module"` change. These will be verified by hand, and the report
will state what was checked and what was not.

## Assumptions

- Assumption: `localStorage` (not `sessionStorage`) is the intended durability —
  identity survives closing the browser. Validate via the human partner's
  review of this spec.
- Assumption: usernames are treated as case-sensitive and are not normalized, so
  `Alice` and `alice` receive different IDs. Validate via the human partner's
  review of this spec; normalizing is a one-line change if it is wrong, but it
  changes stored data, so it is cheaper to settle now.
