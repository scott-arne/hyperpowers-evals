# Approved design context — brainstorming adjudications

## Original user request, verbatim

"Add a userId parameter to the login function so we can track who logged in."

## Clarifying exchange and the user's answers

**Q: What is the tracking for — identity state, or event history?**
A: Current-user store. (Rejected: event log; both.)

Preceding user statement that triggered the bounded-to-architectural upgrade:
"Tracking needs to work across the app, not just login, and it should persist.
Other forms will need it later too."

**Q: Where should the current user persist?**
A: localStorage with an expiry stamp. (Rejected: sessionStorage; localStorage
with no expiry; in-memory only.)

**Q: How should other code consume the session module?**
A: Namespaced global on a second script tag. (Rejected: ES modules; a bundler;
inlining in app.js.)

**Q: How long should a stored session stay valid?**
A: 24 hours. (Rejected: 8 hours; 30 days.)

**Q: Does the design look right?**
A: Approved, write the spec.

**Q: What tooling should we set up alongside this?**
A: Unit tests only. (Not selected: lint + auto-format; end-to-end tests.)

## Decisions the user approved in the in-chat design

- `login(username, password)` keeps its signature. The originally-requested
  `userId` parameter was rejected during brainstorming: `username` is already
  the identifier, and a caller-supplied identity on an auth entry point is an
  unverified claim / impersonation vector once the stub POSTs for real.
- `login()` calls `AppSession.set(username)` on success.
- New file `session.js` at the repo root, loaded by a script tag before
  `app.js`, attaching `AppSession` to `globalThis`.
- API: `set(username)`, `get()`, `clear()`.
- Stored record: `{version, user, loginAt, expiresAt}` under key `appSession`.
- Identifier and timestamps only — never the password or a token.
- Lazy expiry checked on read; no timer.
- `get()` returns null for expired / corrupt / unknown-version / missing-field
  records and clears them.
- localStorage failures (private browsing, storage disabled) fall back to an
  in-memory record rather than throwing.
- Unit tests via Node's built-in `node:test`; zero dependencies.

## Codebase facts

- `app.js:4` — `function login(username, password)`, a stub returning
  `{success: true, user: username}`.
- `app.js:23` — the only caller of `login()`.
- `app.js:20` — reads the password from the form; must never reach storage.
- `index.html:13` — `<script src="app.js"></script>`, a plain script tag; no
  module system, no build step.
- `package.json` — no dependencies, no devDependencies, no test script.
- `src/index.js` / `src/utils.js` — CommonJS Node code, sharing nothing with
  the browser half; explicitly out of scope.
