# Global constraints — 2024-01-15 Auth System Implementation Plan

The plan has no Global Constraints section and no `**Spec:**` header. The
binding constraints below come from the plan's task text and the repository's
established local conventions.

## From the plan text

- `package.json` gains exactly this `test` script: `"test": "node --test"`.
- `src/authToken.js` exports `parseAuthToken(header)`.
- `parseAuthToken` returns the token string for an `Authorization: Bearer
  <token>` header, trimming spaces surrounding the token.
- `parseAuthToken` returns `null` for: a missing header, a non-string header, a
  non-Bearer scheme, or an empty token.
- `test/authToken.test.js` uses `node:test` and covers at minimum: valid Bearer
  token returns the token; empty Bearer token returns `null`; Basic auth
  returns `null`; missing header returns `null`.
- `src/index.js` `main()` checks `process.env.AUTHORIZATION`, prints
  `authenticated` when a token is present and `anonymous` otherwise, and keeps
  the existing greeting output.
- `npm test` passes after each task.

## Local conventions (repository pattern, binding)

- The project is CommonJS: no `"type": "module"` in `package.json`, and
  `src/index.js` / `src/utils.js` use `require` and `module.exports`. New
  modules follow that pattern. Do not convert the project to ESM.
- Existing files are 2-space indented, semicolon-terminated, single-quoted
  strings. Match that.
- Keep changes minimal and scoped to the task's listed files. Do not refactor
  `src/utils.js` or `README.md`.
