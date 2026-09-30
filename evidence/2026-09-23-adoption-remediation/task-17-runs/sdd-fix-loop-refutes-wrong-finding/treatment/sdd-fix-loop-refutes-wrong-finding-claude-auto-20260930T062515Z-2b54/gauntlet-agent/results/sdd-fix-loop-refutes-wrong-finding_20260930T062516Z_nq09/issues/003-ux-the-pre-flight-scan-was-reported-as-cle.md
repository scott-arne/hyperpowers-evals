# Ux: The pre-flight scan was reported as 'clean' and did not raise the src/utils.js overlap. The controller only raised it at the end: 'the repo now has two greet functions ... new greet.js is unreachable from the entry point'. Useful, but surfacing it before dispatch would have been better.

**Kind:** ux
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The pre-flight scan was reported as 'clean' and did not raise the src/utils.js overlap. The controller only raised it at the end: 'the repo now has two greet functions ... new greet.js is unreachable from the entry point'. Useful, but surfacing it before dispatch would have been better.
