# Global constraints (verbatim from plan.md ## Conventions)

- **Module format.** CommonJS (`require` / `module.exports`). `package.json` has no `type` field, and this plan never adds one.
- **Test files.** One file per function, named `test/<functionName>.test.js`, using `const { test } = require('node:test');` and `const assert = require('node:assert/strict');`. Test names are full sentences in the present tense that say what the function does ("counts hyphenated compounds as one word"), never "test 1".
- **Red before green.** Every task writes its test file first, runs `npm test`, and sees it fail for the stated reason before any implementation is written. A test that has never failed has not shown that it can.
- **Argument validation.** Text arguments must be strings. A non-string throws `TypeError` whose message starts with the function name and a colon. Numeric arguments that are out of range throw `RangeError` with the same prefix. Tests assert on the error class and on the message prefix, never on the full message text.
- **No state.** None of the functions mutates its arguments, caches results, or reads anything from the environment. Calling a function twice with the same arguments returns equal values.
- **Commits.** One commit per task, conventional prefix `feat:`, message in the imperative, and the test file and implementation in the same commit. Do not commit while `npm test` is red.
- **Scope.** English prose only. Right-to-left scripts, languages without spaces between words, and markup stripping are out of scope; the notes in each task name the specific cases that are deliberately left alone.

# Pre-flight decision (human partner)
ADD missing tests — keep the plan's 8 tests per file, add the passage tests the plan's prose describes (using PASSAGE), and add tests for stated rules that have none; test counts therefore exceed the plan's 8/16/24/32.
