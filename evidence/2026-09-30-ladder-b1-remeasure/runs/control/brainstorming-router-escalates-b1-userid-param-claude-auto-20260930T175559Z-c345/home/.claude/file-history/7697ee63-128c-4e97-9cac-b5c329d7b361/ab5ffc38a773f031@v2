# Approved design context — login tracking

## Original user request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Decisions approved by the human partner during brainstorming

Each was presented as a comparison and explicitly chosen. Treat these as
settled constraints, not open questions. A finding that merely re-opens one of
these without new evidence is out of contract.

1. **`userId` is returned by `login()`, not passed into it.** The literal
   request (an inbound parameter) was rejected because the only call site has
   no `userId` to supply.
2. **"Track" means a real tracking module**, not an inline `console.log`. This
   is what escalated the task from a bounded change to an architectural one.
3. **Async `track()` over a console sink.** No backend endpoint exists; no
   third-party analytics SDK.
4. **ES modules, page served over a local static server.** `file://` support is
   explicitly dropped. No bundler.
5. **Two events: `login.success` and `login.failure`.** Client-side validation
   rejects are deliberately not tracked. Identity is nullable on failure.
6. **A `withTracking` decorator at the composition root** owns the join, rather
   than tracking inside `login()` or in the submit handler.
7. **`login()` stays offline but becomes fail-capable** — no real `fetch`,
   because `api.example.com` is not a live host and no response contract exists.
8. **Sink injected via a `createTracker(sink)` factory**, for testability.
9. **On `login()` throwing: emit `login.failure` with `reason: "error"`, then
   rethrow.**
10. **Tooling: unit tests via `node:test` only.** Linting, formatting,
    end-to-end tests, and mutation testing were all explicitly declined.

## Codebase facts

Four-file test project on branch `feature/webapp-enhancement`, clean tree.

- `package.json` — no dependencies, no scripts, no `"type"` field.
- `index.html` — loads `<script src="app.js">` (classic script, line 13); form
  `#login-form` with `#username` and `#password`.
- `app.js` — 28 lines, browser globals. Holds `login()`, `validateForm()`, and
  the submit handler. `login()` is a sync stub that always returns
  `{ success: true, user: username }` and never contacts `API_ENDPOINT`.
- `src/index.js`, `src/utils.js` — CommonJS, Node-only, unrelated to login.
- No tracking, telemetry, logging, or test files exist.
