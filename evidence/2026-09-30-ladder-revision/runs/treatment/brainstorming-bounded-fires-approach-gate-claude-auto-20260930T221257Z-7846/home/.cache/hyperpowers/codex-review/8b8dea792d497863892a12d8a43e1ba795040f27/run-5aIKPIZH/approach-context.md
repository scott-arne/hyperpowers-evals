# Approach Context: truncate option for `format()`

## Original idea (verbatim, from the human partner)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

Note: the two options named above are the human partner's own framing. You are
not limited to them — propose whatever approaches you judge best, including
ones they did not name.

## Clarifying questions and answers

None asked yet. The request is self-contained; open behavioral details (such as
whether the `'...'` is counted inside the max length or appended beyond it, and
how truncate composes with the existing options) are unresolved and are exactly
the kind of thing the approaches should take a position on.

## Codebase facts

Repository: a minimal JavaScript project (ESM, no build step, no test runner
dependency). `package.json` declares only `name`/`version`/`description`/`main`;
there are no dependencies and no `scripts` block.

Current branch `feature/add-truncate`, clean tree, branched off a history whose
latest commit is "Add simple format utility".

`format.js` — the entire file:

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

`format.test.js` — the entire file. The established testing pattern is plain
`console.assert` calls in a flat script, run directly with node; no framework:

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

- Options are an independent, flat bag of flags applied in a fixed sequence:
  uppercase, lowercase, prefix, suffix. Each is a separate `if` on a truthy
  option value. Order of application is positional in the function body, not
  configurable.
- Every existing option is either a boolean flag or a string. None takes a
  number or an object today.
- No input validation, no error handling, no throwing anywhere in the file.
- No JSDoc or type annotations.
- There is a separate `src/` directory containing `index.js` and `utils.js`;
  `package.json` `main` points at `src/index.js`. The `format.js` under review
  is at the repository root, not in `src/`.

## What to produce

2-3 genuinely different approaches for adding truncation to this function,
each with how it works, its tradeoffs, when it wins, and rough complexity.
