# Approved design decisions (user-adjudicated during brainstorming)

Original request, verbatim:

> Add a userId parameter to the login function so we can track who logged in.

The task was classified bounded, then upgraded to architectural when the user
clarified the identifier does not exist yet, must persist, and must be reusable
by forms that do not exist.

Decisions the user explicitly chose (each presented with alternatives and
tradeoffs; the user selected these):

1. **ID anchor** — server-assigned account ID. Rejected: client-minted device
   ID; per-session-only ID.
2. **Backend** — no real endpoint exists; keep the client-side stub but return
   the real response shape and pin the contract in the spec. Rejected: writing a
   live fetch; treating backend changes as in scope.
3. **Storage** — `localStorage`. Rejected: JS-readable cookie; `httpOnly`
   cookie (the latter rejected because client forms must read the value).
   Recorded constraint: the value is a correlation key, never an auth credential.
4. **Tracking scope** — attach-only; `userId` rides in request payloads. Rejected:
   a client-side analytics/audit event collector (explicitly deferred to a
   separate spec); console-logging-only.
5. **Approach** — approach A: identity module owns storage; `userId` flows OUT of
   `login()` in its return value. Rejected: approach B (`userId` as an optional
   third input for return-visit correlation); approach C (options-object
   signature). Note: approach A means the literal "add a userId parameter" is
   NOT implemented; the user was told this explicitly and chose A anyway.
6. **Tooling** — unit tests only. Explicitly declined: lint/format
   infrastructure; end-to-end browser tests.
7. **Module system** — `"type": "module"` in `package.json`, accepting the
   conversion of the two unrelated `src/` CommonJS files. Rejected: `.mjs`
   extension (MIME risk); browser-global convention.

The user approved the architecture, data model, and login contract sections
before the spec was written.

## Codebase facts

- Six-file fixture webapp; no build system, bundler, linter, or test runner.
- `package.json` has no dependencies, devDependencies, or scripts.
- `app.js` is a browser-global script: `login(username, password)` is a
  synchronous stub with one caller at `app.js:23` inside the form submit handler.
- `src/index.js` / `src/utils.js` are an unrelated CommonJS `greet` pair that the
  page never loads.
- No existing storage-access code, no logout path, no session concept, no other
  forms yet.
- Branch `feature/webapp-enhancement`; working tree was clean at start.
