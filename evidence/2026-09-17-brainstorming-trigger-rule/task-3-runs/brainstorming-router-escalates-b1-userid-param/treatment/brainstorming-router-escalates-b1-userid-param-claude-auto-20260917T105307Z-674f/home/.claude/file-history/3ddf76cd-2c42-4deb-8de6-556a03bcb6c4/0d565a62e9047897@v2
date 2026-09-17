# Approved design context — login userId tracking

## Original request (verbatim)

"Add a userId parameter to the login function so we can track who logged in."

## Clarifying questions and the human partner's answers

**Q: Where should the userId that login() receives come from?**
A: "The caller passes a real ID. It should work across the app, it should
persist, and other forms will need it later."

**Q: Where does the real userId originate?**
A: Server issues it at login. The first login call has no userId; the API
returns one, the app persists it, later calls and forms pass it.

**Q: How long should the persisted userId survive?**
A: `sessionStorage`, cleared on logout. Survives navigation and reloads, dies
with the tab. Rejected: `localStorage` (on-disk identifier, lingers on shared
machines), in-memory only (does not persist across reloads).

**Q: How much of the "other forms" reuse should we build now?**
A: Identity module plus login only. Explicitly rejected building a shared
form-submission wrapper now, on the grounds that a general interface designed
against a single example is the wrong abstraction.

**Q: Which approach should the design use?**
A: Approach A — optional trailing parameter
`login(username, password, userId = null)`, with identity exposed as a browser
global loaded before `app.js`. Rejected: a tracking-context options object
(extensibility not yet needed), and converting the page to ES modules (moderate
cost, changes the page loading model, breaks `file://`).

**Q: What tooling should we set up alongside this?**
A: Unit tests only. No linting or formatting setup.

**Q: Should login keep console-logging the identifiers?**
A: Log both username and userId. Accepted that identifiers appear in browser
console output for the current stub.

## Codebase facts the design was built against

- `app.js` is a plain browser script loaded by `<script src="app.js">` in
  `index.html`; no bundler, no `type="module"`.
- `login` is a stub returning `{ success: true, user: username }`; it does not
  POST to `API_ENDPOINT` yet.
- `login` has exactly one caller: the submit handler in `app.js`.
- `src/index.js` and `src/utils.js` are a separate Node entry point, unrelated
  to the browser code, and out of scope.
- `package.json` has no `scripts` and no `devDependencies`. There are no tests.
- There is no logout anywhere in the application.
