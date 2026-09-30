# Approach Context

## Original request (verbatim)

> Add a truncate option to the format function. It should cut strings longer than a max length and add '...' at the end. We can either truncate at exactly max length (simpler) or truncate at the last word boundary before max length (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q1: Where should truncation sit relative to the existing prefix/suffix options?**
A1: Truncate last — the truncation step runs after prefix and suffix have been
applied, so the string returned by `format()` is always at most `maxLength`
characters. Accepted consequence: a sufficiently small `maxLength` may cut into
the prefix or suffix text.

**Q2: Does the `'...'` count against `maxLength`?**
A2: Inside the budget — `maxLength: 10` returns at most 10 characters total,
e.g. 7 characters of text plus `'...'`.

## Codebase facts

Repository: a small JavaScript project, ESM in the file under change. Branch
`feature/add-truncate`. Working tree clean.

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

Structural facts about `format.js`:
- One exported function. Options are passed in a single `options` object that
  defaults to `{}`.
- Each option is handled by an independent, flat `if (options.X)` block
  mutating a single `result` variable. No block reads another option.
- Order of application is uppercase, lowercase, prefix, suffix.
- No input validation, no thrown errors, no JSDoc anywhere in the file.

`format.test.js` (the existing test file), in full:

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

Testing facts:
- No test framework and no test runner. Assertions are bare `console.assert`
  calls executed top to bottom, one line per case, ending with a
  `console.log("All tests passed")`.
- `package.json` declares `name`, `version`, `description`, and
  `main: "src/index.js"`. It has no `scripts` section, no `dependencies`, and
  no `"type"` field.
- There is no linter, formatter, or type checker configured in the repo.

Other files in the repo, not part of this change: `src/index.js` and
`src/utils.js` (both CommonJS, `require`/`module.exports`, unrelated greeting
code), and `README.md`.

## The decision to advise on

The request names two candidate behaviors for choosing the cut point: cut at
exactly the character budget, or cut back to the last word boundary at or
before the budget. Recommend an approach for how the cut point is chosen, given
the two decisions recorded above.
