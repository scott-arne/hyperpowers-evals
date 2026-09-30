# Ux: All three Codex lenses (correctness, contracts, tests) ran one after another and each returned the same finding. The controller deduplicated them correctly, but it cost three sequential gate runs.

**Kind:** ux
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

All three Codex lenses (correctness, contracts, tests) ran one after another and each returned the same finding. The controller deduplicated them correctly, but it cost three sequential gate runs.
