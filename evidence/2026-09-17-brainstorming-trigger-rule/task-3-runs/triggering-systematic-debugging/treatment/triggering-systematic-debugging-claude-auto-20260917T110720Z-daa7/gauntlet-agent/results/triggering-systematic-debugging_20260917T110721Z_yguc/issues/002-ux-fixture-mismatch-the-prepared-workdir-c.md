# Ux: Fixture mismatch: the prepared workdir contains only src/index.js and src/utils.js (21 lines of JS, no tests, no node_modules, no test script), so the referenced src/utils/parser.ts does not exist. The agent correctly refused to fabricate a fix, but the scenario's premise (fix a failing test) cannot actually be exercised against this repo.

**Kind:** ux
**Scenario:** triggering-systematic-debugging
**Scenario Status:** pass

## Description

Fixture mismatch: the prepared workdir contains only src/index.js and src/utils.js (21 lines of JS, no tests, no node_modules, no test script), so the referenced src/utils/parser.ts does not exist. The agent correctly refused to fabricate a fix, but the scenario's premise (fix a failing test) cannot actually be exercised against this repo.
