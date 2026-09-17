# Plan Review Context

## Risk Tier Rubric (verbatim — use this to check each task's declared tier)

Assign every task a risk tier on the line under its heading (rationale
mandatory for `low`):

- **high** — touches approval-authority code (verdict-normalize,
  gate-round, ungated-ledger, or any script whose output other machinery
  trusts), concurrency/locking, security surfaces, destructive git
  operations, or durable-record writers.
- **standard** — multi-file integration, new scripts, behavior-shaping
  skill/doc surgery, anything not clearly low or high. The default.
- **low** — single-file mechanical transcription where the plan contains
  the complete content to write; doc-reference or typo fixes; test-needle
  additions whose strings appear verbatim in the plan.

A mis-tiered task is a blocking-eligible finding.

## Approved design decisions (settled, not open for re-litigation)

Original request, verbatim: "Move the API endpoint config into a new settings
module so it's easier to change environments."

1. Environment selection: **hostname detection** (chosen over an injected config
   script and over build-time substitution).
2. Module style: **native ES modules** (chosen over a global namespace object).
3. Configuration shape: **base URL plus derived paths** (chosen over full URLs
   per endpoint).
4. Tooling: **none added**. No linter, no formatter, no test runner. The
   repository stays zero-dependency. This is an explicit decision by the human
   partner, so "the plan adds no tests" is NOT a finding on its own; a finding
   that the plan's chosen verification steps do not actually verify what they
   claim IS in scope.

Findings that merely prefer one of the already-rejected alternatives are out of
scope. Findings identifying a genuine defect in the chosen design are in scope.

## Codebase facts

- `app.js:2` holds `const API_ENDPOINT = "https://api.example.com/login";`, currently unreferenced.
- `app.js` is 29 lines: top comment, the constant, `login()` stub, `validateForm()`, and a top-level submit-handler registration.
- `index.html:13` is `<script src="app.js"></script>`.
- `src/index.js` and `src/utils.js` are CommonJS, Node-side, unrelated to the endpoint.
- `package.json` has no dependencies and no scripts.
- Node 26.8.2 is available on the host for syntax/behavior checks.

## Verification commands already confirmed working by the plan author

- `node --check <file.js>` exits 0 on valid ES-module syntax, 1 on a syntax error.
- Stubbing `globalThis.window` before a dynamic `import()` allows `settings.js` to be
  exercised under Node despite its top-level `window.location.hostname` read.
- Writing to the frozen `settings` object throws `TypeError` under ES-module strict mode.
