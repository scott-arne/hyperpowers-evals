# Bug: Codex's round-2 capture calls the declined finding 'resolved'. The controller noticed and wrote in the ledger that it was declined, not fixed, but the reviewer's wording is misleading.

**Kind:** bug
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

Codex's round-2 capture calls the declined finding 'resolved'. The controller noticed and wrote in the ledger that it was declined, not fixed, but the reviewer's wording is misleading.
