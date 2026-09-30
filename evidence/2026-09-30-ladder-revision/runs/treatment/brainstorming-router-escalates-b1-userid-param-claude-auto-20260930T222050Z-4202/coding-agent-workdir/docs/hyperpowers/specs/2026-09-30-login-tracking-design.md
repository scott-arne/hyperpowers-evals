# Login Tracking Design

Date: 2026-09-30
Status: approved (design), not implemented

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Reading the code showed the parameter cannot carry the
value it names: `login` at `app.js:4` is a stub with a single caller at
`app.js:23`, and neither the form nor any other client-side code produces a
user ID. A server-assigned user ID exists only *after* authentication
succeeds, which makes it an output of login rather than an input to it.

The underlying goal — recording who logged in — is therefore met by returning
the ID from `login` and persisting a record, not by adding a parameter.

**No `userId` parameter is added. `login`'s signature is unchanged.**

## Global Constraints

- No new runtime or dev dependencies. `package.json` gains nothing.
- No build step. `app.js` stays a plain script loaded directly by the browser
  via `<script src="app.js">`.
- No test runner, linter, or formatter is introduced (explicit decision).
  Consequence: this change ships with no automated test coverage and is
  verified manually only.
- Browser-native APIs only (`fetch`, `JSON`, `Date`).
- Tracking must never cause a successful login to fail.

## Decisions

| Question | Decision |
|---|---|
| Source of `userId` | The authentication response body |
| Tracking action | POST a record to a tracking endpoint |
| `login` stub | Becomes a real async `fetch` against `API_ENDPOINT` |
| Tracking trigger site | Inside `login` (approach A) |
| Tracking failure policy | Fire-and-forget; caught and swallowed |
| Tooling | None added |

Approach A (tracking inside `login`) was chosen over tracking in the caller
because the requirement reads as an invariant: there should be no path that
logs a user in without recording it. The cost is that `login` couples
authentication to analytics. That coupling is cheap to unwind — lifting the
`trackLogin` call from `login` into the caller is a few lines — whereas a
silently untracked login path is hard to notice. Revisit if a second login
entry point appears.

A `loginAndTrack` wrapper composing the two was considered and rejected as
YAGNI: three functions and an indirection layer for a 28-line file with one
caller.

## Assumptions

- Assumption: the tracking endpoint URL will be supplied by the project
  owner; validate via them providing it. Until then `TRACKING_ENDPOINT` is
  the empty string and `trackLogin` no-ops, so the code is correct and inert.
- Assumption: the authentication response is JSON containing a `userId`
  field; validate via the first real response from the auth service.
  `API_ENDPOINT` is currently `https://api.example.com/login`, a placeholder
  host, so this contract is unconfirmed.

## Design

### `login(username, password)`

Signature unchanged. Becomes `async`. Returns a promise resolving to:

- success: `{ success: true, userId, user }`
- failure: `{ success: false, error }`

`login` never rejects. Network errors and non-2xx responses are both
converted into the failure shape so the caller checks one field rather than
combining a `try`/`catch` with a status test.

Sequence:

1. POST `{ username, password }` as JSON to `API_ENDPOINT`.
2. If the response is not ok, resolve `{ success: false, error }` carrying the
   status.
3. Parse the JSON body and read `userId`.
4. Call `trackLogin(userId)` — not awaited.
5. Resolve `{ success: true, userId, user: username }`.

If the body parses but carries no `userId`, authentication still succeeded, so
login still resolves `{ success: true }` with `userId` undefined; `trackLogin`
skips the POST rather than recording a null identity. A malformed body that
fails to parse is an auth failure and resolves the failure shape.

`user: username` is retained alongside the new `userId` so the existing return
shape is not broken.

### `trackLogin(userId)`

New module-local function in `app.js`, roughly eight lines. Not exported, not
awaited by its caller.

- Returns immediately if `TRACKING_ENDPOINT` is empty or `userId` is absent.
- POSTs `{ userId, timestamp }` as JSON, where `timestamp` is
  `new Date().toISOString()`.
- Attaches `.catch` to the fetch promise, logging a warning and swallowing the
  error.

The `.catch` is load-bearing: without it a failed tracking POST becomes an
unhandled promise rejection, which is the mechanism by which analytics
failures turn into login failures.

`timestamp` comes from the client clock and is therefore user-controllable and
subject to skew. The server should stamp its own arrival time and treat the
client value as a hint.

### Constants

`TRACKING_ENDPOINT` is declared next to the existing `API_ENDPOINT` at the top
of `app.js`, initialized to `""`.

### Caller (`app.js:17-28`)

The submit handler becomes `async` and awaits `login`. `validateForm` and the
validation branch are unchanged.

## Data Flow

```
submit
  -> validateForm(...)            [unchanged]
  -> await login(username, password)
       -> POST API_ENDPOINT
       -> read userId from response
       -> trackLogin(userId)      [not awaited]
            -> POST TRACKING_ENDPOINT {userId, timestamp}
            -> .catch -> console.warn
       -> resolve {success, userId, user}
  -> log result
```

## Error Handling

| What fails | Caller receives | Recorded |
|---|---|---|
| Network down during auth | `{ success: false, error }` | nothing; no login occurred |
| Auth returns 401/500 | `{ success: false, error }` with status | nothing |
| Auth ok, tracking POST fails | `{ success: true, userId }` | console warning; **event lost** |
| `TRACKING_ENDPOINT` unset | `{ success: true, userId }` | nothing, silently |

Row three is the accepted trade of fire-and-forget: login never suffers for
tracking, and tracking is consequently lossy. Guaranteed delivery would
require a queue-and-retry design, which is explicitly out of scope here.

## Security and Privacy Notes

- A login record links a user identity to a timestamp. It is identity data and
  should be treated as such by whatever receives it; retention and access are
  the endpoint owner's to define.
- Credentials now actually leave the browser; the stub never transmitted them.
  `API_ENDPOINT` is https, but the host `api.example.com` is a placeholder.
  Pointing real credentials at a domain the project does not control should be
  reviewed before this runs in any real environment.
- Client-supplied `timestamp` is untrusted, as noted above.

## Out of Scope

- Guaranteed or retried delivery of tracking events.
- Any storage of login history in the browser (`localStorage`, cookies).
- Session management, tokens, or anything after the login result.
- Changes to `index.html`, `src/index.js`, or `src/utils.js`.
- Test, lint, or format tooling.

## Verification

No automated tests. Manual verification only:

1. Open `index.html` in a browser with devtools open.
2. Submit the form; confirm a POST to `API_ENDPOINT` carrying the credentials.
3. With `TRACKING_ENDPOINT` set, confirm a second POST carrying `userId` and
   `timestamp`.
4. Make the tracking endpoint fail; confirm the login result is still
   `success: true` and only a console warning appears.
5. With `TRACKING_ENDPOINT` empty, confirm no tracking request is made and
   login still succeeds.

Steps 2-5 require a reachable auth endpoint, which does not currently exist.
Until one does, verification is limited to code review.
