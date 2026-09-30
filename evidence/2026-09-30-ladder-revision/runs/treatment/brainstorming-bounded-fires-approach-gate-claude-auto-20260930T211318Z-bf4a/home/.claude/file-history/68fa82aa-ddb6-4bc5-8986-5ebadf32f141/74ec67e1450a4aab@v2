# Approach Context

## (a) Original idea, verbatim

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at
> exactly max length (simpler) or truncate at the last word boundary before
> max length (better UX). Which approach do you recommend?

## (b) Clarifying questions and answers

**Q: Should the `'...'` count toward `maxLength`, so the returned string never
exceeds `maxLength`?**

Options offered:
- Inside budget: output is never longer than `maxLength`; the ellipsis eats
  into the content. `maxLength` is a hard cap.
- Appended on top: keep `maxLength` characters of content, then add `'...'`.
  Output can be `maxLength + 3`.

**A: Inside budget.** The returned string must never exceed `maxLength`.

No other clarifying questions have been asked or answered.

## (c) Codebase facts

Repository: a minimal JavaScript project, no build step, no test framework, no
linter config, no dependencies. Branch `feature/add-truncate`; working tree
clean.

Files:

- `package.json` — name `drill-test-project`, version `1.0.0`,
  `"main": "src/index.js"`. No `dependencies`, no `devDependencies`, no
  `scripts`, no `"type"` field.
- `format.js` (repo root) — the function to change. Full current contents:

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

- `format.test.js` (repo root) — the entire test suite. No runner; it is a
  plain script of `console.assert` calls. Full current contents:

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

- `src/index.js`, `src/utils.js` — unrelated CommonJS (`require` /
  `module.exports`) demo files holding a `greet` helper. They do not import
  `format`. Note the repo mixes ESM (`format.js`) and CJS (`src/`).
- `README.md` — three lines, no API documentation.

Existing patterns in `format()` worth noting as constraints:

- Options are independent flat booleans/strings on a single `options` object,
  each guarded by a truthiness check (`if (options.x)`), applied in a fixed
  sequence to an accumulating `result`.
- The current order is uppercase, lowercase, prefix, suffix. Where a new
  truncate step sits in that sequence is an open question — prefix/suffix
  change the string's length, so ordering is observable.
- No input validation anywhere; no thrown errors; no JSDoc.
- There are no other callers of `format` in the repo, so the option's shape is
  not constrained by existing call sites.

## Your task

Propose 2-3 genuinely different viable approaches for implementing this
truncate option. Output in exactly this shape:

```markdown
Approaches (2-3, each genuinely different):
- name: ...
  how-it-works: ...
  tradeoffs: ...
  when-it-wins: ...
  rough-complexity: trivial|moderate|high
```

Do not edit anything. This is read-only.

You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.
