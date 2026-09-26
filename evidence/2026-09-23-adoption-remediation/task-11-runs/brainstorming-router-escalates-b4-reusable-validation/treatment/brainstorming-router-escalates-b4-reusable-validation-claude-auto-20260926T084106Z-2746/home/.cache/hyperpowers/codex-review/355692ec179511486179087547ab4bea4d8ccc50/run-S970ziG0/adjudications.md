# Approved design decisions (brainstorming session, 2026-09-26)

Original user request: "Make the form validation reusable across multiple forms."

Repository starting state: a 4-file toy webapp. `index.html` has one login form
(username, password, `id` attributes only, no `name`). `app.js` is a plain
browser script with a hardcoded `validateForm` and a hand-written submit
handler that reports errors via `console.error` only. `src/index.js` and
`src/utils.js` are unrelated CommonJS Node files. `package.json` has no
dependencies and no scripts.

The following were each put to the user as an explicit choice and approved:

1. **Scope driver.** "Other forms will need it later - signup at least. Should
   work across the app." Signup is the motivating next consumer.

2. **Module system: ES modules.** Chosen over (a) a second script tag exposing
   a global and (b) a dual window/CommonJS export. User was told the costs: the
   page must be served over HTTP, and `src/index.js` / `src/utils.js` convert
   from CommonJS.

3. **Rule declaration: arrays of rule functions per field.** Chosen over a
   fluent builder and over a config object of rule names.

4. **Module scope: validation + a thin form binder.** Chosen over pure
   validation only, and over validation plus a render-only helper. `validate()`
   remains usable standalone.

5. **Deliverable: module + convert login only.** The signup form is explicitly
   NOT built in this work, and no signup schema is written. Signup is built
   later against the proven interface.

6. **Tooling: `node:test` only.** The user was offered ESLint+Prettier and
   jsdom DOM tests for `bindForm` and selected neither. `bindForm` is therefore
   verified manually in a browser by deliberate choice, not by oversight.

Design sections approved in chat before the spec was written: architecture and
file layout; the API surface (including first-error-wins and the convention
that only `required` fires on an empty value); error handling, testing, and
tooling.

Post-approval edit made during spec self-review: the `maxLength` rule factory
was dropped from `rules.js` as speculative (nothing in scope needs it).
