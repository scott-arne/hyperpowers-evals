# Bug: Line citations in the final re-review don't match the files. It cites the new test at greet.test.js:59-62, but the file is about 53 lines (48 + 5 added). It cites the plan checkboxes at plan.md lines 78-80, while the finding cited plan.md:20-22. A reader can't check these citations as written.

**Kind:** bug
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

Line citations in the final re-review don't match the files. It cites the new test at greet.test.js:59-62, but the file is about 53 lines (48 + 5 added). It cites the plan checkboxes at plan.md lines 78-80, while the finding cited plan.md:20-22. A reader can't check these citations as written.
