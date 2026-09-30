# Approved design decisions (brainstorming adjudications)

## Original user requirement, verbatim

> Add a userId parameter to the login function so we can track who logged in.

## Reclassification

The request was initially classified as a bounded change. The human partner's
answer to the first clarifying question ("It should identify the actual
person, work across the app, and persist. Other forms will need it later
too.") introduced persistence, app-wide reuse, and future consumers that do
not exist in the repository. The task was escalated to the architectural path
mid-brainstorm. The `userId` parameter remains part of the outcome.

## Clarifying questions and answers

1. **Where does the identity come from?** — "It should identify the actual
   person, work across the app, and persist. Other forms will need it later
   too."
2. **Is there a real backend that will issue identity, or is this
   client-side?** — "Not sure yet." The source must remain a deferrable
   decision.
3. **Will anything make a trust or access decision on this id?** —
   "Descriptive only."
4. **Which tooling to establish (no test runner, linter, or formatter exists
   today)?** — Unit tests only. Lint and format were offered and not selected.

## Approved approach

Three approaches were presented:

- **A. Dedicated identity module with a pluggable source** — a new
  `identity.js` owning `getUserId` / `setUserId` / `clearUserId`, backed by
  `localStorage`.
- **B. Inline in `app.js`** — smallest diff, no new file.
- **C. A versioned session record** — persist an object with `source`,
  `createdAt`, `lastLoginAt` rather than a bare id.

The human partner approved the recommendation: **A, borrowing exactly one
element from C** — store a versioned envelope (`v`, `userId`, `source`,
`createdAt`) rather than a bare string, while the accessor returns just the id
string. The remainder of C (`lastLoginAt`, reconciliation logic) was
explicitly excluded under YAGNI until the backend question resolves.

Rationale recorded at approval time: A over B because the partner stated other
forms will need the identity, making the boundary worth establishing while
there are zero call sites to migrate; the borrow from C because the unresolved
backend question makes an unversioned bare string the one genuinely expensive
thing to undo.

Both design sections (1: architecture, components, data flow; 2: error
handling, testing, scope boundaries) were presented and approved by the human
partner before the spec was written.

## Codex approach gate

The approach gate fired and ran. Preflight returned `ok`
(codex-plugin-cc `0.0.0-stub`), but the one-shot `task` call returned an empty
payload `{}` — no approaches. Per the approach gate's contract this was noted
once and not retried. No independent Codex approaches were folded into the
shortlist above.

## Codebase facts the spec relies on

- `app.js` (28 lines) is the whole webapp: `API_ENDPOINT` (declared, unused),
  `login(username, password)` (a stub that logs and returns
  `{ success: true, user: username }`), `validateForm(formData)`, and a
  `submit` listener on `#login-form` that is `login()`'s only call site.
- `index.html` (15 lines) loads `app.js` with a bare `<script src>` tag, not
  `type="module"`. It has one form with `#username` and `#password` inputs.
- `src/index.js` and `src/utils.js` are an unrelated CommonJS `greet()`
  sample. `src/utils.js` uses `module.exports = { greet }`.
- `package.json` has no `scripts` field and no dependencies.
- No `userId`, identity, session, storage, analytics, or logging code exists
  anywhere in the repository. No `.gitignore` existed before this work.
- Branch `feature/webapp-enhancement`; working tree was clean at start.
