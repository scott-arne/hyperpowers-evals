# states_trigger consistency rulings (Task 17, analyst: controller)

Recurring finding shapes, and how `proof-rubric.md` was applied to each across the 20 reports. Finding numbers are template row order (run-id suffix#row).

## no

- Pagination response has no total / hasMore / page count (a missing property, no trigger): 85fa#7, 6e6c#5, a012#8, ab4c#4, 2010#6, 18b9#10, a856#9, 720d#5.
- Log-and-rethrow vs return-status error conventions (a contract inconsistency, no input and outcome): 85fa#3, a012#6, ab4c#5, 720d#9.
- Retry wrapped around the in-memory slice, where the trigger is a class of error ("a programmer error", "a TypeError") rather than a specific input, even when the delay is measured: 2010#7, 18b9#6, 720d#10.

## yes

- Test-gap findings that name the specific defect the missing assertion lets through and say the suite stays green (passes, ships green, went unnoticed): 3441#4, 3842#5, 2010#10, 4273#4, 92bd#3, 92bd#4, 18b9#4, 18b9#5, a856#5, a856#6, 9a6c#3, d2e2#3, d2e2#4, 1c6a#3, 720d#13, b93e#3.
- `npm test` fails with `Missing script: "test"` (the command is the trigger, the error the outcome): 6e6c#7, a792#8.
- parseOrderId given an array or object; withRetry with attempts undefined or 0; config file missing, malformed, or missing a key; an unbounded size given a concrete value and the rows it returns; duplicate ids created twice: yes wherever the finding states the input and what follows.
- A finding that bundles several points is yes when at least one point names a trigger and its outcome: 9a6c#5 (a missing or malformed config.json throws ENOENT or SyntaxError at require time).

## Near-misses corrected during judging

- 3842#5 and 6e6c#7 were first leaned no and corrected to yes under the rubric.
- The template's third column is `cites_line`, filled by the script; `states_trigger` is the fourth column, the only one the analyst fills.
