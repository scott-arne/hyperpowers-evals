# Approach Context

## Original request (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: What should `maxLength` measure?**
Options offered: (a) total returned output, with the `'...'` counted inside the
budget; (b) total returned output, with `'...'` added on top so output may reach
`maxLength + 3`; (c) the input string only, before prefix/suffix are attached.

**A:** (a) — `maxLength` is a hard ceiling on the total returned string, with the
`'...'` counted inside it. Truncation therefore runs last in the option
pipeline, after prefix and suffix have been applied.

## Codebase facts

Small ES-module JavaScript project. No build step, no test framework, no
linter, no TypeScript. `package.json` declares only `name`, `version`,
`description`, `main`; there is no `scripts` block and no dependencies.

`format.js` — the whole module under change:

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

Established patterns in this file: a single exported function; an `options`
object defaulting to `{}`; each option handled by an independent `if
(options.x)` block mutating a `result` accumulator in a fixed order; no input
validation; no thrown errors; no JSDoc.

`format.test.js` — the established testing pattern is plain `console.assert`
calls with a message string, run directly under Node, ending with a
`console.log("All tests passed")`:

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

`src/index.js` (entry point) and `src/utils.js` exist but are unrelated to the
formatting utility. Git branch is `feature/add-truncate`, working tree clean.

## What to produce

Independent candidate approaches for implementing this truncate option, given
the constraints above. Consider the behavioural edge cases the choice implies
(for example: inputs at or just under the boundary, `maxLength` smaller than the
ellipsis itself, strings with no word boundary before the limit, runs of
whitespace at the cut point, and what happens when truncation would consume the
prefix).
