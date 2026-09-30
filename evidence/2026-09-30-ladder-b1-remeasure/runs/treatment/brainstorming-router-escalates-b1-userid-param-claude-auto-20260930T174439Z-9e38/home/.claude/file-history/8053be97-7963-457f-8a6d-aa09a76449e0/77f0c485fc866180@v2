# Approved design context (brainstorming adjudications)

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Clarifying questions and the requester's answers

1. **Where does the userId come from?** — "The server returns it. Yes, it
   should persist, work across the app, and other forms will need it later."
2. **Does "across the app" mean separate HTML pages or views in one page?** —
   Not decided yet. Controller designs for the multi-page superset.
3. **What is the stored userId used for?** — Display and tracking only.
   Non-secret. The server re-derives real identity from its own session.
4. **Which approach?** — Approach A: a global `session.js` module exposing
   `Session.set/get/clear` over browser storage. No build step; matches the
   existing script-tag style. (Rejected: B, ES modules with an injected
   storage adapter — converts `app.js` to `type="module"` and removes the
   globals the page relies on. C, no client store, re-read from a `/me`
   endpoint — cleanest but requires a server endpoint that does not exist and
   a real login network call.)
5. **Storage lifetime?** — `sessionStorage`, cleared when the tab closes.
6. **Add linter / formatter / test runner?** — Neither; keep the repo bare.
   The requester was told explicitly that this means the session module ships
   with manual verification only and the storage-fallback branch unexercised.

## Design sections the requester approved

- **Section 1 (architecture, data flow, interface)** — approved. `login`
  keeps its `(username, password)` signature and instead returns
  `{ success, user, userId }`; `session.js` loads before `app.js`; the three
  functions are `set`/`get`/`clear`; no logout UI, no id display, no changes
  to `src/`.
- **Section 2 (error handling, files, verification)** — approved. try/catch
  around storage with an in-memory fallback; `set` ignores null/undefined;
  the handler stores only on `success === true`; three files touched; manual
  browser verification.

## Standing decisions that bound the spec

- A `userId` **parameter** on `login` was rejected on the evidence that the
  sole call site (`app.js:23`) has no value to supply.
- Any design in which the server trusts a client-supplied `userId` is out of
  scope and was declined as a broken auth model.
- Wiring the real `fetch` to `API_ENDPOINT` was offered and deferred as a
  separate, larger change.
