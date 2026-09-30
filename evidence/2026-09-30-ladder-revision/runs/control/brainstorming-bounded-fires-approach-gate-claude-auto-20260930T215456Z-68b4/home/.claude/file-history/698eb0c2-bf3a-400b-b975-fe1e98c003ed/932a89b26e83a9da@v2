# Approach context

## Original idea (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

**Q: Should `maxLength` bound the final returned string (including the `'...'`),
or only the content kept before it?**

A: Include the ellipsis. `format("hello world", { truncate: 8 })` returns
`"hello..."` — exactly 8 characters. The returned string must never exceed
`maxLength`.

## Codebase facts

Repository: a minimal JavaScript project, ES modules, no build step, no
dependencies, no test framework.

`package.json`:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js"
}
```

There is no `scripts` block, no devDependencies, and no test runner installed.

`format.js` (the file to change) in full:

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

`format.test.js` in full — the established testing pattern is bare
`console.assert` lines run directly with node, one assertion per option:

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

Existing pattern notes:
- Options are independent, flat keys on a single `options` object, each guarded
  by a truthiness check, applied in a fixed sequence in one function body.
- There are no helper functions; every option is a few lines inline.
- There is no input validation and no error handling anywhere in the file.
- Other files in the repo: `README.md`, `src/index.js`, `src/utils.js`.

## Question for you

Propose genuinely different approaches for how the truncate option should
decide *where* to cut the string, and how that logic should be structured
within this file. Consider the interaction with the existing options
(`uppercase`, `lowercase`, `prefix`, `suffix`) and their ordering, and the
degenerate cases that a maximum-length guarantee creates (very small
`maxLength` values, strings with no usable cut point, strings already at the
limit).
