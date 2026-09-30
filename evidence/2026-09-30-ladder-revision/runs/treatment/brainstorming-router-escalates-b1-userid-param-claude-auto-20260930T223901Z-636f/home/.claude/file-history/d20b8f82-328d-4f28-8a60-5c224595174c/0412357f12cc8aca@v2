# Approved design decisions (brainstorming)

Original request, verbatim:

> Add a userId parameter to the login function so we can track who logged in.

The request was escalated during brainstorming: bounded -> architectural, after
the human partner said the identity "should work across the app and persist;
other forms will need it later."

Decisions the human partner explicitly approved, in order:

1. **What persists:** a durable client-side identity (session), NOT a
   server-side audit trail of login events, and not both staged.
2. **Source of the id:** server-issued. `login()` returns it; the stub
   fabricates that response shape until `API_ENDPOINT` is real. Rejected:
   client-generated UUID; reusing `username` as the id.
3. **Lifetime:** `localStorage` (persistent across browser restart, shared
   across tabs). Rejected: `sessionStorage`; `localStorage` with an expiry
   stamp.
4. **Structure:** approach C — a session store with an injected storage
   backend plus the repo's first unit tests. Rejected: approach A, a plain
   `Session` global; approach B, converting the app to ES modules.
5. **`login()` async:** becomes `async` now, while there is a single caller,
   rather than taking the break later when `API_ENDPOINT` becomes real.
6. **Tooling:** unit tests only (`node:test`). The human partner explicitly
   declined lint/format and end-to-end tests.
7. **Section 1 (architecture and components):** approved as presented,
   including the explicitly out-of-scope logout control.
8. **Section 2 (data flow and error handling):** approved as presented,
   including the in-memory degradation on storage failure.
9. **Section 3 (testing):** approved as presented, including the stated
   coverage gap around the DOM submit path.

Codebase facts the spec was written against:

- Repo contains `README.md`, `app.js`, `index.html`, `package.json`,
  `src/index.js`, `src/utils.js`. Branch `feature/webapp-enhancement`.
- `package.json` has no dependencies, no devDependencies, no scripts.
- `app.js` is a classic browser script (globals, no module system) loaded by
  `index.html` via `<script src="app.js">` with no `type="module"`.
- `login(username, password)` is synchronous, logs the username, and returns
  `{ success: true, user: username }` from a stub body. `API_ENDPOINT` is
  declared but unused. It has exactly one caller, `app.js` line 23.
- `src/index.js` and `src/utils.js` are an unrelated CommonJS Node module not
  loaded by the page.
- No session, storage, auth, routing, state-management, or logout code exists
  anywhere in the repo.
