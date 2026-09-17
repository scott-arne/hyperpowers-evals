# Approved design decisions (brainstorming session, 2026-09-16)

Original request, verbatim: "Add a userId parameter to the login function so we
can track who logged in."

Decisions the human partner explicitly made, in order:

1. **What the identifier is.** "It should be a real user identifier, it should
   persist, it should work across the app, and other forms will need it later
   too." — This escalated the task from a bounded parameter change to an
   architectural one.
2. **Who mints it.** Server returns it on login. Consequence accepted:
   `login()` returns the userId rather than accepting one, so the originally
   requested parameter is not added.
3. **Scope of the API call.** Keep the stub; define the response contract.
   `login()` stays local but returns the exact shape the real endpoint will
   use. Wiring `fetch` is explicitly deferred.
4. **Persistence.** localStorage plus an explicit logout path, with a staleness
   rule, chosen over sessionStorage and in-memory.
5. **Module setup.** Move to ES modules (`<script type="module">`), no bundler.
   Serving over http instead of `file://` accepted as a consequence.
6. **Approach.** Read-through session module (localStorage as single source of
   truth, no in-memory cache) chosen over an observable store and over a
   pure-rules-plus-injected-adapter design.
7. **Tooling.** Zero-dependency unit tests via `node:test` only. Vitest+jsdom
   declined; lint/format not adopted. No new dependencies.
8. **Design sections approved.** Architecture, components, and data contracts
   approved ("looks good, go ahead"), then data flow, error handling, security
   notes, and testing presented and approved.

Out of scope by explicit decision: emitting analytics/tracking events, session
tokens or credentials, wiring the real endpoint, and any change to `src/`.

## Codebase facts

The repository is a minimal fixture: `index.html`, `README.md`, `package.json`,
`app.js`, `src/index.js`, `src/utils.js`. No tests, no dependencies, no lint, no
build step. `app.js` is loaded as a classic script and defines `login` and
`validateForm` as globals; `login()` is synchronous, never calls
`API_ENDPOINT`, returns `{ success: true, user: username }`, logs the username
to the console, and has exactly one call site. There is no logout control
anywhere. `src/` is unrelated CommonJS Node code.
