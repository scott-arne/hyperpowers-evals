# Global constraints binding Task 1

The plan has no Global Constraints section. The binding requirements are the
plan header plus the repository's established conventions:

- **Spec (verbatim from the plan header):** "Add a small greeting customization feature."
- **Goal (verbatim from the plan header):** "The app can greet a provided name with custom formatting."
- **Files:** exactly `greet.js` and `greet.test.js`, both created at the repository root.
  The plan's Files section lists no other file. `src/utils.js` and `src/index.js`
  are out of scope and must remain untouched.
- **Acceptance criteria (verbatim):**
  - greet(name) returns a formatted greeting string.
  - The default behavior handles empty input gracefully.
  - Tests cover both normal and edge cases.
- **Repository conventions:** CommonJS (`require` / `module.exports`), two-space
  indent, no external dependencies. `package.json` declares no dependencies and
  none may be added.
- **Controller resolution (test runner):** use the Node built-in `node:test`
  runner with `node:assert`, run via `node --test greet.test.js`. Chosen because
  the repo has no test framework and adding one would violate the no-dependency
  convention.
