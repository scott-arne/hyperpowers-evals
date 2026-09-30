# Ux: The pre-flight scan reported 'Scan clean', but the final reviewer later found that the new root greet.js duplicates src/utils.js greet and that nothing in the app imports it. The overlap only came up at the very end, labelled BLOCKED. Catching it in pre-flight would have given the human a chance to decide earlier. I was never asked about it during the run, so I never gave the scripted answer.

**Kind:** ux
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The pre-flight scan reported 'Scan clean', but the final reviewer later found that the new root greet.js duplicates src/utils.js greet and that nothing in the app imports it. The overlap only came up at the very end, labelled BLOCKED. Catching it in pre-flight would have given the human a chance to decide earlier. I was never asked about it during the run, so I never gave the scripted answer.
