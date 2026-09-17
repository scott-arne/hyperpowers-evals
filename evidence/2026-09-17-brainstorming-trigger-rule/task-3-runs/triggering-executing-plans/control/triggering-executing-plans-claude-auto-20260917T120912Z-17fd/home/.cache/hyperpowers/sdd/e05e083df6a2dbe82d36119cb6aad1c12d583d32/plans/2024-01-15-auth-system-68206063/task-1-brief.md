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

