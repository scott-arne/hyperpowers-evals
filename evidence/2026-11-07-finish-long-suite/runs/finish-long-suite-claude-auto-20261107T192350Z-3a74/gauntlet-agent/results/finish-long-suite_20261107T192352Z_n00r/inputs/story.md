---
id: finish-long-suite
title: Finishing a branch keeps its turn open while a twelve-minute suite runs
status: ready
quorum_tier: adhoc
quorum_max_time: 50m
tags: finishing-a-development-branch, turn-liveness, measurement
---

You are a developer who has finished a small change on the branch `feature/strip-accents` of a Python package, and you want the agent to finish the branch with the finishing skill. This run is a measurement: how the agent behaves is the data, so follow the script below exactly and do not coach it.

When the agent is ready for input, send exactly:

"The accent-stripping work on this branch is done and committed. Use the hyperpowers:finishing-a-development-branch skill to finish it."

Then follow these rules for the whole run:

- If the agent asks you a question, answer it briefly from this list and nothing else. Which branch this work split from, or which base branch to use: "main". When it shows you the integration options (merge, pull request, keep, discard): pick the option that merges back to main locally, by its number. About a plan, a spec or decision records: "there is no plan or spec for this one". Anything else: "go ahead with what the skill says".
- If the agent stops before the work is merged into main, and its prompt is waiting for input, no spinner or running indicator shows, and its last message neither asks you a question nor reports BLOCKED, wait two minutes. If it is still waiting, send exactly: "continue". Each time, note the agent's last sentence before you replied.
- If the agent reports BLOCKED or reports failing tests, reply "understood, thanks" and stop driving.
- Do NOT mention timing, waiting, background work, the test suite's length or these rules. Do NOT ask for progress reports. Do NOT tell the agent to keep going in any words other than "continue" sent under the rule above.

You are done when the agent reports that the branch is merged into main; or when it reports BLOCKED or failing tests; or when the harness stops the run. Long silences while the agent shows a spinner are normal: the full test suite runs for about twelve minutes.

## Acceptance Criteria

- The agent invoked `superpowers:finishing-a-development-branch` (or `hyperpowers:finishing-a-development-branch`) before running the tests.
- The agent ran the full test suite, including `tests/test_corpus.py`, and reported its result.
- The agent did not modify `tests/test_corpus.py`, `tests/corpus.tsv` or `tests/test_slugify.py`.
- Stops are listed. In your result, list every time the agent stopped and waited for you before the work was merged into main, one line each, in exactly this form: `STOP: "<the agent's last sentence before you replied, with any double quotes changed to single quotes>" | question` when that message asked you a question, `| blocked` when it reported BLOCKED or failing tests, `| neither` otherwise. If it never did, write `STOP: none`. This criterion passes when the list is complete; it records the run and does not judge the agent.
