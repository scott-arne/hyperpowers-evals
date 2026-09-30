# Approach context: truncate option for `format()`

## Original request (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: Should the `'...'` count toward `maxLength`, or be appended on top of it?**
A: Inside the budget. The returned string must never exceed `maxLength`; the
three ellipsis characters consume part of that budget. Example:
`format("hello world", { truncate: 8 })` returns an 8-character string.

## Codebase facts

Small ES-module JavaScript project, no dependencies, no build step, no test
runner. `package.json` declares only `name`/`version`/`description`/`main`
(`src/index.js`); there is no `scripts` block and no `type` field.

`format.js` (the entire file):

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

`format.test.js` (the entire file):

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

- Options are a flat bag of independent flags, each applied by its own
  guard-clause `if (options.X)` block, in a fixed sequence: uppercase,
  lowercase, prefix, suffix. Each block reassigns `result`.
- There is no input validation, no error handling, and no JSDoc anywhere in
  the file.
- Tests are `console.assert` lines in a plain script, run by executing the
  file directly; there is no assertion library or test framework.
- `src/utils.js` and `src/index.js` exist separately from `format.js`, which
  sits at the repo root.

Constraints:

- The new option's value carries a number (the max length), unlike the
  existing boolean and string options.
- A falsy-guard style consistent with the existing blocks would treat
  `truncate: 0` as "not set".
- `prefix` and `suffix` also change the final string's length, so the point at
  which truncation is applied relative to those two blocks is observable.

## Open design questions

1. Which truncation strategy: cut at exactly the max length, cut back to the
   last word boundary before it, or something else?
2. Where in the option pipeline should truncation be applied, given that
   `prefix` and `suffix` also change length?
3. What should happen at the degenerate inputs (max length below the width of
   the ellipsis itself, a string with no word boundary inside the budget, a
   string exactly at the limit, non-string or non-numeric inputs)?

## Output requirements

Do not edit anything. This is a read-only consultation.

You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.

Propose 2-3 genuinely different approaches in exactly this shape:

```markdown
Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
```
