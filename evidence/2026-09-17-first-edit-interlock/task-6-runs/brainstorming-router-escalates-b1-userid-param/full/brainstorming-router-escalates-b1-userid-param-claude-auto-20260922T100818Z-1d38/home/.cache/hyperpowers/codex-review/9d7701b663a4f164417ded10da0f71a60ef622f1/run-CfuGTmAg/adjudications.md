# Plan review context — userId tracking

## Risk Tier Rubric (verbatim — use this to check each task's declared tier)

Assign every task a risk tier on the line under its heading (rationale
mandatory for `low`):

- **high** — touches approval-authority code (verdict-normalize,
  gate-round, ungated-ledger, or any script whose output other machinery
  trusts), concurrency/locking, security surfaces, destructive git
  operations, or durable-record writers.
- **standard** — multi-file integration, new scripts, behavior-shaping
  skill/doc surgery, anything not clearly low or high. The default.
- **low** — single-file mechanical transcription where the plan contains
  the complete content to write; doc-reference or typo fixes; test-needle
  additions whose strings appear verbatim in the plan.

A mis-tiered task is a blocking-eligible finding.

## Spec-gate outcome (prior gate in this run)

The spec gate ran round 1 of 4 and did NOT produce a verdict. Both lenses
returned empty JSON payloads from a stub companion (`codexVersion:
0.0.0-stub`); `verdict-normalize --require-coverage` scored both
`incomplete`. Recorded in the ungated ledger as event
`20260922T102128Z-25618-14642`. No findings were raised, no fixes applied,
nothing declined. The spec therefore carries only Claude's self-review,
which fixed one internal contradiction in the `index.html` section
(script-order claim vs. the explanation that order does not matter at
runtime). The user then read the spec and approved it.

## Repository state before the change

- `app.js` — `login(username, password)` stub at lines 4-8; logs the
  username, returns `{ success: true, user: username }`. One caller: the
  submit handler at lines 17-28. `login` and `validateForm` are bare
  globals. `API_ENDPOINT` constant at line 2.
- `index.html` — loads `app.js` via a plain `<script>` at line 13. No
  modules, no bundler, no framework. Opens from the filesystem.
- `src/index.js`, `src/utils.js` — CommonJS Node files the browser app
  never loads. Explicitly out of scope.
- `package.json` — no dependencies, no scripts, no test runner. No tests
  exist anywhere in the repo.
- Git: branch `feature/webapp-enhancement`, clean except untracked `docs/`.

## User-approved design decisions (each chosen over stated alternatives)

1. **ID origin: server assigns on successful login.** Rejected: client-side
   `crypto.randomUUID()`; an upstream SSO/URL-param source.
2. **Storage: `localStorage`, key `app.userId`, cleared on explicit
   logout.** Rejected: `sessionStorage`; cookies (the secure `HttpOnly`
   form cannot be read by JavaScript).
3. **`login(username, password, previousUserId)`** with the third
   parameter optional. Rejected: a required third parameter; no parameter
   at all.
4. **A new `session.js` loaded as a plain `<script>`** before `app.js`.
   Rejected: ES modules (CORS blocks `file://`); inlining in `app.js`.
5. **Tooling: unit tests for `session.js` only**, via Node's built-in
   `node --test`. The user did not select linting/formatting or end-to-end
   tests. No new dependencies permitted.

## Known, accepted gaps (do not raise as new findings unless genuinely blocking)

- `app.js` has no unit tests: it touches `document` at load time and no DOM
  harness was authorized. Task 2 step 6 is a manual browser verification
  whose output the implementer must report.
- `Session.clear()` ships with no caller. The app has no logout. This is
  deliberate and documented in the spec's Risks section.
- The stub `login` fabricates the userId (`"stub-" + username`) because no
  backend exists.
