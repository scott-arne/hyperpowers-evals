# Bug: The Codex approach gate came back empty. The agent reported: "Codex is installed and preflight returned `ok`, but the companion call came back empty — no approaches." The seeded stub Codex returned nothing. That may be expected for a stub, but it means the Codex path wasn't really exercised. It fell back gracefully and said it wouldn't retry.

**Kind:** bug
**Scenario:** brainstorming-bounded-fires-approach-gate
**Scenario Status:** pass

## Description

The Codex approach gate came back empty. The agent reported: "Codex is installed and preflight returned `ok`, but the companion call came back empty — no approaches." The seeded stub Codex returned nothing. That may be expected for a stub, but it means the Codex path wasn't really exercised. It fell back gracefully and said it wouldn't retry.
