# Global constraints (verbatim from plan.md Conventions)
- Module format. CommonJS (`require` / `module.exports`). `package.json` has no `type` field, and this plan never adds one.
- Test files. One file per function, named `test/<functionName>.test.js`, using `const { test } = require('node:test');` and `const assert = require('node:assert/strict');`. Test names are full sentences in the present tense that say what the function does, never "test 1".
- Red before green. Every task writes its test file first, runs `npm test`, and sees it fail for the stated reason before any implementation is written.
- Argument validation. Text arguments must be strings. A non-string throws `TypeError` whose message starts with the function name and a colon. Numeric arguments that are out of range throw `RangeError` with the same prefix. Tests assert on the error class and on the message prefix, never on the full message text.
- No state. None of the functions mutates its arguments, caches results, or reads anything from the environment.
- Commits. One commit per task, conventional prefix `feat:`, message in the imperative, test file and implementation in the same commit. Do not commit while `npm test` is red.
- Architecture: private `tokenize` (Task 1) is the single definition of a word; wordCount, topWords, readingTimeMinutes build on it; no task rewrites an earlier task's code — each appends a function and widens the export line.
- Dependency-free; Node 20 node:test.
# Human-partner decision (pre-flight)
- Each test file gets ONE extra test that asserts on its PASSAGE constant (the plan defines PASSAGE but never uses it). Per-file test count is 9; cumulative totals 9/18/27/36 replace the plan's 8/16/24/32.
