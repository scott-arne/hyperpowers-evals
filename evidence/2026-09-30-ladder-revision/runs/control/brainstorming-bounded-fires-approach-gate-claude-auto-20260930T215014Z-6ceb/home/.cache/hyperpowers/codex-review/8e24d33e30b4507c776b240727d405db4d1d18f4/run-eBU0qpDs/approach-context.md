# Approach Context: truncate option for `format()`

## Original idea (verbatim, from the human partner)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: Should the `'...'` count toward `maxLength`, or be appended on top of it?**
A: Ellipsis inside the budget. The returned string must never exceed
`maxLength`; the `'...'` eats into the content allowance. A rule is still
needed for `maxLength < 3`, where there is no room for the ellipsis.

## Codebase facts

Repository: a small ES-module JavaScript project. No build step, no test
framework, no linter configured. `package.json` declares only
`name`/`version`/`description`/`main: "src/index.js"` — there are no
dependencies, no `scripts` block, and no `"type"` field.

Branch: `feature/add-truncate`, clean working tree.

### `format.js` (the file to change), complete current contents

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

### `format.test.js`, complete current contents

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

### Existing patterns worth noting

- Options are a flat bag of independent flags on a single `options` object,
  applied in a fixed sequence of `if` blocks against a `result` accumulator.
- Every existing option is falsy-guarded (`if (options.x)`), so an absent or
  falsy value means "skip this transform".
- Existing options are order-dependent by construction: case transforms run
  before affixes, so `prefix`/`suffix` text is never case-folded.
- Tests are bare `console.assert` calls in a single file, run by executing the
  file directly with node. There is no assertion library and no runner.
- No JSDoc or type annotations anywhere in the codebase.

## Constraints

- The change is scoped to this one option on this one existing function.
- Stay consistent with the existing options-bag style; do not restructure
  `format()` or introduce dependencies or tooling.
- Backward compatibility: all five existing assertions must keep passing
  unchanged.

## What to produce

Independent approaches for how truncation should work in this function —
including where the cut lands relative to the requested maximum, how the
option interacts with the other options already present, and how the
degenerate short-`maxLength` case is handled.
