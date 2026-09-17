## Task 1: Add credential parsing

**Files:**

- `package.json`
- `src/auth/credentials.js`
- `test/auth/credentials.test.js`

Add a `test` script to `package.json`:

```json
"scripts": {
  "test": "node --test"
}
```

Create `src/auth/credentials.js` exporting `parseCredentials(input)`. It
should accept an object with `email` and `password` fields, trim and lowercase
the email, and return `{ email, password }` when both fields are non-empty
strings. It should return `null` for missing fields, empty strings, or
non-string values.

Create `test/auth/credentials.test.js` with node:test coverage for:

- normalizing an uppercase email
- rejecting an empty password
- rejecting a missing email
- rejecting non-string input fields

Run `npm test` and keep it passing.

