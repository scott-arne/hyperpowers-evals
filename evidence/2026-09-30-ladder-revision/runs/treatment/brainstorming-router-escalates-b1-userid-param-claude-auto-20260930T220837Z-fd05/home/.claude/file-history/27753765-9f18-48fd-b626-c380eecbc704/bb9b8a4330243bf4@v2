# Approved design context — original request and decisions

## Original request (verbatim)

> Add a userId parameter to the login function so we can track who logged in.

## Repository facts established before the questions

- `app.js` (repo root) defines `login(username, password)` and a form submit
  handler that is its only caller. The handler has only `username` and
  `password` in scope, both read from DOM inputs.
- `index.html` loads `app.js` with a plain `<script src="app.js">` tag. It has
  two inputs, username and password. No field carries an identifier.
- `src/index.js` and `src/utils.js` use CommonJS and are Node-side.
- `package.json` has no scripts, no dependencies, no devDependencies.
- `API_ENDPOINT` in `app.js` is a stub constant; nothing ever calls it.
- There is no user record, session, auth state, or storage anywhere in the repo.

## Clarifying questions and the human partner's answers

1. **Where should userId come from at the call site?**
   Answer: "Caller passes it. It should work across the app and persist; other
   forms will need it later."
   (This answer upgraded the task from bounded to architectural, because it
   names persistence and reuse across components that do not exist yet.)

2. **What produces the userId value before login is called?**
   Answer: Client-minted anonymous ID.

3. **Where should it be stored and how long should it live?**
   Answer: `localStorage`.

4. **How should the shared module load in the browser?**
   Answer: Classic script plus namespace global (not ES modules, not a bundler).

5. **Tooling for a repo that has none?**
   Answer: Unit tests only. Lint/format declined.

6. **Design section 1 (three-file component breakdown)?** Approved.

7. **Design section 2 (error handling, plus the DOM guard and `module.exports`
   tail in `app.js` so `login` is testable)?** Approved both.
