# Approach context: truncate option for `format()`

## Original request (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

None asked yet. The open questions the partner has not yet answered are listed
under "Unresolved" below; treat them as design space, not as settled facts.

## Codebase facts

Small JavaScript project, ES modules, no build step, no dependencies.

`package.json` (whole file):

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

No `scripts` block, no test runner dependency, no linter config.

`format.js` (whole file):

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

`format.test.js` (whole file):

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

- `options` is a flat bag of independent, individually-guarded transforms.
  Each transform is an `if (options.x)` block applied in a fixed order:
  uppercase, lowercase, prefix, suffix.
- Every existing option is a boolean or a string. There is no option today
  that takes a number or a nested object.
- Tests are plain `console.assert` lines in a single file, run by executing
  the file with node. There is no assertion library and no test framework.
- `src/utils.js` and `src/index.js` exist but are unrelated to `format`.

## Unresolved (design space)

- Whether the `'...'` suffix counts toward the max length or is added on top
  of it.
- Where truncation sits in the existing transform order relative to
  `prefix`/`suffix`.
- The shape of the option itself given that all current options are
  boolean/string.
- Behavior when no word boundary exists before the limit, and when the limit
  is smaller than the ellipsis.
