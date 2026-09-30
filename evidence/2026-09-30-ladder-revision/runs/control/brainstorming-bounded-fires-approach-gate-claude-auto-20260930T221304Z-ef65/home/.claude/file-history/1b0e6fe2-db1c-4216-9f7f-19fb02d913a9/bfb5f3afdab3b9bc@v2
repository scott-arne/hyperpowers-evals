# Approach context: truncate option for `format()`

## Original idea (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: Should the `'...'` count toward maxLength, or be added on top of it?**

A: Inside the budget. The returned string must never exceed `maxLength`
characters. Example given: `format('hello world', { truncate: 8 })` yields
`'hello...'`, which is exactly 8 characters.

## Codebase facts

Small JavaScript project, ESM in the file under change, no build step, no test
framework installed.

`package.json` (whole file):

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `dependencies`, no `devDependencies`, no `scripts`, no `"type"` field.

`format.js` (whole file, the function to change):

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

`format.test.js` (whole file — the established testing pattern here is
`console.assert` lines in a plain script, no runner):

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

Other files, unrelated to this change and using CommonJS: `src/index.js`
(calls `greet`), `src/utils.js` (exports `greet`). `README.md` is 60 bytes.

Existing option-handling conventions visible in `format()`:

- Options are independent flags on a single plain-object `options` argument,
  each guarded by a truthiness check.
- They apply in a fixed sequence, each rewriting `result`.
- There is no input validation, no throwing, and no defensive type checking
  anywhere in the function.
- `prefix` and `suffix` are applied last, after the case transforms.

## What to produce

Propose 2-3 genuinely different approaches for how the truncation behavior
should work and how the option should be shaped. Consider at minimum: where
truncation sits relative to the existing prefix/suffix steps, what the option
value looks like, and how the cut point is chosen. Note any edge cases a chosen
approach forces a decision on.
