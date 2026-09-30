# Approved design decisions (brainstorming adjudications)

Original request, verbatim:

> Add a userId parameter to the login function so we can track who logged in.

Decisions confirmed by the human partner during brainstorming. Each was
presented with alternatives and explicitly chosen; they are settled inputs to
the spec, not open questions.

1. **Shape** — the ID is a **parameter on `login`**, not a value returned by
   it. Human partner's words: "It should be a parameter on login. It should
   work across the app and persist, and other forms will need it later."
   (Alternatives offered and rejected: return it from `login`; optional third
   parameter with no source.)

2. **Identity** — the ID is the **authenticated user ID issued by the
   backend**, not a locally-minted client/device identifier and not both as
   separate fields. Accepted consequence: the value is absent on a
   first-ever login.

3. **Purpose** — **record only**. The ID is tracking context; it never
   affects whether authentication succeeds. Clearing stored state on an
   account mismatch is folded in as a rule. (Alternatives rejected:
   influence authentication; account-switch guarding as the primary feature.)

4. **Approach** — **a separate `session.js`** exposing one global, loaded
   before `app.js`. (Alternatives rejected: inline store in `app.js`, because
   a second consumer is a stated requirement; pluggable storage backend with
   change notifications, as YAGNI.)

5. **Stub behavior** — the `login` stub returns a **marked placeholder**,
   `stub-<username>`, so the loop is observable and testable before a backend
   exists. (Alternative rejected: return no ID, leaving the feature dead code
   until an endpoint lands.)

6. **Tooling** — **unit tests via Node's built-in `node:test` only.** No new
   dependencies. Explicitly declined: lint/format (biome), end-to-end tests,
   fuzz testing.

Classification note: this task was initially classified bounded and was
upgraded to architectural when answer 1 revealed persistence and
cross-component reuse requirements the repository has no structure for.

## Codebase facts

- `app.js` is a 28-line browser global script loaded by a plain `<script>`
  tag. No modules, no build step, no bundler.
- `login` is a stub; it does not perform a network request. `API_ENDPOINT` is
  declared but unused. `login` has exactly one call site (`app.js:23`).
- `index.html` contains exactly one form, `#login-form`. The "other forms"
  referenced in decision 1 do not exist yet.
- `package.json` has no dependencies, devDependencies, or scripts. No test
  runner, linter, formatter, or CI config exists.
- `src/index.js` and `src/utils.js` are an unrelated Node CommonJS pair with
  no connection to the browser code.
