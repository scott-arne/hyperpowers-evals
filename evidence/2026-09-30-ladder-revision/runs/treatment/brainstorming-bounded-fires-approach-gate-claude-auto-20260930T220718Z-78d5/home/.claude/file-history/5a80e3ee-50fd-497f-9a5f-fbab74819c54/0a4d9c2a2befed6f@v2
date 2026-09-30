# Approach Context

## Original request (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q:** Should `maxLength` cap the final output (including the `'...'`) or just
the content before it?

**A:** Cap the final output. The returned string must never exceed
`maxLength`; the ellipsis consumes part of that budget. So
`format("hello world", { maxLength: 8 })` yields an 8-character result.

## Codebase facts

Repository: a minimal JavaScript project, no build step, no test framework
dependency. `package.json` declares `"main": "src/index.js"` and has no
`scripts`, no `dependencies`, and no `devDependencies`.

`format.js` (the file to change), in full:

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

- Every option is an independent, truthiness-gated `if` block applied in a
  fixed order: uppercase, lowercase, prefix, suffix.
- Options are read off a single `options` object defaulting to `{}`.
- There is no input validation and no error handling anywhere in the file.
- `format.js` uses ESM (`export`); `src/index.js` and `src/utils.js` use
  CommonJS (`require`/`module.exports`). `format.js` is standalone and is not
  imported by `src/`.

`format.test.js`, in full:

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

Testing pattern facts:

- Tests are flat top-level `console.assert(...)` calls with a message string,
  followed by a `console.log("All tests passed")`.
- No test runner, no assertion library, no `npm test` script. The file is run
  directly with node.

## What to produce

Propose 2-3 genuinely different viable approaches for implementing this
truncate option, covering both the truncation algorithm and how the option
composes with the existing options in this function. Include the edge cases
each approach forces a decision on.
