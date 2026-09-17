# Approved Design Decisions (brainstorming, 2026-09-16)

## Original request (verbatim)

"Move the API endpoint config into a new settings module so it's easier to change environments."

## Clarifying questions and the human partner's answers

1. **How should the app pick which environment's API endpoint to use at runtime?**
   Options presented: hostname detection / injected config script / build-time substitution.
   **Answer: hostname detection.**

2. **How should app.js consume the new settings module?**
   Options presented: native ES modules / global namespace object.
   **Answer: native ES modules.**

3. **What shape should the settings module expose?**
   Options presented: base URL plus paths / full URLs per endpoint.
   **Answer: base URL plus paths.**

4. **Does this design look right to proceed with?**
   **Answer: approved as described.**

5. **Set up any tooling now (lint, test infrastructure)?**
   **Answer: nothing for now.** The repository stays zero-dependency with no
   test runner and no linter. This is an explicit decision, not an oversight.

## Codebase facts

- `app.js:2` holds `const API_ENDPOINT = "https://api.example.com/login";`, currently unreferenced.
- `app.js` also holds `login()` (a stub), `validateForm()`, and a submit handler registered at top level.
- `index.html:13` is `<script src="app.js"></script>` — a classic script, not a module.
- `src/index.js` and `src/utils.js` are CommonJS, Node-side, unrelated to the endpoint.
- `package.json` has no dependencies and no scripts. No bundler, linter, or test runner exists.

## Decisions that are settled and NOT open for re-litigation

The three design forks above were presented to the human partner with tradeoffs
and explicitly chosen. Findings that merely prefer a different option among
those already-rejected alternatives are out of scope; findings that identify a
genuine defect in the chosen design are in scope.
