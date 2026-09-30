# Approved design context (adjudicated decisions)

## Original user requirements (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

> It should persist and work across the app; other forms will need it later.

## Decisions the user explicitly approved during brainstorming

These are settled. A finding that re-opens one of them is out of scope unless
it shows the decision is unworkable as specified.

1. **Login derives the userId; it is NOT added as a parameter.** The user chose
   this over the literal request of adding a `userId` parameter, after being
   shown that the form supplies no user id and nothing upstream knows one.
2. **In-memory only for now.** Not required to survive a page reload. Future
   storage backing must be introduceable without changing how callers read the
   value.
3. **Namespaced global (`window.AppSession`) via a classic `<script>` tag.**
   Chosen over converting the page to ES modules (rejected: `type="module"` is
   CORS-blocked over `file://` and the repo has no static server, no
   dependencies, and no `scripts`) and over adding a bundler (rejected as
   unjustified at this size).
4. **The stub `login` returns a placeholder userId** (`"stub-" + username`),
   chosen over returning `null`, so consumer forms can be built before real
   auth exists.
5. **Tests via Node's built-in runner** (`node --test`, zero dependencies),
   chosen over no test infrastructure and over also adding a linter.

## Repository facts

- Six files before this change: `index.html`, `app.js`, `README.md`,
  `package.json`, `src/index.js`, `src/utils.js`. Branch
  `feature/webapp-enhancement`, working tree clean before the spec was written.
- `index.html` loads `app.js` via a classic `<script src="app.js">` tag; it is
  not `type="module"`. It is the only HTML file.
- `package.json` has no dependencies, no devDependencies, no `scripts`, and no
  `"type"` field.
- `src/` is CommonJS and Node-side (`main: src/index.js`); it is not loaded by
  the page and shares no code with `app.js`.
- `login` in `app.js` is a stub: it never contacts `API_ENDPOINT` and returns a
  hardcoded `{ success: true, user: username }`.
- The repo has no existing tests, linter, build step, router, framework,
  storage, logging, telemetry, or identity code.

## Gate note

An earlier Codex approach-gate call in this brainstorm returned an empty
result, so no independent Codex approaches were folded into the design. This
spec review is Codex's first look at the work.
