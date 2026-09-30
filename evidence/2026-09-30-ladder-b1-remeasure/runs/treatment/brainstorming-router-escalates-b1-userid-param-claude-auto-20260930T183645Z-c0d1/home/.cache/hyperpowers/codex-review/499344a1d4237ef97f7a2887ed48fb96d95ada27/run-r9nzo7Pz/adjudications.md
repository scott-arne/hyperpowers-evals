# Approved design context — user decisions during brainstorming

Original request, verbatim:
"Add a userId parameter to the login function so we can track who logged in."

Follow-up requirement, verbatim:
"It should persist and work across the app; other forms will need it later."

Decisions the user explicitly approved:

1. userId source: login RETURNS a userId rather than accepting one as a
   parameter. Rationale accepted: the only caller has no id to pass.
2. Persistence: sessionStorage (chosen over localStorage and an in-memory
   singleton).
3. Sharing mechanism: global namespace module (chosen over ES modules and
   over each form touching sessionStorage directly).
4. ID semantics: server-owned stable per-person id; the stub returns a
   deterministic placeholder derived from the username.
5. Tooling to set up as part of this work: lint + format, and unit tests.
   End-to-end tests explicitly deferred.
6. Architecture section 1 (session.js + login persisting internally +
   clear-on-failure + script ordering in index.html) reviewed and approved
   verbatim by the user: "Looks right, continue."

Note: the task was reclassified mid-brainstorm from bounded to architectural
when requirement 2 above introduced a shared persistent store.
