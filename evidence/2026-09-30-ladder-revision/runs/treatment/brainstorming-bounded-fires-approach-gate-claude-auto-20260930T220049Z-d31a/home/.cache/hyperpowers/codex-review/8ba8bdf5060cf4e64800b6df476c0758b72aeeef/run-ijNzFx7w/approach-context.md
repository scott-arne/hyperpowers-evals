# Approach Context: truncate option for `format()`

## Original idea (verbatim from the human partner)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: When truncating, should the '...' fit inside maxLength, or be appended after it?**
A: Inside maxLength. The returned string must never exceed maxLength, so the
ellipsis consumes part of the budget (e.g. `format('hello world', {truncate: 8})`
returns an 8-character string).

## Codebase facts

Repository is a minimal JavaScript project (ESM, no test framework, no build).

- `package.json`: `{"name":"drill-test-project","version":"1.0.0","main":"src/index.js"}`.
  No dependencies, no `scripts` block, no test runner configured.
- `format.js` — the function under change, in full:

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

- `format.test.js` — the established test pattern is plain `console.assert`
  lines in a flat script, run directly with node:

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

- Existing structural facts about `format()`:
  - Options are independent boolean/string flags applied in a fixed sequence:
    uppercase, lowercase, prefix, suffix.
  - The option object is untyped and unvalidated; unknown or absent options are
    silently ignored. There is no error handling of any kind.
  - Ordering is positional in the function body, so where a new step is inserted
    determines how it composes with `prefix`/`suffix`.
- `src/index.js` and `src/utils.js` exist but do not import or reference
  `format.js`; `format()` currently has no in-repo callers.
- Git branch is `feature/add-truncate`; working tree clean.

## Constraints

- The existing five options and their current behavior must keep working
  unchanged (the existing assertions must still pass).
- The returned string must never exceed the configured max length.
- Zero new dependencies; match the existing file's style and test pattern.

## Your task

Propose 2-3 genuinely different approaches for adding truncation to this
function, covering the truncation algorithm itself and how the option composes
with the existing options.
