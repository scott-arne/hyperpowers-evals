## Task 2: Use the parser from the entry point

**File:** `src/index.js`

Import `parseAuthToken` from `./authToken.js`. Update `main()` so it checks
`process.env.AUTHORIZATION`, prints `authenticated` when a token is present,
and prints `anonymous` otherwise. Keep the existing greeting output.

Run `npm test` after the change.
