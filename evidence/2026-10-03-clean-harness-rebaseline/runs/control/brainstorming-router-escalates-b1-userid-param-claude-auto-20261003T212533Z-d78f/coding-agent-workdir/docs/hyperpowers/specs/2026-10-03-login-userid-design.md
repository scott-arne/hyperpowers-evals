# Login userId Tracking — Design

**Date:** 2026-10-03
**Status:** Approved in brainstorming; awaiting spec review

## Goal

Track who logged in by passing a `userId` into `login`. The userId must
persist across page loads and be reusable by other forms added later.

## Decisions

| Question | Decision |
|---|---|
| Where userId comes from | Client-generated (`crypto.randomUUID()`) on first use, persisted in `localStorage` |
| What "tracking" means for now | Include `userId` in the (stubbed) login request payload, the console log, and the return value. No local login history. |
| How it is shared | Native ES module `identity.js` exporting `getUserId()`; consumers import it |

Known limitation: a client-generated ID identifies a browser, not a person.
The same person on two devices gets two IDs; clearing storage produces a new
one. Accepted for now. Later, a server-assigned ID can replace it inside
`getUserId()` without changing callers.

## Global Constraints

- No build step; the app stays plain browser JavaScript.
- `package.json` must NOT gain `"type": "module"` (it would break the
  CommonJS `src/index.js`). Node 26 detects ESM syntax in `.js` files on its own.
- Tests use Node's built-in `node:test`; no new dependencies.

## Components

### `identity.js` (new, repo root)

```js
const STORAGE_KEY = "userId";

export function getUserId(storage = globalThis.localStorage) { ... }
```

Behavior:
1. Read `storage.getItem("userId")`. If present, return it.
2. Otherwise generate `crypto.randomUUID()`, `storage.setItem("userId", id)`,
   and return it.
3. If `storage` is missing or any storage call throws (private mode, blocked
   storage), fall back to a single in-memory ID held at module level for this
   page load, and return that. Repeated calls in the same page load return the
   same fallback ID. Never throws.

Out of scope: `setUserId` and `clearUserId`.

### `app.js` (modified)

- Add `import { getUserId } from "./identity.js";` at the top.
- `login(username, password, userId)`:
  - logs `"Logging in:", username, "userId:", userId`
  - stub comment updated: would POST `{ username, password, userId }` to
    `API_ENDPOINT`
  - returns `{ success: true, user: username, userId }`
- `login` does not read storage itself; the submit handler calls
  `login(username, password, getUserId())`.
- `validateForm` stays as it is.

### `index.html` (modified)

- `<script src="app.js"></script>` becomes
  `<script type="module" src="app.js"></script>`. Module scripts are deferred,
  so DOM wiring still runs after parsing.

### `README.md` (modified)

- Add a note: serve the webapp over HTTP (for example `npx serve .`), because
  ES modules do not load from `file://`. Document `npm test`.

### `package.json` (modified)

- Add `"scripts": { "test": "node --test" }`.

## Data Flow

form submit → `validateForm` → `getUserId()` (stored value, or newly generated
and saved, or in-memory fallback) → `login(username, password, userId)` →
logged and returned.

## Testing

`identity.test.js` (`node:test`, fake storage object):
- first call with empty storage returns a UUID-shaped string and saves it under `userId`
- a second call returns the same value
- a value already in storage is returned unchanged
- storage whose methods throw still returns an ID, and repeated calls return the same fallback ID

Manual browser check (served over HTTP): submit the form, reload, submit
again. The console shows the same userId both times.
