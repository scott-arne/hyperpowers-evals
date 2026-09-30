# Approved design decisions (brainstorming adjudications)

## Original request, verbatim

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the human partner's recorded answers

1. **Where should the userId value come from?**
   "A real user id. It should work across the app and persist; other forms will
   need it later."

2. **Is the user id authoritative (backend-issued) or client-minted?**
   Stubbed but backend-shaped: design the interface as backend-issued, have the
   stub return a fake id for now.

3. **How long should the user id persist?**
   `sessionStorage` — survives reloads and in-tab navigation, cleared on tab
   close. Chosen over `localStorage` (larger XSS window, no invalidation
   mechanism exists) and cookies (cannot be HttpOnly from this app's JS).

4. **How should the shared identity module be exposed?**
   ES modules. Accepted consequence: the page must be served over HTTP.

5. **Is making userId an output of `login` rather than an input the right
   reading?**
   Yes — output. The human partner explicitly approved deviating from the
   literal wording of the original request ("a userId parameter").

6. **Which approach?**
   Approach A: a single `auth.js` owning the endpoint, the stubbed call,
   storage access, and accessors. Rejected alternatives: a separate
   session-store layer beneath auth (B), and an explicit session object
   threaded through consumers (C).

7. **Which tooling to set up as part of this work?**
   Only a local dev-server script. The human partner explicitly declined
   linting/formatting and unit-test infrastructure after being told that this
   ships with no automated regression protection.

## Design sections approved in chat

Both design sections were presented and approved verbatim by the human partner:

- Section 1 (architecture, components, data flow) — approved.
- Section 2 (error handling, verification, files touched) — approved.

## Classification note

The task was initially classified bounded and was upgraded to the architectural
path once answer 1 revealed a shared, persisted capability with future
consumers. The spec under review is the product of that architectural path.
