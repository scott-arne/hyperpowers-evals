# Design: Shared userId tracking

Date: 2026-09-30
Status: approved for planning

## Problem

The webapp's `login()` function logs a username but produces nothing that
identifies the authenticated user to the rest of the app. The request is to
track who logged in, with that identity available to other forms that do not
exist yet and surviving navigation between pages.

The original framing was "add a userId parameter to `login()`". That shape is
wrong: no caller can know the id before the call, because the id is assigned
by the server and is only knowable once the login API responds. The id is
therefore part of `login()`'s **return value**, and the cross-page
availability is a separate storage concern.

## Goal

A single, named place that holds the server-assigned user id for the duration
of a browser tab session, readable by any page in the app, used only to label
log and analytics events.

## Decisions

These were settled during brainstorming and are inputs to the plan, not open
questions.

1. **Return value, not parameter.** `login()` returns the id; it does not
   accept one.
2. **Tracking only.** The id is non-authoritative. Nothing may use it to gate
   access, decide what a user can see, or serve as proof of identity. If it is
   missing or wrong, the consequence is a mislabeled log line and nothing
   else.
3. **Tab-session lifetime.** Backed by `sessionStorage`: survives reloads and
   page-to-page navigation, cleared when the tab closes. `localStorage` was
   rejected because it outlives the login it describes and would keep
   attributing events to a stale user on a shared machine.
4. **Global-script module.** A new file exposing a narrow API on one global,
   loaded by a plain `<script>` tag. Chosen over ES modules because the page
   has no bundler and converting it would change how every script on the page
   loads, and over direct `sessionStorage` access because that duplicates the
   key name and the trust rule into every future consumer.

## Non-goals

Explicitly out of scope, recorded so they do not drift into the
implementation:

- No logout flow and no caller of `clearUserId()`.
- No authentication, authorization, session tokens, or gating of any kind.
- No real network call; `login()` remains a stub.
- No change to `validateForm()` or to form validation behavior.
- No change to the CommonJS code under `src/`, which is unrelated to the
  browser page.
- No linter, formatter, or test framework. The repo has none configured and
  the decision was to add none as part of this work.

## Architecture

### New: `user-tracking.js`

Owns the storage concern in full and nothing else. Exposes exactly three
functions on a single global, `window.UserTracking`:

| Function | Behavior |
|---|---|
| `setUserId(id)` | Stores `id`. A null or undefined `id` is ignored rather than stored, so the absent state stays distinguishable from the string `"null"`. |
| `getUserId()` | Returns the stored id, or `null` when none is stored. Never throws. |
| `clearUserId()` | Removes the stored id. |

The `sessionStorage` key (`"tracking.userId"`) is private to this module; no
other file references it. A file header comment states the trust rule from
decision 2 so a future reader cannot mistake this for session state.

`clearUserId()` has no caller in this change. It exists so that ending
attribution is a defined operation on this module rather than something a
future form improvises against raw storage.

### Changed: `app.js`

- `login()` returns `{ success, user, userId }`. Because the function is still
  a stub with no network call, it fabricates the id behind a comment that
  marks it as a placeholder and names `API_ENDPOINT` as the source the real
  value will be read from.
- The `#login-form` submit handler calls `UserTracking.setUserId(result.userId)`
  after a successful login.

### Changed: `index.html`

Adds `<script src="user-tracking.js"></script>` before the existing
`<script src="app.js"></script>`. The global must exist before `app.js` runs.

### Future consumers

A later form becomes a consumer by adding the same script tag and calling
`UserTracking.getUserId()`. It does not touch `sessionStorage` directly.

## Data flow

1. User submits the login form.
2. `validateForm()` passes (unchanged behavior).
3. `login()` returns a result carrying `userId`.
4. The handler stores it via `UserTracking.setUserId()`.
5. Any page in the tab reads it via `UserTracking.getUserId()` and includes it
   as a label on logged events.

## Error handling

**Storage can throw.** `sessionStorage` access raises in some
environments — disabled storage, private browsing modes, quota exhaustion.
Both accessors wrap access in try/catch and degrade to the no-id state.
Tracking must never be able to fail a login: a storage error affects
attribution only.

**"No id yet" is a normal state, not an error.** Before any login, and after a
failed login, `getUserId()` returns `null`. Consumers omit the id field from
the logged event rather than substituting a placeholder or a guess, so missing
attribution is visibly missing in the data instead of silently wrong.

## Verification

No automated tests; the repo has no test infrastructure and none is being
added. Verification is manual in the browser:

1. Submit the login form; confirm the id appears in `sessionStorage` under the
   module's key and in the logged login result.
2. Reload the page; confirm `getUserId()` still returns the id.
3. Open the app in a new tab; confirm it starts with no id.
4. Confirm a page load with no login logs events without an id field rather
   than with a placeholder value.

## Global constraints

- No new dependencies. The project has none and adds none.
- No build step, no bundler, no transpilation.
- No linting, formatting, or test tooling.
- Browser code stays in the existing global-script style; no `import` or
  `export` in files loaded by `index.html`.

## Assumptions

- Assumption: "other forms" means additional pages in this same static site,
  served from the same origin and loading their own script tags. Validate by
  confirming with the requester before the first additional consumer is built;
  if any consumer is a different origin or a separate app, `sessionStorage`
  cannot reach it and the storage decision must be revisited.
- Assumption: the eventual login API returns a user identifier in its
  response body. Validate when `API_ENDPOINT` is made real; if the id arrives
  by another channel, only the stub's placeholder line changes.
