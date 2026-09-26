# Approved design context — logging subsystem

## Original user request (verbatim)

"Add logging to the app so we can debug production issues."

## Clarifying questions and the human partner's answers

1. **Where does the code that needs production logging actually run?**
   Answer: **Both** — the browser (`app.js`) and Node (`src/index.js`).

2. **What kind of production problem are you trying to diagnose right now?**
   Answer: **Errors and failures** + **Behavioral trail**. Performance/timing
   was offered and NOT selected — it is deliberately out of scope.

3. **How far should this go on the browser side?** (console-only vs.
   buffer-and-ship-on-error vs. third-party service)
   Answer: **Console-only, transport-ready** — ship the logger and redaction
   now with console output only, behind a pluggable sink so a transport can be
   added later without changing call sites. Rationale accepted: the receiving
   endpoint does not exist (the API call in `app.js` is a stub).

4. **Hand-rolled logger or a library?**
   Answer: **Hand-rolled, zero runtime dependencies.** pino/winston/debug
   explicitly declined.

5. **Structure review (presented in chat): one dual-mode `src/logger.js`,
   level API, JSON records, pluggable sink, plus an optional ring buffer.**
   Answer: "Structure looks right. Include the ring buffer."

6. **Usernames are often email addresses — how should the logger treat them?**
   Answer: **Truncate** to first 2 chars + length (e.g. `jo***(11)`).
   Full logging and full redaction both declined.

7. **Which tooling should be set up alongside this?**
   Answer: **Unit tests via built-in `node:test` only.** Linting/formatting
   and end-to-end tests were offered and NOT selected — deliberately deferred.

## Codebase facts the design rests on

- `app.js` is loaded by `index.html` via a plain `<script src="app.js">`.
  There is no bundler and no module system on the browser side.
- `src/index.js` uses CommonJS `require('./utils')`.
- `package.json` has no dependencies, no devDependencies, and no scripts.
- `app.js:5` currently logs the raw username: `console.log("Logging in:", username)`.
- `app.js:6` marks the API call as a stub: "would POST to API_ENDPOINT in a real app".
- `src/index.js` is a hello-world that calls `greet('world')` from `src/utils.js`.
- Four `console.*` call sites exist in `app.js`; one in `src/index.js`.

## Scope boundaries the human partner set

Out of scope by explicit decision, not oversight: network transport, remote
log collection, third-party error services, performance/timing
instrumentation, linting/formatting, end-to-end tests, any bundler or build
step.
