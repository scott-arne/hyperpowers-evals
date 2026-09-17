## Task 2: Add request validation helper

**Files:**

- `src/auth/requireCredentials.js`
- `test/auth/requireCredentials.test.js`

Create `src/auth/requireCredentials.js` exporting
`requireCredentials(body)`. It should call `parseCredentials(body)` and
return `{ ok: true, credentials }` for valid input. For invalid input, return
`{ ok: false, status: 400, error: "email and password are required" }`.

Create `test/auth/requireCredentials.test.js` covering the success and invalid
input paths.

Run `npm test` after the change.
