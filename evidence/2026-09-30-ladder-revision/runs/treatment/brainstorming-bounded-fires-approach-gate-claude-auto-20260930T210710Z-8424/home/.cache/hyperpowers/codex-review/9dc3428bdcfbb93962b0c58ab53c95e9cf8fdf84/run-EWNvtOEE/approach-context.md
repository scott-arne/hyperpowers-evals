# Approach context: truncate option for `format()`

## Original idea (verbatim from the human partner)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

Do not treat the two options named in that quote as an exhaustive list. If a
different algorithm or data model serves this better, propose it.

## Clarifying questions and answers

**Q: Should the `'...'` count toward maxLength, or be appended beyond it?**
A: It counts toward it. The returned string must never exceed `maxLength`.
So with `maxLength: 8`, `"hello world"` yields an 8-character result.

## Codebase facts

Single-file JavaScript utility, ES modules, no dependencies, no test framework
(assertions are bare `console.assert` calls in a script).

`package.json`:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

There is no `scripts` block and no declared `"type": "module"`, though the
source uses ESM syntax.

`format.js` — the entire current implementation:

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

`format.test.js` — the entire current test file:

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

- Every option is applied by an independent `if (options.X)` block in a fixed
  order; the blocks are order-dependent (`prefix`/`suffix` wrap whatever the
  case transforms produced) and no block validates its input.
- Truthiness guards mean a falsy option value is indistinguishable from an
  absent one.
- `prefix` and `suffix` currently change the output length after any content
  transform would have run.
- Other files in the repo: `src/index.js` (7-line entry point), `src/utils.js`
  (5-line module), `README.md` (3 lines). Neither `src` file is referenced by
  `format.js`.

## Constraints

- Zero dependencies; keep it that way.
- Match the existing single-function, option-block style.
- The change is scoped to the truncate behavior; no broad refactor of
  `format()`.

## What to decide

The algorithm and option shape for truncation: how the cut point is chosen,
how the ellipsis budget interacts with it, how truncation orders against the
existing option blocks, and what the option's value/shape should be. Call out
the degenerate and boundary inputs each approach implies and how it behaves on
them.
