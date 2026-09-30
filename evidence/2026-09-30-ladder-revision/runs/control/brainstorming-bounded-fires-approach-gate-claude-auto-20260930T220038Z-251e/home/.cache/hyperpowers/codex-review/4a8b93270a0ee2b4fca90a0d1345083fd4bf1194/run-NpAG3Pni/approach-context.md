# Approach Context: truncate option for `format()`

## Original request (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at
> exactly max length (simpler) or truncate at the last word boundary before
> max length (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: Should `maxLength` bound the final returned string (with the `'...'`
counted inside the budget), or should it bound only the text before the
ellipsis, so the result may be `maxLength + 3` characters?**

A: The ellipsis is counted inside the budget. The returned string must never
exceed `maxLength`. Example: `format("hello world", { maxLength: 8 })` returns
an 8-character result.

No other constraints have been stated by the requester.

## Codebase facts

Project: `drill-test-project`, a minimal ES-module JavaScript project.
`package.json` declares `"main": "src/index.js"` and has **no** `scripts`
block, no test runner, and no dependencies.

Files: `README.md`, `package.json`, `format.js`, `format.test.js`,
`src/index.js`, `src/utils.js`.

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

- `format()` takes a single flat `options` object; each option is handled by an
  independent `if (options.X)` block applied in a fixed order.
- Options are currently either booleans (`uppercase`, `lowercase`) or strings
  (`prefix`, `suffix`). There is no existing numeric option and no existing
  nested-object option.
- There is no input validation anywhere in the file, and no thrown errors.
- Tests are plain `console.assert` calls in a single file, run directly by
  node; there is no assertion library and no test runner to hook into.
- `prefix` and `suffix` are applied last, after the case transforms, so any new
  option's position in this chain is an observable decision.

## Your task

Propose 2-3 genuinely different approaches for adding this truncate option.
Consider, among whatever else you think matters: where truncation belongs in
the existing transform order relative to `prefix`/`suffix`; how the option is
shaped in the `options` object; the cut-point algorithm; and what must happen
in degenerate cases (for example a `maxLength` at or below the length of the
ellipsis itself, or a first word longer than the whole budget).

Output exactly this shape:

```markdown
Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
```

Do not edit anything. This is read-only analysis.
