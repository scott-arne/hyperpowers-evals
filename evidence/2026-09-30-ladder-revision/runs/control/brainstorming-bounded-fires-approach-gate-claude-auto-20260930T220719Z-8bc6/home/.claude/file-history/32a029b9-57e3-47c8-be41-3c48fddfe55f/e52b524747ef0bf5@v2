# Approach context: truncate option for `format()`

## The original request (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: Where should truncation sit in the option pipeline?**
A: Before prefix/suffix. Truncation applies to the content; prefix and suffix
are then applied around the truncated content. The returned string may
therefore exceed `maxLength`.

**Q: Does the `'...'` count toward `maxLength`?**
A: Yes, included. `format("hello world", { maxLength: 8 })` returns an 8-character
result. `maxLength` is a real cap on the truncated content, not a cap before the
ellipsis is appended.

## Codebase facts

Repository: a minimal JavaScript project. Relevant files:

- `format.js` — the function under change. Full current contents:

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

- `format.test.js` — the entire test suite. Full current contents:

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

- `src/index.js`, `src/utils.js` — unrelated to `format()`; `src/utils.js` uses
  CommonJS (`module.exports`) while `format.js` uses ESM.
- `package.json`, `README.md` ("A minimal project for Drill test scenarios.")

Existing patterns and constraints:

- `format()` is a flat sequence of independent `if (options.X)` guards applied
  to a single `result` accumulator. No validation, no error handling, no
  throwing anywhere in the file.
- No test framework. Tests are bare `console.assert` lines in a single file,
  run directly.
- No dependencies; no lint or type configuration present.
- Existing options are all booleans or strings. `maxLength` would be the first
  numeric option.
- The existing options are all total functions — every input produces output.

## What to produce

Independent approaches for implementing this truncate option. Consider the
truncation algorithm itself and any edge-case handling the algorithm implies
(for example: inputs with no word boundary before the cut, `maxLength` smaller
than or equal to the ellipsis length, whitespace left dangling at the cut point,
interaction with the case-conversion options, and what should happen for
non-positive or non-integer `maxLength`).
