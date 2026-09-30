# Approved design context

## Original user request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's recorded answers

1. **Where should userId come from, given none exists in the codebase?**
   "It should persist and work across the app — other forms will need it later."
   (This answer triggered a re-classification from a bounded change to an
   architectural one.)

2. **What kind of identifier is this?**
   Both, kept separate — a correlation id for analytics plus an auth identity
   for anything that gates behavior.

3. **Is a real backend coming?**
   Unsure / not decided. Agreed to design client-only with an explicit seam and
   record in the spec what changes when a server arrives.

4. **How long should the auth identity survive?**
   `sessionStorage` — survives navigation within the tab, cleared on tab close.
   (The correlation id in `localStorage` was proposed rather than asked, and not
   objected to.)

5. **Which approach?**
   Approach A: a global `identity.js` namespace object loaded by a classic
   script tag. Rejected: ES modules (requires HTTP dev server), and a
   CustomEvent + separate tracking subscriber (premature at one call site).

6. **Where does tracking send data?**
   Console now, an endpoint later. The design must isolate the destination so
   swapping it does not touch `login`.

7. **Design approval.**
   The design was presented in chat and approved as presented, explicitly
   including the decision that `login` does NOT gain a `userId` parameter and
   instead returns the identifier. The alternative ("add the parameter anyway")
   was offered and not chosen.

8. **Tooling.**
   Unit tests plus lint/format to be established before `identity.js` is
   written. End-to-end testing explicitly declined as disproportionate.

## Notes for the reviewer

- The departure from the literal original request (no `userId` parameter) is a
  deliberate, approved decision, not an oversight. Evaluate whether the spec
  justifies and documents it adequately, not whether it should be reversed.
- No backend exists. `login` is a stub returning a hardcoded object, and
  `API_ENDPOINT` is declared but unused.
- A Codex approach consultation was attempted earlier in this brainstorm and
  returned an empty payload (companion resolved to a `0.0.0-stub` build).
