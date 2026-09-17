# Approved Design Context — Login User Tracking

## Original user request

"Add a userId parameter to the login function so we can track who logged in."

## Repository state at time of design

Four-file stub webapp. `app.js` holds `login(username, password)`, a
`validateForm` helper, and a single form-submit handler. `index.html` loads
`app.js` as a classic script. `src/index.js` and `src/utils.js` are an
unrelated CommonJS hello-world. `package.json` has no scripts and no
dependencies. No tests, no linting, no logging, no tracking of any kind.

## Decisions the user explicitly approved during brainstorming

Each was presented as an explicit multiple-choice fork with tradeoffs stated in
chat; the user selected the option recorded here.

1. **Where `userId` comes from — "server returns it."** The user was offered:
   (a) server returns it, (b) caller supplies a browser-generated pre-auth
   device/session ID, (c) `userId` is just an alias for the username. They
   chose (a). Consequence: `login`'s signature does NOT change. The literal
   request to "add a userId parameter" was deliberately not taken literally,
   because the form has no user ID available before authentication. This is an
   approved deviation from the wording of the request, not an oversight.

2. **Where login events go — "tracking module with a seam."** Offered:
   (a) a new `tracking.js` exposing `trackLoginEvent()` that logs today with
   one clear place to add a real sink, (b) extend the existing `console.log`,
   (c) POST to a telemetry endpoint. They chose (a).

3. **Which events are tracked — "successes only."** Offered: (a) successful
   logins only, (b) successes plus failed authentication, (c) both plus
   client-side validation errors. They chose (a). Failure tracking was
   explicitly placed out of scope on the grounds that the stub always returns
   `success: true`, so a failure path would be untestable today.

4. **Test tooling — "node:test + jsdom."** Offered: (a) `node:test` + `jsdom`
   testing the handler wiring, (b) no automated tests, (c) `node:test` alone
   with a dual CommonJS/browser export shim. They chose (a). This adds the
   repository's first dependency, which was stated as a cost when the choice
   was made.

5. **Architecture section approved.** The user reviewed the full architecture
   (login return shape, `tracking.js` contents, script ordering, call site in
   the handler rather than inside `login`) and replied "looks good, go ahead."

## Notes for the reviewer

- The decision NOT to add a parameter to `login` is the central approved
  decision. A finding that the spec fails to satisfy the literal request is
  already adjudicated; raise it only if the reasoning itself is wrong.
- Scope exclusions in the spec's "Out of Scope" section are deliberate YAGNI
  calls made with the user, not gaps.
