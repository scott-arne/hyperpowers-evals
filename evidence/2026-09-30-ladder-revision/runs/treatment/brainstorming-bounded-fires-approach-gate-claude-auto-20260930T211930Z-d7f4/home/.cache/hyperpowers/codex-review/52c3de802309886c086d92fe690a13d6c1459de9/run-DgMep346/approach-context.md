# Approach context: truncate option for `format()`

## Original idea (verbatim from the human partner)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: Should the `'...'` count toward maxLength, or be appended on top of it?**

Options offered:
- Inside the budget — output never exceeds maxLength; `format("hello world", {truncate: 8})` -> `"hello..."` (8 chars).
- Appended on top — a full maxLength of content is kept; output can be maxLength + 3.

**A: Inside the budget.** The output must never exceed `maxLength`.

No other clarifying questions have been asked or answered yet. Open points the
human partner has not ruled on: how `truncate` interacts with the existing
`prefix`/`suffix` options, and behaviour when `maxLength` is smaller than the
ellipsis itself.

## Codebase facts

Repository: a minimal JavaScript project, ES modules, no dependencies, no test
framework. Current branch `feature/add-truncate`.

Files:
- `format.js` — the function under change
- `format.test.js` — the test file
- `src/index.js`, `src/utils.js` — unrelated modules
- `package.json` — name `drill-test-project`, `"main": "src/index.js"`, no
  `scripts` block, no `"type"` field, no dependencies or devDependencies

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

Existing patterns worth noting:
- Options are independent flags applied in a fixed sequence against a single
  `result` accumulator; each is guarded by a plain truthiness check.
- Tests are bare `console.assert` lines with a short label, run directly by node;
  there is no runner, no assertion library, and no npm script.
- The module is zero-dependency and the codebase has no established style for
  input validation or error handling.

## What to produce

Independent approaches for implementing the truncate option, given the
constraint that the ellipsis is inside the length budget.
