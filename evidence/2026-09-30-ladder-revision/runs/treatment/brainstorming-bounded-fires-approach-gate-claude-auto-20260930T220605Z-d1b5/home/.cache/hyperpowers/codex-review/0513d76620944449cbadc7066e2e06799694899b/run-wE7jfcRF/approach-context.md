# Approach context: truncate option for `format()`

## Original idea (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: Should the `'...'` count toward `maxLength`?**
A: Inside the budget — the returned string must never be longer than
`maxLength`; the ellipsis eats into the character budget. So
`format("hello world", { maxLength: 8 })` returns an 8-character string.

## Codebase facts

Project: `drill-test-project`, plain ESM JavaScript, no build step, no
dependencies. `package.json` declares `"main": "src/index.js"` and no `scripts`
block and no test runner dependency.

Files: `format.js`, `format.test.js`, `src/index.js`, `src/utils.js`,
`README.md`, `package.json`.

`format.js` in full:

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

Existing patterns worth noting as constraints:

- `format()` takes a single flat `options` object; each option is handled by an
  independent `if` block applied in a fixed sequence (uppercase, lowercase,
  prefix, suffix). There is no validation and no error handling anywhere in the
  function.
- Tests are `console.assert` one-liners in a single flat file, run by executing
  the file directly with node; there is no test framework and no assertion
  library.
- The existing option values are booleans and strings. No option currently takes
  a number or a nested object.
- `src/utils.js` and `src/index.js` are separate from `format.js`; `format.js`
  sits at the repository root and imports nothing.

## What to produce

Independent approaches for implementing the truncate behavior described above,
including how the truncation itself should be computed and where it should sit
relative to the existing option handling.
