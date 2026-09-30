# Bug: The controller attached the wrong review package to Codex gate round 1: the pre-fix review-ac88672..5a7d8b2.diff instead of the full task range ending at 22b0345. It caught and recorded this itself ('controller input error found and corrected') and attached the corrected package in round 2. Its ledger note says --base ac88672 was correct, so the gate's own diff view was complete.

**Kind:** bug
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller attached the wrong review package to Codex gate round 1: the pre-fix review-ac88672..5a7d8b2.diff instead of the full task range ending at 22b0345. It caught and recorded this itself ('controller input error found and corrected') and attached the corrected package in round 2. Its ledger note says --base ac88672 was correct, so the gate's own diff view was complete.
