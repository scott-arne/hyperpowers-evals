# Approach Context

## Original idea (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: Should `maxLength` cap the final string (ellipsis included in the budget),
or cap the source text with `'...'` appended on top (so output may exceed
`maxLength` by 3)?**

A: Ellipsis inside the budget — the returned string must never exceed
`maxLength`.

## Codebase facts

Repository: a minimal JavaScript project. `package.json` declares
`"main": "src/index.js"`, version 1.0.0, and has **no `"type"` field** and no
dependencies, no test runner, and no lint/format tooling configured.

The target is `format.js` at the repository root (ES module syntax, `export
function`). Full current contents:

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

Existing pattern: options are independent boolean/string flags, each applied in
sequence by a separate `if (options.X)` block against a `result` accumulator.
There is no validation, no error handling, and no JSDoc anywhere in the file.

Tests live in `format.test.js` at the repository root. Full current contents:

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

The test file is a flat list of `console.assert` calls with a trailing success
log; there is no framework and no `test` script in `package.json`.

`src/utils.js` and `src/index.js` exist but are unrelated CommonJS
(`module.exports` / `require`) and contain only a `greet(name)` helper and a
`main()` that logs it. They do not import `format.js`.

Git: branch `feature/add-truncate`, clean working tree, recent commits
"Add simple format utility", "add entry point", "add utils module".

## What to produce

Independent approaches for implementing the truncate option in `format.js`,
covering the algorithm for choosing the cut point and how the option interacts
with the existing options pipeline.
