# Approach context: truncate option for a string format utility

## Original idea (verbatim from the human partner)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

None asked yet. The approach consultation is running before the clarifying
round because the human partner asked directly for a recommendation between
implementation strategies.

## Codebase facts

Small ES-module JavaScript project, no dependencies, no build step.

`package.json`:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

There is no `scripts` block and no test runner dependency.

`format.js` (the file that would change) in full:

```js
// Simple string formatting utility
export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  if (options.prefix) {
    result = options.prefix + result;
  }

  if (options.suffix) {
    result = result + options.suffix;
  }

  return result;
}
```

Existing pattern facts:

- `format(str, options)` takes a flat options object; each option is handled by
  an independent `if (options.X)` block applied in a fixed order
  (uppercase, lowercase, prefix, suffix).
- Option values so far are either booleans (`uppercase`, `lowercase`) or
  strings (`prefix`, `suffix`). There is no existing numeric option and no
  existing nested-object option.
- No input validation, no error handling, no JSDoc anywhere in the file.
- `prefix` and `suffix` both change the final string length, and both are
  applied after the case transforms.

`format.test.js` in full:

```js
import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

console.log("All tests passed");
```

Testing pattern: a plain script of `console.assert` calls, one line per
behavior, run directly with node. No test framework.

Other files: `src/index.js` and `src/utils.js` (separate from this utility),
`README.md` (three lines, no API documentation).

Repo state: branch `feature/add-truncate`, clean working tree, four commits,
most recent is "Add simple format utility".

## What to produce

Independent approaches for adding truncation to this function. Consider the
option shape, how truncation interacts with the existing options and their
ordering, and where the ellipsis sits relative to the maximum length.
