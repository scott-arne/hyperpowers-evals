# userId on Login — Design

**Date:** 2026-10-03
**Status:** Approved in brainstorming; pending written-spec review

## Goal

Add a `userId` parameter to `login()` so the app can track who logged in. The
userId must persist across visits and be available to other forms added later.

## Decisions

| Question | Decision |
|---|---|
| How does `login` get the userId? | As a third parameter: `login(username, password, userId)` |
| Where does the caller get it? | Persisted storage; first-time users enter it in a new form field |
| Where does it persist? | `localStorage`, key `userId`, with a "not you?" control to clear it |
| What does "track" mean? | Include `userId` in the login request payload and `console.log` it |
| Code structure | New classic script `session.js` exposing a `Session` global, loaded before `app.js` |

## Global Constraints

- No build step, no bundler; scripts stay classic `<script src>` tags.
- No new dependencies. Tests use Node's built-in `node:test`.
- `session.js` is the only code that touches `localStorage`.
- The password is never logged.

## Components

### `session.js` (new)

Classic script defining one global, `Session`. A header comment states that it
must be loaded before any script that uses it.

- `Session.getUserId()` → stored string, or `null` if absent or if
  `localStorage` access throws.
- `Session.setUserId(id)` → trims `id`; ignores empty or whitespace-only values;
  otherwise writes it. Swallows storage errors.
- `Session.clearUserId()` → removes the key. Swallows storage errors.

Ends with `if (typeof module !== "undefined") module.exports = Session;` so Node
tests can load it. `Session` reads `localStorage` from the global scope at call
time, so tests can install a fake `globalThis.localStorage`.

### `index.html`

- Adds `<script src="session.js"></script>` before `app.js`.
- Adds a container `#userId-entry` with `<input type="text" id="userId" placeholder="User ID" />`.
- Adds a container `#userId-known` with `Logged in as <span id="userId-display"></span> — <a href="#" id="userId-clear">not you?</a>`.
- Exactly one of the two containers is visible: `#userId-known` when an ID is
  stored, `#userId-entry` otherwise (via the `hidden` attribute).

### `app.js`

- `login(username, password, userId)`:
  - builds payload `{ username, password, userId }` for the eventual POST to
    `API_ENDPOINT` (still a stub);
  - logs `"Logging in:", username, "userId:", userId` (never the password);
  - returns `{ success: true, user: username, userId }`.
- `validateForm(formData)` requires `username`, `password`, and `userId`;
  values are trimmed first, so whitespace-only counts as missing. Missing any
  → `{ valid: false, error: "Missing required fields" }`.
- DOM wiring runs only when `document` exists (guard so Node can load the file):
  - on load, render the `userId` UI from `Session.getUserId()`;
  - "not you?" click → `preventDefault`, `Session.clearUserId()`, re-render;
  - submit → `userId = Session.getUserId() ?? userIdInput.value.trim()`;
    validate; call `login(username, password, userId)`; on `success`, call
    `Session.setUserId(userId)` and re-render.
- Ends with guarded `module.exports = { login, validateForm }`.

## Data Flow

1. First visit: no stored ID → field shown → user enters ID → login succeeds →
   ID saved → UI shows "Logged in as {id}".
2. Later visits: stored ID → field hidden → stored ID passed to `login`.
3. "Not you?": ID cleared → field shown again.

## Error Handling

- `localStorage` unavailable or throwing: `Session` degrades to "nothing stored";
  the field appears every time; login still works.
- Missing or whitespace-only `userId`: validation error, same message as other
  missing fields.
- Failed login: ID is not saved.
- `session.js` loaded out of order: `ReferenceError` on `Session`; prevented by
  documented load order, not by defensive code.

## Testing

- Add `"scripts": { "test": "node --test" }` to `package.json`.
- `test/session.test.js`: get/set/clear against a fake `localStorage`; trimming
  and empty-value rejection; throwing storage returns `null` / does not throw.
- `test/app.test.js`: `validateForm` with and without `userId` (including
  whitespace); `login` returns `userId`; `login` never logs the password
  (capture `console.log`).
- Manual browser check: first visit shows field; after login, reload shows
  "Logged in as…"; "not you?" restores the field.

## Out of Scope

- Real network POST to `API_ENDPOINT` (remains a stub).
- Server-side verification that `userId` matches the authenticated user.
  Assumption: the backend will validate the client-supplied `userId`; validate
  via backend owner before relying on it for audit.
- Wiring other forms to `Session` (they will adopt it when built).
