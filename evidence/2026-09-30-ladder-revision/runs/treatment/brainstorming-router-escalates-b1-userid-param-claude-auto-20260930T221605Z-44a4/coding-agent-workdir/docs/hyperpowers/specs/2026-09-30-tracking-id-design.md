# Anonymous Tracking Id — Design

Date: 2026-09-30
Status: approved (design), pending spec review

## Problem

`login(username, password)` in `app.js` has no way to identify the visitor who
submitted the form. The request is to add a `userId` parameter so logins can be
attributed, and for that identity to persist across the app because other forms
will need it later.

The complication the request does not state: `login` runs *before* anyone is
authenticated. Its own stub output is `{ success: true, user: username }` — the
identity is the function's result, not an available input. So the id being
threaded in cannot be an authenticated identity. It is an app-generated
anonymous correlation id that a server can later join to a username.

## Decisions

Settled during brainstorming:

1. **`userId` is a real parameter on `login`**, not derived from the return
   value and not read internally by `login`. An internal read would make
   `login` untestable without stubbing browser storage.
2. **The app generates the id**, minting it on first visit. It identifies a
   browser, not a person. Rejected: a user-typed account id (requires a new
   form field and users who know their id) and an externally supplied id from
   URL/SSO/cookie (depends on infrastructure not present in this repo).
3. **`localStorage` is the store** — one id per browser, surviving restarts,
   living until cleared. Rejected: `sessionStorage` (two tabs become two
   "users", which undercuts reuse across forms) and cookies (automatic
   transmission on every request, plus a consent dimension not wanted now).
4. **Distribution is a classic global script**, matching the structure already
   in the repo. Rejected: converting the page to ES modules (breaks `file://`
   loading, so running the app would newly require an HTTP server) and a
   centralized tracked-submit helper (YAGNI — infrastructure for forms that do
   not exist against requirements not yet stated).

## Non-goals

- Authenticating or authorizing anything. This id is not a credential, not a
  session token, and must never gate access.
- Sending the id to a server. `login` is a stub; `API_ENDPOINT` is declared but
  never called. Wiring the id into a real request is future work.
- Building the shared abstraction for future forms. Those forms call
  `getTrackingId()` directly. The centralized-injection shape gets extracted
  when a second form exists and shows what it actually needs.
- Any change to the `src/` CommonJS tree, which the browser page never loads.

## Architecture

One new file, `tracking.js`, beside `app.js` at the repo root (browser code
lives at the root in this repo; `src/` is a separate Node program). It owns one
job: hand out a stable anonymous id. No other module knows how the id is
generated or stored.

`index.html` loads `tracking.js` before `app.js`. Future forms include the same
script tag.

### Public interface

```js
getTrackingId(storage = window.localStorage, generate = defaultGenerate)
```

Returns a non-empty string id. Reads the stored value; mints, persists, and
returns a new one if absent, unreadable, or malformed. The two parameters exist
for dependency injection in tests and have working browser defaults, so all
production call sites pass nothing.

The file ends with a dual export:

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getTrackingId };
}
```

This is what lets Node's test runner load the exact file the browser loads —
no build step, no second implementation to drift.

### Data model

- Storage key: `app.trackingId` (namespaced to avoid collision with anything
  else on the origin).
- Value: a UUID v4 string when `crypto.randomUUID` is available; otherwise a
  random hex string of equivalent length.
- Validity rule: a stored value is used as-is if it is a non-empty string after
  trimming. Anything else is discarded and re-minted. The format is
  deliberately not validated strictly, so the generator can change without
  invalidating every existing visitor's id.

### Data flow

1. Page loads `tracking.js`, then `app.js`.
2. Submit handler validates the form as it does today.
3. Handler calls `getTrackingId()` and passes the result as the third argument:
   `login(username, password, userId)`.
4. `login` logs the id alongside the username and returns it in its result
   object so callers can correlate.

The id is fetched at the use site rather than cached in a module variable at
load time, so there is no initialization ordering to get wrong and no stale
value after storage is cleared mid-session.

## Error handling

Three failure modes, all of which would otherwise break the login form outright:

1. **`localStorage` access throws.** Reading or writing `localStorage` raises
   rather than returning `null` when storage is disabled or blocked by privacy
   settings. Both operations are wrapped in `try`/`catch`. On failure the module
   falls back to an in-memory id held for the page load. Tracking degrades to
   per-page-load granularity; login continues working.
2. **`crypto.randomUUID` is undefined.** It exists only in secure contexts, so
   it is absent over `file://` and plain `http://`. Fallback chain:
   `crypto.randomUUID` → `crypto.getRandomValues` → `Math.random`.
3. **Stored value is empty or malformed.** Discarded and re-minted rather than
   passed downstream as a bad id.

The `Math.random` tail of the fallback chain is not cryptographically strong.
This is accepted deliberately: the id is an anonymous correlation token, not a
credential. **If any authorization decision ever depends on this id, that
fallback must be removed first.** Recorded here because the constraint is
invisible at the call site.

## Security and privacy

The id is anonymous and contains no personal data, which removes the usual
shared-machine and PII concerns. It remains a *persistent identifier*, and in
some jurisdictions persistent identifiers carry consent obligations even
without a name attached. Out of scope for this change; flagged so the
obligation is a known decision rather than a discovery.

## Testing

`test/tracking.test.js` using Node's built-in `node:test`. Zero dependencies,
keeping `package.json` free of dependencies as it is today. All cases run
against injected fakes; none needs a DOM or a browser.

| Case | Expected |
|---|---|
| Empty storage | Mints an id, writes it to storage, returns it |
| Existing valid id | Returns the stored value, does not re-mint or re-write |
| Stored value empty / whitespace | Discards, re-mints, overwrites |
| Storage getter throws | Returns a usable id, does not propagate |
| Storage setter throws | Returns a usable id, does not propagate |
| Same page load, storage broken | Two calls return the same in-memory id |
| `crypto.randomUUID` absent | Falls back, still returns a non-empty id |

`package.json` gains `"scripts": { "test": "node --test" }`.

Assumption: the host Node version supports `node --test` with `test/` directory
discovery (Node 18+ for the runner, 20+ for default discovery). Validate by
running `npm test` during the first implementation task; if discovery fails,
pin the path explicitly in the script.

## Files touched

| File | Change |
|---|---|
| `tracking.js` | New. `getTrackingId`, generator, fallbacks, dual export. |
| `test/tracking.test.js` | New. The table above. |
| `index.html` | One `<script src="tracking.js">` before `app.js`. |
| `app.js` | `login` signature, the call site, log and return the id. |
| `package.json` | Add the `test` script. |

## Global Constraints

Tooling selected for this work, inherited by every plan and task derived from
this spec:

- **Unit-test infrastructure: yes.** `node:test`, no dependencies. New logic
  ships with tests.
- **Lint / auto-format: no.** Not set up; match surrounding style by hand.
- **End-to-end tests: no.**
- **Fuzz / mutation testing: no.**

Further constraints:

- `package.json` stays free of runtime and dev dependencies.
- No build step, bundler, or transpiler is introduced.
- The app must keep working when `index.html` is opened directly over
  `file://`. This is what rules out ES modules and what forces the
  `crypto.randomUUID` fallback.
- `login` keeps its existing return shape; the id is added to it, nothing is
  removed.

## Future work

- Include the id in the real POST to `API_ENDPOINT` when `login` stops being a
  stub. Assumption: the backend will accept a client-supplied correlation
  field; validate by checking the API contract at that time.
- Extract shared form-submission injection when a second form exists.
- Revisit consent obligations before shipping to production users.
