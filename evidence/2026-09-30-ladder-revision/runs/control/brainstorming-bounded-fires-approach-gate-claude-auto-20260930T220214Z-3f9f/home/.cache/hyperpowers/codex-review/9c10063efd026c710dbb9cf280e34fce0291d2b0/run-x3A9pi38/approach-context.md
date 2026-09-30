# Approach Context: truncate option for `format()`

## Original idea (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

None asked yet. The request arrived fully formed; no answers are available
beyond the verbatim idea above.

## Codebase facts

Repository: a minimal JavaScript project (`drill-test-project`, ESM, no
dependencies, no build step, no test framework).

`format.js` — the entire module under change:

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

`format.test.js` — the entire test suite. There is no test runner; tests are
plain `console.assert` calls in a script, run by executing the file with node:

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

`package.json`: name `drill-test-project`, version 1.0.0, `main: src/index.js`,
no `scripts`, no `dependencies`, no `type` field.

Other files: `README.md` (two lines), `src/index.js`, `src/utils.js`.

Existing patterns worth noting as constraints:
- Options are independent boolean/string flags on a single options object,
  applied in a fixed sequence inside one function; each is guarded by a
  truthiness check.
- `format()` has no validation, no error handling, and no early returns.
- The function is pure and synchronous, returns a string, and takes no
  locale, encoding, or configuration state.
- Existing options compose by mutating `result` in place, in source order:
  uppercase, lowercase, prefix, suffix.

Open design points implied by the request but not settled by it:
- Whether `maxLength` is a budget for the final string including the `'...'`
  or a budget for the retained source text before appending it.
- Where truncation sits in the existing option ordering relative to
  `prefix`/`suffix`.
- Behavior when a string has no word boundary before the limit, when the
  limit is smaller than the ellipsis, and for non-positive or absent limits.
