# Approach context: truncate option for `format()`

## Original idea (verbatim, from the human partner)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: What should `maxLength` bound?**
Options offered: (1) the final output, ellipsis included — truncation runs last,
after prefix/suffix, output never exceeds `maxLength`; (2) the source string,
with `'...'` appended on top, so output may exceed `maxLength`; (3) the final
output but with `'...'` appended beyond `maxLength`.

**A: Option 1 — the final output, ellipsis included.** Truncation runs last,
after prefix/suffix are applied. `format("hello world", {maxLength: 8})` must
return `"hello..."` (8 characters). `maxLength` is a hard guarantee.

## Codebase facts

Repository: a minimal JavaScript project (`package.json` has no dependencies, no
`scripts` block, `"main": "src/index.js"`). ES modules (`import`/`export`
syntax is already in use). No build step, no test framework, no linter, no
TypeScript.

Files:

- `format.js` — the function under change.
- `format.test.js` — its tests.
- `src/index.js`, `src/utils.js` — unrelated to this change.
- `README.md` — three lines, no API documentation.

Current `format.js` in full:

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

Current `format.test.js` in full:

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

Existing patterns and constraints to respect:

- Options are flat, independent keys on a single `options` object, each guarded
  by a truthiness check and applied in a fixed sequence.
- No input validation or error handling anywhere in the existing function.
- Tests are bare `console.assert` lines, one per behavior, run directly by
  `node format.test.js`. There is no assertion library and no test runner.
- The file is 22 lines. Whatever is added should sit at the same level of
  ceremony as what is already there.

Edge cases the design must have an answer for, whichever approach is chosen:

- `maxLength` smaller than or equal to the length of `'...'` (3).
- A string with no whitespace at all, longer than `maxLength`.
- A string whose only whitespace falls very early, so a word-boundary cut
  leaves almost nothing.
- Strings shorter than or equal to `maxLength` (must be returned untouched, with
  no ellipsis).
- Interaction with `prefix`/`suffix`, given truncation runs last.
