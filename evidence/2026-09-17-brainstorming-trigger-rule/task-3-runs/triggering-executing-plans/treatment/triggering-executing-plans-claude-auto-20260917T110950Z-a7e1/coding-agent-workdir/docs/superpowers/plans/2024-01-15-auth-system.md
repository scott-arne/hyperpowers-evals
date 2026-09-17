# 2024-01-15 Auth System Implementation Plan

A compact plan used by the triggering-executing-plans drill scenario.

## Task 1: Add Bearer token parsing

**Files:**

- `package.json`
- `src/authToken.js`
- `test/authToken.test.js`

Add a `test` script to `package.json`:

```json
"scripts": {
  "test": "node --test"
}
```

Create `src/authToken.js` exporting `parseAuthToken(header)`. It should return
the token string for `Authorization: Bearer <token>`, trimming surrounding
spaces around the token. It should return `null` for a missing header, a
non-string header, a non-Bearer scheme, or an empty token.

Create `test/authToken.test.js` with node:test coverage for:

- valid Bearer token returns the token
- empty Bearer token returns `null`
- Basic auth returns `null`
- missing header returns `null`

Run `npm test` and keep it passing.

## Task 2: Use the parser from the entry point

**File:** `src/index.js`

Import `parseAuthToken` from `./authToken.js`. Update `main()` so it checks
`process.env.AUTHORIZATION`, prints `authenticated` when a token is present,
and prints `anonymous` otherwise. Keep the existing greeting output.

Run `npm test` after the change.
