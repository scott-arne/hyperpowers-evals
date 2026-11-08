# Bug: /tmp/slugkit-full-suite.log is a fixed shared path, and the agent says other runs on the host wrote to it: an extra uppercase 'EXIT=0' / 'Ran 7 tests … OK' ending appeared before its own run had finished. The agent caught this and waited for its own task's result, which is good. Still, the shared /tmp log path is a contamination risk, either from the fixture or the host setup.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

/tmp/slugkit-full-suite.log is a fixed shared path, and the agent says other runs on the host wrote to it: an extra uppercase 'EXIT=0' / 'Ran 7 tests … OK' ending appeared before its own run had finished. The agent caught this and waited for its own task's result, which is good. Still, the shared /tmp log path is a contamination risk, either from the fixture or the host setup.
