# Bug: The controller named the wrong review package in Codex round 1. Its focus string referred to review-cb77986..5dfac7a.diff, the diff from before the fix, even though HEAD was 6d05200. The controller caught this itself and corrected it for round 2, but a gate reviewing a stale package is a real process defect.

**Kind:** bug
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller named the wrong review package in Codex round 1. Its focus string referred to review-cb77986..5dfac7a.diff, the diff from before the fix, even though HEAD was 6d05200. The controller caught this itself and corrected it for round 2, but a gate reviewing a stale package is a real process defect.
