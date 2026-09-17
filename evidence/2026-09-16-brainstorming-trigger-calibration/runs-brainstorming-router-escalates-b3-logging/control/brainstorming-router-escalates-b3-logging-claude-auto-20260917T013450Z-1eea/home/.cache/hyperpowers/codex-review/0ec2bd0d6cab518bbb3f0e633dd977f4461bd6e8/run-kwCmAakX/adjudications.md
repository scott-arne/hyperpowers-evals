# Approved design decisions — logging subsystem

Original user request, verbatim:

> Add logging to the app so we can debug production issues.

The repository is a minimal two-runtime fixture: a browser login page
(`index.html` + `app.js`, loaded as a classic script) and a CommonJS Node
entry point (`src/index.js` + `src/utils.js`). No dependencies, no lockfile,
no build step, no tests, no lint config.

The following four decisions were each presented to the human partner as an
explicit fork with alternatives and tradeoffs, and each was chosen by them.
They are settled inputs to the spec, not open questions. A review finding
that merely re-argues one of these choices is out of scope; a finding that
shows a choice is internally inconsistent with the rest of the spec, or that
the spec fails to implement the choice it claims, is in scope.

1. **Surface — both runtimes, one shared module.**
   Rejected: browser only; Node only.

2. **Destination — console transport now, behind a pluggable transport seam.**
   Rejected: console only with no seam; remote log shipping now.
   Reason for rejecting remote shipping: no log-ingest endpoint exists
   (`API_ENDPOINT` in `app.js` is the stub `https://api.example.com/login`),
   and shipping logs off-device raises retention and PII questions outside
   this change's scope.

3. **Redaction — denylist inside the logger.**
   Rejected: allowlist (call-site friction); caller responsibility (the repo
   already logs a username beside a plaintext password, so review discipline
   is not a reliable control here).

4. **Module format — UMD-style single file, no build step.**
   Rejected: migrating the repo to ESM; adding a bundler plus an npm logging
   library (pino/loglevel).

Tooling selected by the human partner for this work, recorded in the spec's
Global Constraints:

- Unit tests via the built-in `node:test` runner (zero dependencies).
- NOT selected: ESLint/Prettier; end-to-end test infrastructure.

Design approval: the human partner reviewed the architecture, record shape,
redaction rule, transport seam, and integration plan in chat and approved
them ("looks good, go ahead") before the spec was written.

Process note: this review is the spec gate. The spec has had one Claude
self-review pass, which found and fixed one contradiction (the redaction
rule matched full lowercased key names while the test list expected
`API_KEY` to match the entry `apikey`; the rule now normalizes keys by
lowercasing and stripping `_` and `-`).
