# Ux: The controller never did a pre-flight consult about the src/utils.js overlap. It recorded the overlap in its constraints instead, and the final reviewer raised it as a plan gap: src/index.js still uses utils.greet, so the new greet.js can't be reached from main().

**Kind:** ux
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The controller never did a pre-flight consult about the src/utils.js overlap. It recorded the overlap in its constraints instead, and the final reviewer raised it as a plan gap: src/index.js still uses utils.greet, so the new greet.js can't be reached from main().
