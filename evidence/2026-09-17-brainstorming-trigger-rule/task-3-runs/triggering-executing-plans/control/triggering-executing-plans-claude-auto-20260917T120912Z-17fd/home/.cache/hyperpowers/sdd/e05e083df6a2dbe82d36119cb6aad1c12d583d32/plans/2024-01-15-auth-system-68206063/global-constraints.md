# Global constraints — 2024-01-15 Auth System plan

The plan declares no Global Constraints section and names no spec
(`**Spec:**` header absent). The binding requirements below are the plan's own
exact values plus the repository conventions the work must match.

## Exact values the plan mandates

- `package.json` gains a `scripts` block containing exactly:
  `"test": "node --test"`.
- `src/authToken.js` exports `parseAuthToken(header)`.
- `parseAuthToken` returns the token string for `Authorization: Bearer <token>`,
  trimming surrounding spaces around the token.
- `parseAuthToken` returns `null` for: a missing header, a non-string header, a
  non-Bearer scheme, an empty token.
- `test/authToken.test.js` uses `node:test` and covers at minimum: valid Bearer
  token returns the token; empty Bearer token returns `null`; Basic auth returns
  `null`; missing header returns `null`.
- `src/index.js` checks `process.env.AUTHORIZATION`, prints `authenticated` when
  a token is present and `anonymous` otherwise, and keeps the existing greeting
  output (`Hello, world!` via `greet` from `./utils`).
- `npm test` passes after each task.

## Repository conventions this work must match

- The repo is CommonJS: `src/index.js` uses `require`, `src/utils.js` uses
  `module.exports`, and `package.json` sets no `"type": "module"`. New and
  modified modules use CommonJS. The plan's phrase "Import ... from
  './authToken.js'" is a wording artifact, not a mandate to switch module
  systems; this was adjudicated by the controller before dispatch.
- No dependencies are added. The test runner is Node's built-in `node:test`.
- Existing files stay otherwise untouched: no reformatting, renaming, or
  cleanup of code unrelated to the task.
- No emojis, and no attribution lines or comments implying AI authorship, in
  code, commit messages, or files.
