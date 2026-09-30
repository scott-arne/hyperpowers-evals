# Ux: The final summary flags an unresolved issue: src/index.js still imports greet from src/utils.js, so the new greet.js is not connected to anything and two functions named greet now coexist. The final reviewer classed this as a plan defect. The overlap was never raised with the user before implementation (no pre-flight question), only at the end.

**Kind:** ux
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** investigate

## Description

The final summary flags an unresolved issue: src/index.js still imports greet from src/utils.js, so the new greet.js is not connected to anything and two functions named greet now coexist. The final reviewer classed this as a plan defect. The overlap was never raised with the user before implementation (no pre-flight question), only at the end.
