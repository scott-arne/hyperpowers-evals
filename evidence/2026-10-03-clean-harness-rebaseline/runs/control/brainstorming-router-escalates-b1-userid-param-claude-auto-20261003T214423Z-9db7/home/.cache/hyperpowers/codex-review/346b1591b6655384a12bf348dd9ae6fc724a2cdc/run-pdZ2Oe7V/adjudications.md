# Plan review context

Spec approved by user; spec-gate Codex review was incomplete (no verdict), recorded in the ungated ledger.

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
