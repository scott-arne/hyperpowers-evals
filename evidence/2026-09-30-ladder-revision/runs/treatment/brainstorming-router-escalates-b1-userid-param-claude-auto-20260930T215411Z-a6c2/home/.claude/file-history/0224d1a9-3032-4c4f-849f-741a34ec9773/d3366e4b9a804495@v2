# Client Session Persistence — Design

Date: 2026-09-30
Status: Approved for planning

## Problem

The request was "add a `userId` parameter to the `login` function so we can
track who logged in." Investigation showed the parameter framing does not fit:
`login(username, password)` is called from exactly one place
(`app.js:23`, the form submit handler), and at that moment nothing in the
application holds a user ID. The form collects only a username and a password
(`index.html:9-10`). A caller-supplied `userId` would therefore be an invented
value.

The requirement behind the request is that the identity of the logged-in user
be available across the whole application and survive page reloads and new
tabs, because other forms will need it later. That is a shared session module
plus a persistence mechanism, neither of which exists in this repository.

## Decisions

Settled during brainstorming:

| Question | Decision |
|---|---|
| Where the userId comes from | Returned by `login()`, not passed into it |
| What persistence must survive | Page reloads and new tabs (browser restart) |
| Backend | `login()` stays a stub and synthesizes the ID |
| Module surface | A session object, not a bare userId |
| How the page is loaded | From disk over `file://` |
| Session expiry | Fixed 24-hour window from login time |
| Tooling | None added; manual verification in the browser |

## Constraints

- **`file://` loading forbids modules.** ES module imports are blocked by CORS
  on `file://`, and the browser cannot load CommonJS at all. The session module
  must be a plain script attaching to `window`, loaded before `app.js`.
- **`src/` is not part of the page.** `src/index.js` and `src/utils.js` use
  CommonJS and are never referenced by `index.html`. They are out of scope.
- **This is not an authorization boundary.** `localStorage` is readable and
  writable by the user, so the persisted identity is for display and tracking
  only. The server must never trust it to decide who a request is from. This
  constraint is load-bearing: it is the reason no token or credential is stored.

## Architecture

### New file: `session.js`

A plain script at the repository root, loaded before `app.js`. It attaches a
single global, `window.AppSession`, with four methods:

- `save({ userId, username })` — persists the session record.
- `getSession()` — returns the record, or `null` when absent, expired, or
  unreadable.
- `isLoggedIn()` — `getSession() !== null`.
- `clear()` — removes the record. This is the logout hook for when a logout
  control exists; none does today.

### Storage

One `localStorage` key, `app.session.v1`, holding:

```json
{ "v": 1, "userId": "…", "username": "…", "loginAt": 1759276800000 }
```

`loginAt` is epoch milliseconds. The key and the record both carry the version
so a later shape change is detected rather than misread as a valid record of
the current shape.

### Expiry

`getSession()` compares `loginAt` against a 24-hour window on every read. An
expired record returns `null` and is cleared during that same call, so stale
identity does not linger in storage on a shared machine.

### Changes to existing files

- `index.html` — add `<script src="session.js"></script>` before the existing
  `app.js` tag. Later forms opt in by adding the same line.
- `app.js` — `login()` returns a `userId` alongside its existing fields; the
  submit handler saves the session on success; on page load the script reads
  `getSession()` and logs the restored user.

## Data Flow

1. Submit → `validateForm()` (unchanged).
2. On valid input, `login(username, password)` synthesizes a userId and returns
   `{ success, user, userId }`.
3. On success, the handler calls `AppSession.save({ userId, username })`.
4. On subsequent page loads, `app.js` calls `AppSession.getSession()` and logs
   the restored session when one is present. This is what makes persistence
   observable without a second form existing yet.

## Error Handling

- **`localStorage` access can throw** — Safari private browsing, disabled
  cookies, and exceeded quota all raise on read or write. Every access is
  wrapped. On failure the module falls back to an in-memory record so the
  current page continues to work rather than the submit handler dying.
- **Corrupt or malformed stored JSON** is treated as no session and cleared.
- **A record with a missing or non-numeric `loginAt`** is treated as expired.
- **A record whose `v` is not 1** is treated as unreadable and cleared.

## Assumptions

- Assumption: a synthesized client-side userId is acceptable for now. It is
  generated per login via `crypto.randomUUID()`, so it differs for the same
  person across logins and across browsers — it identifies a login event, not a
  human. Real cross-session identity tracking requires the server to supply the
  ID. Validate via the backend integration work, where `login()` reads the ID
  from the API response; no other file changes when that happens.
- Assumption: 24 hours is the right window. Validate via use — the value lives
  in one named constant in `session.js` so it can be changed in one place.
- Assumption: `crypto.randomUUID()` is available. It requires a secure context
  in some browsers, and `file://` is treated as potentially trustworthy by
  Chrome and Firefox but this is worth confirming at implementation time. A
  `Math.random`-based fallback is acceptable for a stub ID since it carries no
  security weight. Validate via manual check in the target browser.

## Out of Scope

- Wiring `login()` to `API_ENDPOINT`. The stub stays.
- A logout control. `clear()` exists for it; no UI is added.
- Any change to `src/`.
- Linting, formatting, and automated tests, by explicit decision.
- Cross-tab change notification (`subscribe`). No consumer exists; it is
  additive later.

## Verification

Manual, in the browser, since no test tooling is being added:

1. Load `index.html`, submit the form, confirm the logged result carries a
   `userId`.
2. Reload the page, confirm the restored session is logged.
3. Open `index.html` in a new tab, confirm the same session is visible.
4. In the console, set `loginAt` back more than 24 hours, reload, confirm the
   session is gone and the key is removed.
5. Corrupt the stored value to non-JSON, reload, confirm no crash and no
   session.
