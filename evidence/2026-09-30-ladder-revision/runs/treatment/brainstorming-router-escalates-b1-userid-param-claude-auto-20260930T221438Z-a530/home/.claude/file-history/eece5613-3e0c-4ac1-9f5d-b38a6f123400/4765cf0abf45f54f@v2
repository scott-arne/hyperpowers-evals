# Approved design decisions (requester-confirmed)

Original request, verbatim: "Add a userId parameter to the login function so we
can track who logged in."

Decisions reached during brainstorming, each explicitly approved by the
requester:

1. **userId semantics** — "It should identify the actual user across the app and
   persist; other forms will need it later." This escalated the work from a
   one-function change to an identity layer.
2. **Issuer** — Server issues the userId on successful login. The client never
   mints an identity (a client-minted value identifies a browser, not a person,
   and is spoofable).
3. **Persistence** — `HttpOnly; Secure; SameSite` session cookie is the real
   credential; userId lives in `localStorage` as a non-secret label the server
   re-verifies. Explicitly rejected: localStorage-only, sessionStorage-only.
4. **Scope** — identity module + `login()` returning userId + logout/clear +
   stale-identity handling. Explicitly rejected: module-only (leaves a known
   stale-identity gap), and adding a second consumer form.
5. **Backend** — frontend-only. The stub stays a stub; the cookie/session
   contract is documented but not implemented. The spec must state plainly that
   no real auth exists.
6. **Module architecture** — approach A, global namespace module
   (`window.AppIdentity` via an added script tag). Explicitly rejected: ES
   modules (`file://` CORS forces a dev server) and introducing a bundler
   (disproportionate for a zero-dependency six-file repo). Approved by the
   requester with "Yes, A reads right."
7. **Tooling** — unit tests only, via Node's built-in `node --test`, with no new
   dependencies. Explicitly declined: lint/format, end-to-end tests.
8. **`login()` signature** — userId is added to the RETURN VALUE, not as an
   input parameter, because the server is the issuer. This intentionally departs
   from the literal wording of the original request; the requester was told so
   explicitly and approved with "Yes, return value is fine."
9. **Error handling** — approved as written, including the explicit statement
   that the TTL is a cleanliness mechanism and not a security boundary, and the
   named stale-identity limitation.
10. **Testing plan** — approved, including the decision NOT to test the DOM
    submit handler (would require jsdom, the dependency being avoided) and to
    report that as manual verification rather than coverage.

Notes for the reviewer:

- The absence of authentication is an accepted, documented constraint, not an
  oversight. Do not raise "there is no authentication" as a defect; DO raise it
  if the spec fails to disclose it clearly, or if any part of the design would
  invite a reader to treat the stored userId as authoritative.
- The zero-dependency constraint is deliberate and requester-chosen.
