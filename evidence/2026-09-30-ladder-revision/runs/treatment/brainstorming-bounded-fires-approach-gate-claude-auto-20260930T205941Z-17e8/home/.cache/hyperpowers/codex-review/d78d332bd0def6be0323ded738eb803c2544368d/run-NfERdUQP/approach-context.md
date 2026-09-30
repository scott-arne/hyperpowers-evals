# Approach Context

## Original request (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q1: Does `maxLength` cap the final returned string (ellipsis included), or is
`'...'` appended on top of `maxLength` characters of text?**

A: The ellipsis counts toward the limit. The returned string must never exceed
`maxLength`.

**Q2: Where does truncation sit in `format()`'s existing option order, and are
`prefix`/`suffix` subject to it or exempt?**

A: Truncate last, after `prefix` and `suffix` have been applied. The whole
composed string is subject to the cap; a `suffix` may be cut off as a result.

## Codebase facts

Project: `drill-test-project`, a minimal JavaScript project. `package.json` has
no dependencies, no `scripts` block, and no test runner configured. `"main"` is
`src/index.js`. Node ESM and CommonJS are both present in the tree (`format.js`
uses ESM `export`; `src/utils.js` uses CommonJS `module.exports`).

The file to change is `format.js` at the repo root. Current contents in full:

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

Existing pattern: one independent `if (options.X)` block per option, applied in
sequence to a single `result` accumulator. Options so far are booleans
(`uppercase`, `lowercase`) and strings (`prefix`, `suffix`). There is no input
validation, no error handling, and no JSDoc anywhere in the file.

Tests live in `format.test.js`, a plain ESM script with no framework — a flat
list of `console.assert(...)` calls with a string label, ending in
`console.log("All tests passed")`. It is run directly with `node`, not by a
test runner. Current contents in full:

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

Git: branch `feature/add-truncate`, clean working tree. Recent commits are
small and single-purpose ("Add simple format utility", "add entry point",
"add utils module").

## What to produce

Recommend approaches for the truncation algorithm itself, given the two
decisions above are already fixed. Cover how each handles:

- strings at or under the cap (no truncation expected)
- a `maxLength` smaller than or equal to the length of `'...'`
- the shape of the option in the `options` object, consistent with the
  existing per-option pattern
- what the no-framework `console.assert` test file would need to gain
