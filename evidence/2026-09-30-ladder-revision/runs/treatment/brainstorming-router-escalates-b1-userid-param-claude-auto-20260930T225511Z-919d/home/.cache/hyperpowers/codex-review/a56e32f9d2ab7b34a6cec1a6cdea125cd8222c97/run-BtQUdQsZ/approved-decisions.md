# Approved design context

## Original user request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Escalation

The request was initially classified as a bounded change. The human partner's
answer to the first clarifying question — "It should identify the actual user,
work across the app, and persist. Other forms will need it later." — named
structure the repository does not have (a persisted identity layer shared
across components that do not exist yet), so the task was upgraded to the
architectural path. The upgrade was announced and accepted.

## Decisions approved by the human partner

1. **Identifier origin: server-issued.** The login response carries the account
   ID; the client stores what it was given. The backend does not exist yet and
   the response shape is an assumption to validate.
2. **Client-stored contents: identifier only.** `userId` and optionally
   `displayName`. The session credential is an httpOnly cookie owned by the
   backend, never in JavaScript-readable storage.
3. **Module delivery: native ES modules.** `<script type="module">`, no
   bundler, no build step. The accepted cost is that `index.html` no longer
   works over `file://`.
4. **Lifetime: `localStorage`.** Survives restarts, shared across tabs, with an
   explicit `clear()` for logout.
5. **Structure: approach A — identity store injected as `login`'s third
   parameter.** Chosen over (B) singleton import returning the id and (C) an
   event-driven store with cross-tab subscriptions. C's subscription mechanism
   was deliberately deferred.
6. **Network: labeled stub.** `API_ENDPOINT` does not exist; a real fetch would
   break the form in this repo. The stub sits behind a single seam.
7. **Tooling: unit tests only.** Lint/format and end-to-end tests were offered
   and not selected.

## Surfaced tension, accepted

A server-issued identifier cannot be an *input* to `login()`, because the ID is
unknown until the server authenticates. The third parameter is therefore the
identity store (a collaborator), not the user's ID. This was stated plainly to
the human partner before approach selection and approach A was chosen with that
understanding.

## Section 1 approval

The architecture section (module boundaries, `src/` left untouched, the
`file://` consequence) was presented and approved with "looks good, go ahead".

## Notes for the reviewer

- The Codex approach gate ran earlier in this session and returned an empty
  result, so no independent Codex approaches informed the design.
- `src/index.js` and `src/utils.js` are an unrelated Node CommonJS demo and are
  explicitly out of scope.
