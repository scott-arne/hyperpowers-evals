# Approved design context — shared logging module

## Original user request (verbatim)

> Add logging to the app so we can debug production issues.

## Repository facts at time of design

Six files, no dependencies, no build step, no tests, no linter.

- `index.html` — login form; loads `app.js` via a classic `<script>` tag.
- `app.js` — browser login handler. Three `console.*` calls today:
  `console.log("Logging in:", username)`, `console.log("Login result:", result)`,
  `console.error("Validation error:", validation.error)`. Contains
  `const API_ENDPOINT = "https://api.example.com/login"` and a stubbed `login()`
  that returns `{ success: true, user: username }` without making a request.
- `src/index.js` — Node entry point, CommonJS, `console.log(greet('world'))`.
- `src/utils.js` — CommonJS, exports `greet`.
- `package.json` — `main: src/index.js`, no dependencies, no scripts.
- Git branch `feature/webapp-enhancement`; working tree clean at design time.

## Clarifying questions and the project owner's answers

1. **Which part of the app needs logging?** — *Both, via a shared module.*
   (Alternatives offered: browser only; Node only.)

2. **Where should the logs go?** — *Console output now, plus a documented
   transport seam for attaching a remote sink later.*
   (Alternatives offered: console + remote sink built now — declined because no
   collector endpoint exists and `api.example.com` is a stub; console only with
   no seam — declined.)

3. **How should the shared module be loaded by both environments?** — *UMD
   wrapper.* (Alternatives offered: convert the project to ES modules — declined
   because it edits files unrelated to logging and breaks `file://` loading;
   shared core plus per-environment adapters — declined as over-engineered at
   this size.)

4. **How should credentials be handled?** — *Central denylist inside the logger*,
   with call-site discipline retained as a convention.
   (Alternatives offered: call-site discipline alone; strict allowlisting.)

5. **What tooling should be set up alongside?** — *Unit tests via Node's built-in
   `node:test` runner only.* No linter or formatter. This keeps the project at
   zero dependencies.

## Additional decision made during design presentation and approved

`src/index.js`'s `console.log(greet('world'))` is program output rather than a
diagnostic, so it stays as a plain `console.log`; `logger.debug` calls are added
around `main()` entry and exit instead. The project owner was asked specifically
about this point and approved it.

## Standing project constraints (from CLAUDE.md)

- Minimal, focused changes; do not touch files unrelated to the task.
- No emojis, and no attribution lines implying AI assistance, anywhere.
- Design documents are not committed unless explicitly requested.
