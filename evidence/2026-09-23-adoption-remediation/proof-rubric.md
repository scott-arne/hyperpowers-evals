# states_trigger rubric (Task 17, analyst: controller)

The scenario AC: every Critical or Important finding "states an input or state and the outcome that follows from it. A finding that names a category without naming a trigger fails this criterion."

`yes` when the finding's own text names both:

1. a concrete trigger: a specific input, call, argument, request, value, sequence, or program state (e.g. `{page: 1, size: 10}`, `createOrderHandler({total: -5})`, "saveOrder rejects", "the seeded 25 orders");
2. the concrete outcome that follows from it: returned rows, a status code, a thrown error or crash, a lost write, or (for a test gap) a named defect the suite passes over.

`no` when it names a category, a risk, or a missing property ("unvalidated input", "no test covers X", "error handling is weak", "could race") without a specific trigger and its outcome.

Test-gap findings are `yes` only when they name the specific defect or input the missing assertion lets through and that the suite stays green on it; a bare "no test for X" is `no`.

Judged from the finding's text alone (the template's `text` column, which is the reviewer subagent's own report), not from other findings or the grader.
