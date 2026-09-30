# Persisted User Identity — Design

Date: 2026-09-30
Status: awaiting review
Branch: `feature/webapp-enhancement`

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." The repository has no user identifier anywhere: the
form collects `username` and `password`, and `login()` returns a canned
`{ success: true, user: username }`.

Clarification established that the identifier must identify the actual user,
be readable across the app, persist, and be consumed by forms that do not
exist yet. That is an identity layer, not a parameter — which is why this
design exists rather than a one-line edit.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Identifier origin | Server-issued | Only a server-issued ID attests that the user authenticated. |
| Client-stored contents | Identifier only (`userId`, `displayName`) | The session credential stays in an httpOnly cookie, unreadable by JavaScript, so an XSS cannot exfiltrate it. |
| Module delivery | Native ES modules | Gives a real shared module without adding a bundler to a repo with no build step. |
| Lifetime | `localStorage` | Must outlive a tab so future forms can read it. Paired with an explicit `clear()`. |
| Structure | Identity store injected into `login()` | Satisfies the literal request for a third parameter in the only form coherent with a server-issued ID, and makes `login` testable without a DOM. |
| Network | Labeled stub | `API_ENDPOINT` does not exist; a real fetch would break the form in this repo. |
| Tooling | Unit tests only | Selected by the human partner; no linter, formatter, or e2e in scope. |

### The parameter tension

A server-issued identifier cannot be an *input* to `login()` — the ID is not
known until the server has authenticated the credentials. The third parameter
is therefore the identity **store**, a collaborator that `login` writes the
server's answer into. This satisfies the request's shape while being coherent
with its chosen origin. This was surfaced explicitly and approved.

## Architecture

Three files change, three are added, and `src/` is untouched.

```
index.html      -> script type="module"
app.js          -> DOM wiring only
auth.mjs        (new) login, validateForm, parseLoginResponse, stub transport
identity.mjs    (new) the only code that touches localStorage
test/           (new) unit tests
package.json    -> add scripts.test
src/            UNCHANGED (unrelated Node CommonJS greet demo)
```

### `identity.mjs`

Exports a factory so the storage backend is injectable, which is what makes it
testable under Node where `localStorage` does not exist:

```js
createIdentityStore(storage = globalThis.localStorage)
```

The returned store exposes:

- `get()` -> `{ userId, displayName } | null`
- `set({ userId, displayName })` -> persists and returns the stored record
- `clear()` -> removes the record; this is what logout calls

Rules:

- One storage key, defined once in this module.
- A stored value that is absent, unparseable, or missing a string `userId` is
  treated as "no identity" rather than throwing. Hand-edited or truncated
  storage must not break the app.
- Storage failures (private mode, quota, disabled storage) are caught and the
  store falls back to an in-memory record for the page's lifetime. Broken
  storage degrades tracking; it never blocks login.
- No DOM access, no network access. Swapping to `sessionStorage`, or adding
  change notification later, is a change confined to this file.

### `auth.mjs`

Holds the logic currently inline in `app.js`, so it can be tested without a
browser:

- `validateForm(formData)` — moved unchanged.
- `parseLoginResponse(body)` — the single place that knows the response shape.
- `login(username, password, identity)` — `async`. Calls the transport,
  parses the response, and on success calls `identity.set(...)` before
  returning the result.

### `app.js`

Reduced to DOM wiring: read the fields, call `validateForm`, `await
login(username, password, identity)` with the imported store, report the
result. It does not touch `localStorage` and does not reach for a global.

### `index.html`

`<script src="app.js">` becomes `<script type="module" src="app.js">`.

**Consequence:** the page stops working when opened as a `file://` URL, because
module fetches fail CORS on that scheme. It must be served over http (for
example `python3 -m http.server`). This is a real change to how the app is run
today and is the accepted cost of the chosen module system.

## Data flow

1. Submit handler reads `username` and `password`.
2. `validateForm` runs; on failure the handler reports and stops.
3. `await login(username, password, identity)`.
4. `login` calls the transport. `login` is written against the transport
   seam, not against `fetch` — the stub occupies that seam today (see "Stub
   transport"), and the real implementation will POST to `API_ENDPOINT` with
   `credentials: "include"` so the backend's httpOnly session cookie is set
   on the response and sent on later requests.
5. `parseLoginResponse` extracts `userId` and `displayName`.
6. On success `login` calls `identity.set(...)` and returns the result.
7. Any later code calls `identity.get()` and sees the same record, in any tab,
   after a restart.

### Stub transport

`API_ENDPOINT` (`https://api.example.com/login`) does not exist. The transport
is therefore a single clearly-labeled function that returns a simulated
server response containing a generated `userId`. It is marked as a stub in
its own comment and is the only thing that must be replaced when a real
backend appears — `parseLoginResponse` and everything downstream stay as they
are.

## Assumption to validate

`Assumption: the login endpoint responds 200 with a JSON body containing a
stable, server-generated userId and optionally a displayName, and sets an
httpOnly session cookie — validate via the real endpoint's response before
this ships.`

`parseLoginResponse` is the sole reader of that shape, so a wrong guess is a
one-function correction.

## Error handling

| Case | Behavior |
|---|---|
| Network failure or non-2xx | `login` returns a failure result; handler reports it; identity is not written. |
| 200 with missing or non-string `userId` | Treated as failure. No partial write — half an identity is worse than none. |
| Failed login while an identity is already stored | Existing identity is left untouched. A second person's failed attempt must not evict the first person's session. |
| `localStorage` unavailable | `identity.set` catches and falls back to in-memory for the page's lifetime; login still succeeds. |

## Testing

Runner: Node's built-in `node --test`, added as `scripts.test` in
`package.json`. Zero dependencies, which matches a repo that currently has
none.

Module format note: `package.json` has no `"type": "module"`, and `src/`
uses CommonJS `require`. New modules therefore use the `.mjs` extension so
Node loads them as ES modules without converting the unrelated `src/` files.
The browser selects module semantics from the `type="module"` attribute, not
the extension, so this costs nothing on the browser side.

Coverage:

- `identity.mjs`: store/read round-trip; absent record returns `null`;
  malformed JSON returns `null`; record missing `userId` returns `null`;
  `clear()` removes; storage that throws falls back to in-memory.
- `auth.mjs`: `login` persists the server-issued `userId` into the injected
  store on success; `login` does not write on transport failure; `login` does
  not write on a malformed response; an existing identity survives a failed
  login; `validateForm` keeps its current behavior.

Tests inject a fake storage object and a fake transport, so no DOM and no
network are required.

## Out of scope

- Logout UI. `identity.clear()` is provided; no button is added.
- Change notification and cross-tab sync (the event-driven variant). The
  store's interface is unchanged if this is added later.
- Linting, formatting, and end-to-end tests.
- `src/index.js` and `src/utils.js`, and the fact that `package.json` names
  `src/index.js` as `main` while the browser app lives at the root. Noted, not
  reconciled here.
- Any real backend work.
