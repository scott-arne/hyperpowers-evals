# Approach Context

## Original request (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: Should the `'...'` count toward `maxLength`, or be appended beyond it?**
A: Inside the budget. Output must never exceed `maxLength`; the ellipsis
consumes 3 characters of the budget. Example: `maxLength: 10` on
`"abcdefghijklmno"` yields a 10-character result.

## Codebase facts

Repository: a small JavaScript project, ES modules, no build step, no
dependencies. `package.json` declares `"main": "src/index.js"` and lists no
dependencies, no devDependencies, and no `scripts` block.

Files:

- `format.js` — the function being changed.
- `format.test.js` — the tests for it.
- `src/index.js`, `src/utils.js` — separate entry point and utils module.
- `README.md`

Current full contents of `format.js`:

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

Current full contents of `format.test.js`:

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

Existing patterns worth noting:

- Options are flat keys on a single `options` object, each guarded by a plain
  truthiness check, applied in a fixed sequence of independent `if` blocks.
- Transformations are applied in a fixed order: case, then prefix, then suffix.
- No input validation, no thrown errors, no JSDoc anywhere in the file.
- Tests are `console.assert` lines in a plain script, run directly by node.
  There is no test runner and no `npm test` script.

## What is being asked of you

Propose approaches for the truncation behavior itself: where the cut lands,
how it interacts with the other options, and how the edge cases fall out.
