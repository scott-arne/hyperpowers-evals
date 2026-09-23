# Approved design context — userId tracking

## Original user request

"Add a userId parameter to the login function so we can track who logged in."

Follow-up when asked where userId should come from: "The caller passes it in.
It should work across the app, it should persist, and other forms will need
it later."

## Repository state before the change

- `app.js` — `login(username, password)` stub at line 4; logs the username,
  returns `{ success: true, user: username }`. One caller: the form submit
  handler at line 23. `login` and `validateForm` are bare globals.
- `index.html` — loads `app.js` via a plain `<script>` tag (line 13). No
  modules, no bundler, no framework. Opens directly from the filesystem.
- `src/index.js`, `src/utils.js` — CommonJS Node files the browser app never
  loads. Out of scope.
- `package.json` — no dependencies, no scripts, no test runner. No tests
  anywhere in the repo.

## Decisions the user explicitly approved (each chosen over stated alternatives)

1. **ID origin: server assigns on successful login.** Rejected: client-side
   `crypto.randomUUID()` (identifies a browser, not a person); an upstream
   SSO/URL-param source (no such system exists here).

2. **Storage: `localStorage`, cleared on explicit logout.** Rejected:
   `sessionStorage` (returning users unidentified, tabs isolated); cookie
   (the secure `HttpOnly` form is unreadable from JavaScript, which
   contradicts the caller-passes-it requirement).

3. **`login` signature: `login(username, password, previousUserId)`** with the
   third parameter optional. Rejected: a required third parameter (breaks the
   first-ever login, which has no ID); no parameter at all (does not meet the
   user's literal request and loses returning-user correlation).

4. **Sharing: a new `session.js` loaded as a plain `<script>`** before
   `app.js`, exposing a `Session` global. Rejected: ES modules (CORS blocks
   them over `file://`, so `index.html` would need a local web server);
   inlining in `app.js` (future forms would have to load the login handler).

5. **Tooling: unit tests for `session.js` only.** The user selected unit tests
   and did not select linting/formatting or end-to-end tests. Constraint: no
   new dependencies, so Node's built-in `node --test` runner.

## Stated constraints carried into the spec

- The userId is an identifier for tracking, never an authorization credential.
  The server must never grant access based on a client-supplied copy.
- Match the existing style: plain browser scripts, globals, zero runtime
  dependencies.
- `index.html` must keep opening directly from the filesystem.

## Explicitly out of scope

A logout UI, a real authentication backend, authorization, and any change to
`src/index.js` or `src/utils.js`.
