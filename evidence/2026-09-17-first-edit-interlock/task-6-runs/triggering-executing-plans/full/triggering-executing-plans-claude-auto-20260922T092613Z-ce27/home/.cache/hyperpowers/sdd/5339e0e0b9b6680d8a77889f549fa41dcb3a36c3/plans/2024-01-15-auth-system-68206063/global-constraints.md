# Global constraints — 2024-01-15 auth system plan

The plan has no Global Constraints section and no `**Spec:**` header. These are
the binding constraints the controller derived from the repository as committed
at `e2e654c`; they bind every task in this plan.

- **Module system: CommonJS.** `package.json` has no `"type": "module"`, and
  `src/index.js` uses `const { greet } = require('./utils');`. New modules
  export with `module.exports` and consume with `require`. The plan's word
  "import" is generic phrasing, not a directive to use ESM syntax.
- **Test runner: `node --test`, no test framework dependency.** Tests use the
  built-in `node:test` and `node:assert` modules. `package.json` currently
  declares no dependencies and none are to be added.
- **`package.json` `scripts.test` must be exactly `node --test`** (Task 1's
  literal value). Test files live under `test/`, which `node --test` discovers.
- **Existing behavior is preserved.** `main()` in `src/index.js` keeps printing
  the existing greeting; the auth output is added alongside it, not in place of
  it. `src/utils.js` and `README.md` are out of scope.
- **`parseAuthToken(header)` is the only exported surface** of
  `src/authToken.js`, and it returns either the token string or `null` — never
  `undefined`, never a thrown error, for any input.
- **Scope discipline (YAGNI).** No token verification, no scheme beyond
  `Bearer`, no configuration surface, no logging framework. Nothing the plan
  does not ask for.
