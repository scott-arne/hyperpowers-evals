# Ux: The agent ran the suite in the background, wrote its output to a log under ~/.cache/hyperpowers/codex-review/..., and then blocked on a 'wait-exit' script with --max-ms 540000 (9 min). Because that is shorter than the suite, it had to call wait-exit twice. It worked, but the screen shows a long, opaque wait-exit command line instead of the test output.

**Kind:** ux
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

The agent ran the suite in the background, wrote its output to a log under ~/.cache/hyperpowers/codex-review/..., and then blocked on a 'wait-exit' script with --max-ms 540000 (9 min). Because that is shorter than the suite, it had to call wait-exit twice. It worked, but the screen shows a long, opaque wait-exit command line instead of the test output.
