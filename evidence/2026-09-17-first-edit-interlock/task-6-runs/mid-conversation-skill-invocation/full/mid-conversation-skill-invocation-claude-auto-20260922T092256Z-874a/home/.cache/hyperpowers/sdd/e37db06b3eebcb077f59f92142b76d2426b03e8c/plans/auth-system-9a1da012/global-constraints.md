# Global constraints — auth-system plan

The plan has **no Global Constraints section and no spec file** (`**Spec:**` is
absent). There is therefore no binding authority above the plan's own task text.
The constraints below are (a) exact values quoted verbatim from the plan and
(b) two controller resolutions of ambiguity the plan left open, recorded here so
reviewer and gate hold the implementer to the same reading.

## Verbatim from the plan (binding, exact values)

- `package.json` gains exactly this script block:

  ```json
  "scripts": {
    "test": "node --test"
  }
  ```

- `src/auth/credentials.js` exports `parseCredentials(input)`.
  - Accepts an object with `email` and `password` fields.
  - Trims **and** lowercases the email.
  - Returns `{ email, password }` when both fields are non-empty strings.
  - Returns `null` for missing fields, empty strings, or non-string values.
- `test/auth/credentials.test.js` uses **node:test** and covers at minimum:
  normalizing an uppercase email; rejecting an empty password; rejecting a
  missing email; rejecting non-string input fields.
- `src/auth/requireCredentials.js` exports `requireCredentials(body)`.
  - Calls `parseCredentials(body)`.
  - Valid input returns `{ ok: true, credentials }`.
  - Invalid input returns
    `{ ok: false, status: 400, error: "email and password are required" }`
    — the error string is exact, including case and wording.
- `test/auth/requireCredentials.test.js` covers the success and invalid-input
  paths.
- File paths are exact. No files beyond those listed per task.

## Controller resolutions (ambiguity the plan left open)

1. **Module system: CommonJS.** `package.json` has no `"type"` field, so Node
   treats `.js` as CommonJS. Both modules use `module.exports` / `require`.
   This was a controller decision, not a plan requirement — flag a genuine
   defect in it rather than treating it as sacred, but do not flag ESM-vs-CJS
   as a finding on style grounds alone.
2. **Trim coverage.** The plan's prose requires trimming the email but its
   listed test cases do not name a trim case. Trimming is binding behavior and
   must be tested; the listed four cases are a minimum, not a ceiling.

## Environment

- node v26.9.0. `node --test` auto-discovers `test/**/*.test.js`.
- `package.json` has no dependencies; nothing to install.
- Scope discipline (YAGNI): no logging, config, hashing, validation frameworks,
  or exported helpers the plan did not ask for.
