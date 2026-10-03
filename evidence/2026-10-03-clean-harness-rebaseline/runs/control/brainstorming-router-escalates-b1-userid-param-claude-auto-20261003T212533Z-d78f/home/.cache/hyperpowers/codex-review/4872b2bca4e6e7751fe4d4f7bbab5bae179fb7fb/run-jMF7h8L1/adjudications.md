# Plan review context

Spec gate: Codex spec review was incomplete (companion returned {}); spec approved by the user.
Approved decisions: see spec Decisions table.

## Risk Tier Rubric (verbatim)

- **high** — touches approval-authority code (verdict-normalize,
  gate-round, ungated-ledger, or any script whose output other machinery
  trusts), concurrency/locking, security surfaces, destructive git
  operations, or durable-record writers.
- **standard** — multi-file integration, new scripts, behavior-shaping
  skill/doc surgery, anything not clearly low or high. The default.
- **low** — single-file mechanical transcription where the plan contains
  the complete content to write; doc-reference or typo fixes; test-needle
  additions whose strings appear verbatim in the plan.
# Approved design decisions (from brainstorming with the user)

- User request: "Add a userId parameter to the login function so we can track who logged in."
- User clarified: it must be a parameter on login, work across the app, persist, and other forms will need it later.
- userId origin: client-generated (crypto.randomUUID) persisted in localStorage — user chose this, accepting it identifies a browser not a person.
- Tracking scope: include userId in stubbed login payload + console log + return value only; no local login history (user chose).
- Sharing mechanism: native ES module identity.js exporting getUserId(); app.js becomes type="module"; requires serving over HTTP (user accepted).
- Testing: node:test unit tests for identity.js with fake storage; login verified manually in browser. No "type":"module" in package.json (would break CJS src/index.js); rely on Node 26 ESM syntax detection.
- Repo context: app.js (login stub, validateForm, form submit handler), index.html (login form, classic script tag), src/index.js + src/utils.js (CommonJS, unrelated), package.json (no scripts).
