# Login User Tracking — Design

Date: 2026-09-17
Status: Approved design, pending spec review

## Problem

The request was "add a `userId` parameter to the login function so we can
track who logged in." Two things in the current code prevent taking that
literally.

`login(username, password)` in `app.js` is called from exactly one place: the
form submit handler, which has only the two form fields to work with. Nothing
in the flow knows a user ID before authentication happens, so there is no
value a caller could pass.

Separately, the repository has no tracking of any kind. `console.log` is the
only output anywhere in the tree. "Track who logged in" names a capability
that does not exist yet.

The design below resolves both: the user ID becomes an output of
authentication rather than an input to it, and login events go through a
named seam that can later carry a real transport.

## Decisions

Each of these was chosen explicitly during brainstorming.

| Question | Decision | Reason |
|---|---|---|
| Where does `userId` come from? | The server returns it | Authentication is what turns credentials into an identity; the client cannot know the ID beforehand |
| Where do login events go? | A `tracking.js` module with a sink seam | Smallest change that makes tracking a real capability without committing to a vendor or wire format |
| Which events are tracked? | Successful logins only | Matches the request; the stub always succeeds, so a failure path today would be untestable |
| Test tooling | `node:test` + `jsdom` | The durable behavior lives in a DOM event handler; shallower tests would assert stub-invented values |

## Global Constraints

- No automated linting or formatting is configured in this repository, and
  none is being added as part of this work.
- Test infrastructure is being established by this change: `node --test` as
  the runner, `jsdom` as the only dependency.
- `app.js` remains a classic browser script. No bundler, no module system, no
  dual CommonJS/browser export shim.
- The design document is not committed.

## Architecture

### `login` returns the identity it establishes

The signature is unchanged. The stubbed return value grows a `userId` field:

```js
function login(username, password) {
  // Stub: would POST to API_ENDPOINT in real app; the server is the
  // authority on user identity, so userId comes back in the response.
  const userId = `user-${username}`;  // stub: server would assign this
  return { success: true, userId, user: username };
}
```

The fabricated ID is derived from the username so it is stable across calls
and visibly synthetic, consistent with the existing stub comment. Replacing
the stub with a real request means deleting the derivation and reading
`userId` off the response body; no caller changes.

### `tracking.js` — the new seam

A new classic browser script, matching `app.js`'s style: top-level function
declarations, no namespace object.

```js
function trackLoginEvent({ userId, timestamp }) {
  // Sink seam: replace this with a real telemetry transport.
  console.log("Login event:", { userId, timestamp });
}
```

The event carries `userId` and `timestamp` only. `username` is deliberately
excluded: `userId` already answers "who," and two identity fields on one event
can disagree.

### Wiring

`index.html` loads `tracking.js` before `app.js`, since classic scripts
execute in document order and `app.js` calls into it.

```html
<script src="tracking.js"></script>
<script src="app.js"></script>
```

The submit handler records the event:

```js
const result = login(username, password);
if (result.success) {
  trackLoginEvent({ userId: result.userId, timestamp: Date.now() });
}
console.log("Login result:", result);
```

The call sits in the handler rather than inside `login`. `login` is a stub for
a network call; when it becomes async, a tracking call buried inside it would
be entangled in the promise chain. Keeping it in the handler means
authentication does one job and the handler decides what to record, so
replacing the stub touches `login` alone.

## Data Flow

1. User submits the form.
2. Handler reads `username` and `password` from the DOM.
3. `validateForm` rejects missing fields — no event is recorded.
4. `login` returns `{ success, userId, user }`.
5. On success only, the handler calls `trackLoginEvent({ userId, timestamp })`.
6. `trackLoginEvent` writes to its sink (currently the console).

## Error Handling

Validation failures follow the existing path: `console.error` with the
validation message, and no tracking event. This is unchanged behavior.

`login` cannot currently fail — the stub returns `success: true`
unconditionally. The handler still guards on `result.success` so that
introducing real failures does not silently start recording failed attempts as
successes.

Tracking is fire-and-forget by design. A failing sink must not affect the
login flow. With a console sink this is trivially true; the constraint is
recorded here because it binds whatever transport replaces the seam.

## Testing

Runner: `node --test`, added as the `test` script in `package.json`.
Dependency: `jsdom` (devDependency, the repository's first).

Tests load `index.html` through jsdom with script execution enabled, then
replace `window.trackLoginEvent` with a recorder before dispatching events.
Because `trackLoginEvent` is resolved as a global at call time, this
substitution works without modifying `app.js` — which is why no export shim is
needed.

Two tests, both asserting behavior that survives the stub being replaced:

1. **A successful submission records exactly one event carrying the userId
   from the login result.** Fill both fields, dispatch `submit`, assert one
   recorded event whose `userId` equals the value `login` returned.
2. **A submission failing validation records no event.** Leave a field empty,
   dispatch `submit`, assert nothing was recorded.

Deliberately not tested: the exact value of the fabricated `userId`, and the
console output format of the sink. Both are stub details that a real backend
deletes.

Assumption: `jsdom` installs cleanly in this environment, validate via running
`npm install` before writing tests. This environment is behind a corporate
proxy; if the install fails, the fallback is to raise it rather than silently
switching to an untested manual-verification path.

## Files Touched

| File | Change |
|---|---|
| `app.js` | `login` returns `userId`; handler calls `trackLoginEvent` on success |
| `tracking.js` | New — `trackLoginEvent` with the sink seam |
| `index.html` | New script tag before `app.js` |
| `package.json` | `test` script, `jsdom` devDependency |
| `test/login-tracking.test.js` | New — the two tests above |

## Out of Scope

- Failed-login and validation-error tracking. The seam supports adding them;
  adding them now would mean a nullable `userId` serving an untestable path.
- A real telemetry transport or endpoint.
- Replacing the `login` stub with a real API call.
- Linting and formatting configuration.
- Any change to `src/`, which is unrelated to the login flow.
