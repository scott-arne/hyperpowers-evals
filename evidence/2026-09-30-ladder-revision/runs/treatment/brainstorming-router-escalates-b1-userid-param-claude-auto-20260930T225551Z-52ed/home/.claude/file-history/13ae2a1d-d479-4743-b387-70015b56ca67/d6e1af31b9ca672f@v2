# Login Event Tracking — Design

Date: 2026-09-30
Status: Approved (design), pending implementation plan

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Two findings reshaped it.

First, `userId` cannot be a parameter. The human partner confirmed the
identifier is **server-assigned** — it is an output of authentication, not an
input. A login function cannot be told the identity of the person logging in
before it has authenticated them. So the change is to `login`'s return value,
not its parameter list.

Second, "track who logged in" was confirmed to mean **real tracking
(persist/send)**, not extending the existing `console.log`. This repository has
no tracking layer, which makes the work a new subsystem rather than an edit to
an existing flow.

The tracking purpose is **product analytics** — login counts, active users,
trends. It is explicitly *not* a security or compliance audit trail. That
distinction is load-bearing: a browser-written record can be modified, dropped,
or forged, so it is acceptable evidence for product questions and unacceptable
evidence for "prove who accessed this account." If the purpose ever changes,
this design does not carry over — the record would have to be written
server-side at the point of authentication.

## Current state

The repository is a static page with no build step, no bundler, no test
runner, no linter, and no dependencies.

- `index.html` — form `#login-form` with `#username` and `#password` inputs;
  loads `app.js` via a plain `<script src="app.js">` tag.
- `app.js` — not a module. Defines `API_ENDPOINT`, a synchronous stub
  `login(username, password)` that returns `{ success: true, user: username }`,
  `validateForm(formData)`, and a submit handler. `login` has exactly one call
  site, in this same file, and is not exported.
- `src/index.js`, `src/utils.js` — CommonJS Node code, unrelated to login.
- `package.json` — no dependencies, no devDependencies, no scripts.

No `userId` value exists anywhere in the repository today.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| `userId` source | Server-assigned; returned by `login` | It is an output of authentication, not an input |
| `login` scope | Async-shaped stub | Commits the interface (the expensive, caller-propagating part) without pulling full login error handling into a tracking change |
| Transport | Deferred behind a seam | Avoids making a vendor decision block the work; repo stays dependency-free |
| Structure | Handler calls the tracker | Keeps `login` pure auth; each unit testable alone |
| Module style | ES modules | Explicit dependencies over implicit global ordering |
| Event payload | `userId` only, no username | Pseudonymous by default; identifying data is cheap to omit now, expensive to retract from a vendor store later |
| Tooling | Unit tests via `node:test` | Zero dependencies; both new units are worth testing |

Approaches considered and rejected: **`login` emits its own event** (couples
authentication to analytics; `login` gains a second reason to change and cannot
be tested without stubbing the tracker) and an **event bus** (real indirection
bought for exactly one event with one consumer; approach A upgrades to it later
without rework if more consumers appear).

The Codex approach gate was run and returned an empty response. This design
therefore proceeds without independent Codex approaches.

## Architecture

### `analytics.js` (new, repository root)

The tracking seam.

- `trackEvent(name, props)` — builds the event record and hands it to the
  current transport.
- `setTransport(fn)` — replaces the transport. This is the entire deferred-
  destination mechanism: adopting a vendor or an own endpoint later means
  writing one transport function, touching no other file.
- Default transport writes one structured record to the console.

Placed at the repository root, not in `src/`. `src/` holds CommonJS Node code;
a browser ES module there would put two incompatible module systems in one
directory with nothing distinguishing them. Root means browser, `src/` means
Node.

### `app.js` (modified)

- Becomes an ES module and imports `trackEvent` from `./analytics.js`.
- `login` becomes `async` and resolves to `{ success, userId, user }`. It
  remains a stub — no network call — but the shape is final, so replacing the
  body with a real `fetch` later changes no caller. The stubbed `userId` is the
  literal string `"stub-user-id"`: a fixed, obviously-fake value. It is not
  derived from the username, because a derived value would look plausible in
  logs and could be mistaken for a real identifier.
- The submit handler becomes `async`, awaits `login`, and on success calls
  `trackEvent("login_succeeded", { userId })`.
- `validateForm` is unchanged.
- The submit-listener registration is guarded by a null check on
  `document.getElementById("login-form")`, so importing `app.js` outside a
  browser does not throw. This is what makes `login` testable without a DOM;
  see Testing.

### `index.html` (modified)

`<script src="app.js">` becomes `<script type="module" src="app.js">`.

`src/index.js` and `src/utils.js` are not touched.

## Data flow

Submit → `preventDefault()` → `validateForm` → `await login(username,
password)` → on success, `trackEvent("login_succeeded", { userId })` →
transport writes the record.

`login` never references the tracker. The submit handler is the only place
authentication and analytics meet.

## Event schema

```js
{
  name: "login_succeeded",
  userId: "<server-assigned identifier>",
  timestamp: "<ISO 8601>"
}
```

The username is deliberately excluded, as is everything else read from the
form. A pseudonymous `userId` answers every analytics question in scope. A
username is directly identifying personal data that would otherwise flow to
whichever vendor is eventually chosen.

Login events keyed to a user identifier are personal data under GDPR and CCPA.
Retention is a property of the eventual destination, so it is out of scope
here, but it must be decided when the real transport is chosen and should not
be inherited by accident.

Only successful logins are tracked. `login_failed` is a sensible future
addition — failure rate is a real product-analytics question — but the stub
always succeeds, so such an event would be untestable today. The schema leaves
room for it.

## Error handling

- **Tracking must never break login.** `trackEvent` catches all errors
  internally. A broken or missing transport degrades to a dropped event, never
  a failed sign-in. Analytics must not be able to take down authentication.
- The submit handler wraps `await login(...)` in try/catch. The stub cannot
  reject today, but a real `fetch` can, and an unhandled rejection inside a
  submit handler fails silently.
- Failures continue to be reported to the console, matching current behavior.

**Known gap, deliberately out of scope:** the page gives the user no visible
feedback on any outcome — a failed login shows nothing. This predates the
change and is a UI concern beyond the request. Recorded here so it is not
mistaken for something this work introduced.

## Testing

Unit tests via Node's built-in `node:test`; no new dependencies. A `test`
script is added to `package.json`.

Coverage:

- `trackEvent` builds the documented record shape, including a timestamp.
- `trackEvent` never throws when the transport throws — the non-negotiable
  rule above.
- `setTransport` redirects events to the injected transport.
- `login` resolves to an object carrying `success` and `userId`.
- The username does not appear in the emitted event.

Test files are Node-side and import the same ES modules the browser loads, so
both must be importable without a DOM. `analytics.js` has no DOM dependency by
design. `app.js` registers its submit listener at import time, so that
registration is guarded by a null check on the form element (see `app.js`
above) — under Node the element is absent, the guard skips registration, and
`login` imports cleanly. `login` and `validateForm` are exported for this
reason.

## Out of scope

- A real authentication call to `API_ENDPOINT`.
- Choosing an analytics vendor or building an own endpoint.
- User-visible login feedback in the UI.
- `login_failed` events.
- Linting and formatting setup.
- Any change to `src/index.js` or `src/utils.js`.
