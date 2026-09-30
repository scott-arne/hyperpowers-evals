# Approach Context

## Original request (verbatim)

> Add a truncate option to the format function. It should cut strings longer than a max length and add '...' at the end. We can either truncate at exactly max length (simpler) or truncate at the last word boundary before max length (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: Should `maxLength` be a hard cap on the returned string that includes the `'...'`, or a cap on the text with `'...'` appended on top of it?**

A: Hard cap — the returned string must never be longer than `maxLength`, and the `'...'` counts against that budget. (Example: `"hello world"` at `maxLength: 8` returns `"hello..."`, 8 characters.)

## Codebase facts

Repository: a small JavaScript project, ESM modules, no build step, no test
framework or dependencies (`package.json` has no `scripts`, no `dependencies`,
no `devDependencies`; `"main": "src/index.js"`). Branch `feature/add-truncate`,
working tree clean.

Files:

- `format.js` — the function to change (22 lines, full contents below).
- `format.test.js` — the existing test file (full contents below). Tests are
  plain `console.assert` calls in a script, run by executing the file directly
  with node; there is no test runner.
- `src/index.js`, `src/utils.js` — small, unrelated to formatting.
- `README.md` — 3 lines.

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

Existing patterns worth noting as constraints:

- Options are independent boolean/value flags applied in a fixed sequential
  order inside one function; each is a separate `if (options.x)` block.
- The function is a pure string -> string transform with no validation, no
  throwing, and no handling of non-string input today.
- The new `truncate` option interacts with the existing `prefix` and `suffix`
  options: the order in which truncation is applied relative to them is an open
  design question, as is whether a prefix/suffix counts toward `maxLength`.
- Inputs may contain multi-byte characters, emoji, and surrogate pairs; the
  codebase currently uses plain JS string indexing (`.toUpperCase()` etc.) and
  has no Unicode-aware helpers.
- Whitespace handling at the cut point (trailing spaces before the ellipsis) is
  unspecified.

## What to produce

2-3 genuinely different viable approaches for how the truncate option should
work and be structured, with materially different tradeoffs — covering the cut
strategy, the interaction with the other options, and edge-case behavior.
