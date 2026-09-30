# Approach Context

## Original idea (verbatim from the human partner)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

None asked yet. The human partner's message itself names the open fork.
Open sub-questions that remain unanswered and that an approach should take a
position on:

- Whether the `'...'` is counted inside the max length budget or appended
  beyond it.
- Where truncation sits relative to the existing option order (uppercase /
  lowercase / prefix / suffix).
- What happens when a word-boundary search finds no boundary (a single token
  longer than the max length).

## Codebase facts

Repository: a small JavaScript package, no build step, no test framework
dependency. `package.json` declares `"main": "src/index.js"`, version 1.0.0,
and has no `scripts` block and no dependencies.

Files:

- `format.js` — ES module, the subject of the change. Full current contents:

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

- `format.test.js` — ES module, the entire test suite. Uses bare
  `console.assert` with a message string, no test runner, and prints
  "All tests passed" at the end. Full current contents:

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

- `src/utils.js` and `src/index.js` — CommonJS (`require` / `module.exports`),
  a `greet` helper and its caller. Unrelated to `format`, and not a consumer
  of it. Note the repo mixes ESM (`format.js`) and CJS (`src/`).
- `README.md` — present.

Existing patterns that constrain the change:

- Every option is an independent, optional boolean-ish key on a single
  `options` object, applied in a flat sequence of `if` blocks against a
  single mutable `result`.
- The function has no input validation, no type checks, and no error
  handling of any kind today.
- Current git branch is `feature/add-truncate`; recent commits are
  "Add simple format utility", "add entry point", "add utils module",
  "initial commit".

## What is wanted from you

Independent candidate approaches for implementing this truncate option.
