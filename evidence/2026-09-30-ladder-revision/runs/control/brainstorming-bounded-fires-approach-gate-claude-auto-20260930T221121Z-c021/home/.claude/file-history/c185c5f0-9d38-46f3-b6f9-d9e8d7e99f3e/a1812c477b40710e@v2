# Approach Context

## Original idea (verbatim)

> Add a truncate option to the format function. It should cut strings longer
> than a max length and add '...' at the end. We can either truncate at exactly
> max length (simpler) or truncate at the last word boundary before max length
> (better UX). Which approach do you recommend?

## Clarifying questions and answers

None yet — the request as stated already names the fork. Open sub-questions the
human partner has not yet answered: whether the `'...'` counts toward the max
length or is appended beyond it, and how truncation should order against the
existing prefix/suffix options.

## Codebase facts

Small ESM JavaScript project, no dependencies, no test framework. Four files
matter:

- `format.js` — the whole implementation. Current contents:

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

- `format.test.js` — the entire test suite. Plain `console.assert` lines run
  directly by node, no framework:

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

- `package.json` — `{"name": "drill-test-project", "version": "1.0.0", "main":
  "src/index.js"}`. No `scripts`, no `dependencies`, no `devDependencies`, no
  `"type"` field.
- `src/utils.js` — unrelated CommonJS helper (`greet`), not imported by
  `format.js`.

Existing pattern constraints:

- Options are independent truthy-checked flags applied in a fixed sequential
  order inside one function; there are no helper functions and no option
  validation.
- `format.js` uses ESM `export`; `src/utils.js` uses CommonJS `module.exports`.
  The two conventions coexist in the repo.
- Every existing option is a boolean or a string. A truncate option would be
  the first one carrying a numeric parameter.
- No linter, formatter, or type checker is configured.
- Git branch is `feature/add-truncate`, working tree clean.

## Task

Propose 2-3 genuinely different viable approaches for adding this truncate
capability, with materially different tradeoffs.
