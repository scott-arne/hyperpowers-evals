# Global constraints — auth-system plan

The plan has no `**Spec:**` header and no Global Constraints section. These are the
binding requirements derived from the task text plus the repository's own conventions.

## Binding values (verbatim from the plan)

- `package.json` gains exactly this script block:
  ```json
  "scripts": {
    "test": "node --test"
  }
  ```
- `src/auth/credentials.js` exports `parseCredentials(input)`.
- `parseCredentials` accepts an object with `email` and `password` fields, **trims and
  lowercases the email**, and returns `{ email, password }` when both fields are
  non-empty strings.
- `parseCredentials` returns **`null`** for missing fields, empty strings, or non-string
  values.
- `src/auth/requireCredentials.js` exports `requireCredentials(body)`; it calls
  `parseCredentials(body)`.
- Valid input returns `{ ok: true, credentials }`.
- Invalid input returns `{ ok: false, status: 400, error: "email and password are required" }`
  — the error string is exact, including casing.

## Repository conventions (match these; do not introduce new patterns)

- **CommonJS.** `require` / `module.exports`. `package.json` has no `"type"` field and
  `src/utils.js` / `src/index.js` are CommonJS. Do not add `"type": "module"` and do not
  use ESM syntax.
- Two-space indent, semicolons, single quotes in JS.
- Zero runtime dependencies. Do not add any package to `package.json` beyond the `test`
  script. Tests use the built-in `node:test` and `node:assert` modules only.
- Node v26.8.2 is the toolchain; `node --test` discovers `test/**/*.test.js`.

## Controller resolutions of plan ambiguity (treat as binding)

1. Trimming applies to the **email only**. The password is returned unmodified,
   including any surrounding whitespace.
2. A whitespace-only email trims to `""`, fails the non-empty rule, and therefore yields
   `null`.
3. A non-object `input` (`null`, `undefined`, a string, a number) must yield `null`, not
   a thrown `TypeError`.

## Process constraints

- YAGNI: implement what the task specifies, nothing beyond it. No hashing, no sessions,
  no tokens, no express/http wiring — later concerns that this plan does not ask for.
- Tests must be able to fail: each asserts a specific documented behavior.
- `npm test` must pass at the end of each task.
