# Approved design context and adjudicated decisions

## Original user request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's answers

**Q1: Where does the userId come from at login time?**
A: "It should be a real userId parameter on login. The tracking should persist
and work across the app; other forms will need it later."

**Q2: What produces the userId value before `login()` is called?**
A: App-generated id — minted on first visit, stored, passed to `login` and to
later forms. Anonymous; identifies a browser rather than a person.

**Q3: How long should the tracking id live, and should the server see it
automatically?**
A: `localStorage` — one id per browser, survives restarts, lives until
cleared. Reaches the server only when code explicitly includes it.

**Q4: Which approach should the design use?**
A: Approach A — a classic global script (`tracking.js` plus a `<script>` tag).
Explicitly chosen over ES modules (rejected because it breaks `file://`
loading) and over a centralized tracked-submit helper (rejected as YAGNI).

**Q5: The repo has no tests, linter, or formatter. Set any up?**
A: Unit tests only. No linter, no formatter, no e2e, no fuzz/mutation testing.

## Design approved in chat before the spec was written

The human partner reviewed and approved a design covering: `tracking.js` as a
second classic script exposing `getTrackingId()`; injectable storage and
generator with browser defaults plus a dual (global + CommonJS) export so
Node's test runner loads the same file the browser loads; `login(username,
password, userId)` with the id fetched at the use site; three error-handling
cases (localStorage throwing, `crypto.randomUUID` absent outside secure
contexts, malformed stored values); and `node:test` unit tests with no
dependencies.

Their approval was "looks good, go ahead."

## Deliberate, already-adjudicated decisions — do not re-litigate absent a real defect

These were decided with the human partner. Treat them as settled inputs, not
open questions. Flag them only if you can show a concrete blocking defect.

1. The id is anonymous and app-generated. It is deliberately NOT an
   authenticated identity, because `login` runs before authentication.
2. `localStorage` over `sessionStorage` or cookies.
3. Classic global script over ES modules. The app must keep working when
   `index.html` is opened directly over `file://`; this constraint is what
   rules ES modules out.
4. `Math.random` as the last resort in the id-generation fallback chain is
   accepted deliberately. The id is a correlation token, never a credential,
   and the spec records that the fallback must be removed before any
   authorization decision depends on the id.
5. No dependencies, no build step, no bundler, no linter.
6. Not building shared form-submission infrastructure now (YAGNI); future
   forms call `getTrackingId()` directly.
7. Sending the id to a server is out of scope — `login` is still a stub.

## Deviation from the chat design, introduced when writing the spec

The spec has `login` also return the id in its result object. This was not in
the chat design and has been flagged to the human partner for confirmation.
