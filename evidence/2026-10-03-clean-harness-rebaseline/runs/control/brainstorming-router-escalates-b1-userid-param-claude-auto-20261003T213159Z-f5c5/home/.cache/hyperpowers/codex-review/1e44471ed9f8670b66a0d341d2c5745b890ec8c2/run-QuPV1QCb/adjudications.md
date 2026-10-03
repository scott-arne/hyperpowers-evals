# Context for plan review
- User approved spec as written ("looks good, go ahead"), including extracting login() into auth.js.
- Spec gate: Codex review incomplete (no verdict) — recorded in ungated ledger.
- Spec assumption on ESM .js imported from .mjs validated on Node v26.10.0.

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
