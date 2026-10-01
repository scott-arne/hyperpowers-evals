# Hand-check of the A1 Re-measure Scores

The README's Scorer section fixes the rule: the stderr disagreement lines are
read by hand for every row whose `accepted` value could move the reading, the
scorer's count governs, and a row the scorer placed on a region its cited line
does not support is reported both ways, with the reading under each.

Because fade's recall decides between Worse and the rest, and because the
"means within one finding" clause of Not separated can move on any row's
count, every Critical and Important finding the scorer placed on a clean hunk
in either arm was read, not only the stderr lines. That is 8 hunk counts in
treatment and 22 in control. Placements were reproduced with the scorer's own
`resolve_ranges`, `parse_report`, `attribute`, `cited_spans` and
`citation_conflict`, imported from the unchanged script.

`blocking_on_clean` counts distinct clean hunks with a blocking finding, not
findings: a hunk stays counted while any one finding placed there is
supported.

Run ids below are the suffix after
`code-review-precision-on-realistic-diff-claude-auto-20261001T`.

## fade (treatment, `013521Z-fade`): recall 0 as scored, 2 as read

Ranges in this run's fixture at `HEAD`: `offset_bug` is `src/handlers.js:18`,
`unawaited_save` is `src/handlers.js:37`, and `store_slice` is
`src/store.js:5-8`.

The reviewer read every file with `cat` (tool call `…7DZosR`, no line
numbers) and numbered `src/handlers.js` by hand, one line short throughout.
Its code blocks label `const page` as line 15 (it is 16) and
`const offset = page * size;` as line 17 (it is 18).

- **Critical 3cc293e57af0** ("Off-by-one in the page offset makes the first
  page of orders permanently unreachable — src/handlers.js:17").
  - It cites `handlers.js:17` and `store.js:5-7`. Line 17 at `HEAD` is
    `const size = ...`, in no range. `store.js:5-7` is in `store_slice`, so
    the citation places the finding there, and the scorer reports
    `citation-conflict` against `offset_bug`.
  - The finding cites `store.js:5-7` to say the store is correct: "No
    existing guard catches this: `store.listOrders` (src/store.js:5-7)
    applies `slice(offset, offset + limit)` faithfully". It quotes the
    planted line verbatim and gives the fix `(page - 1) * size`.
  - **The placement is not supported by the line that places it.** As read,
    this is planted bug 1.
- **Critical 933201464b43** ("`store.saveOrder` is async and unawaited ...
  — src/handlers.js:36").
  - It cites `handlers.js:36`, `store.js:9` and `store.js:10-15`, none in a
    range. Placement by name finds `unawaited_save` and `parse_order_id` in
    the same tier, because the failure scenario says "`parseOrderId` accepts
    the id". The finding is therefore `unattributed`.
  - It quotes `store.saveOrder(order); // line 36 — returns a Promise, never
    awaited` (the line is 37) and gives the fix `await store.saveOrder(order)`.
  - As read, this is planted bug 2. The README's both-ways clause names a
    misplaced finding; this one is unplaced. Both readings of it are given
    below.
- **Important 12b0f722f1cc** (#3, "The unpaginated listing contract is broken
  ... src/handlers.js:14, src/store.js:5").
  - Its second bullet asserts a defect in `store.listOrders`: a legacy
    zero-argument call returns `[]`.
  - No caller in the fixture makes that call. This is a blocking finding on a
    clean hunk, and it keeps `store_slice` counted.
- **Important ca8dc80a2261** (#4, the test assertions are too weak) is
  unattributed and is a test-adequacy finding. It moves nothing.

| fade | recall | blocking_on_clean | accepted |
|---|---|---|---|
| (a) as scored | 0 | 1 (`store_slice`) | no |
| (b) misplaced finding corrected only | 1 | 1 (`store_slice`, by 12b0f722f1cc) | no |
| (c) as read | 2 | 1 (`store_slice`, by 12b0f722f1cc) | no |

The grader agrees with (c) on recall. Its summary says both seeded defects
were found under Critical, and it failed the run on Important #3.

## Other treatment rows

| Row | Hunk as scored | Finding | As read |
|---|---|---|---|
| `012039Z-1492` | `config_readfile` | bd30eba5b808, `config.js:3-9`: no error handling, and a missing key yields `[]` | Supported. Stays 1. |
| `012734Z-115f` | `config_readfile` | 97797ba11d9e, `config.js:7-9`: no key validation | Supported. |
| `012734Z-115f` | `with_retry` | a19ced8fc992, `util.js:7-19`: `attempts <= 0` throws `undefined` | Supported. |
| `012734Z-115f` | `log_rethrow` | a19ced8fc992 again. `handlers.js:26` is cited as where the `undefined` surfaces downstream; no defect in the catch is asserted (`span-ambiguous`) | Not supported. 3 becomes 2. |
| `011338Z-870d` | `test_fixture` | 120ec7bc38fb, "The new tests assert shape, not content". It cites `handlers.test.js:16-22` for an assertion at lines 23-26 (miscounted again). Nothing is said against the fixed clock or the seeded list | The sixth known limit (test-coverage vocabulary) and a miscited range. 1 becomes 0, so the row is accepted as read. The grader passed it (`grader-disagreement`). |
| `012555Z-2be8` | `store_slice` | 79aea71d15ee, `store.js:5`: `store.listOrders` made `async` "gratuitous[ly]", forcing a breaking sync-to-async handler change. "There are no in-repo callers" | Supported. Stays 1. |
| `013151Z-f0fd` | `test_fixture` | ca04129ea05d, "the create path has no success test", no line, placed by name | The sixth known limit. 1 becomes 0, so the row is accepted as read. The grader passed it (`grader-disagreement`). |

`012023Z-4df0` carries `grader-disagreement` the other way: grader fail (AC 12,
one Important cites a file without a line), scorer accepted. Spec 5.1's
acceptance reads recall and blocking findings only, so it stays accepted.

## Control rows

Every control count was read.

- Supported:
  - every `config_readfile` count: missing-file or missing-key crash, or
    scope creep, each citing `config.js`;
  - every `log_rethrow` count: the "inconsistent error contract" finding,
    citing the catch;
  - every `store_slice` count: a zero-argument `listOrders()` legacy call
    returns `[]`, and each finding says no in-tree caller makes it;
  - every `with_retry` count;
  - `d4b5`'s `test_fixture` count (ca8822..., the tests share the store and
    only one resets it, citing `seed()`).
- Not supported:
  - **`013255Z-fff2` `test_fixture`.** Finding f73261... asserts that
    `createdAt` is taken from the request body (`handlers.js:36`). It cites
    `handlers.test.js:8` (`CLOCK`) only as the clock convention. No defect
    in the test is asserted. 4 becomes 3.
  - **`3df6` `test_fixture`.** Finding cd8021..., "the new creation path has
    no success-path test", no line, placed by name. This is the sixth known
    limit.
- Arguable:
  - **`3df6` `parse_order_id`.** Finding 0206d5..., "Design: the create
    endpoint requires a *client-supplied* order id", no line, placed by name.
    It names `parseOrderId` as the mechanism and asserts a design defect in
    the endpoint, not that `parseOrderId` is wrong as written. Read as not
    supported, 3df6 has recall 2 and 0 blocking, so it is accepted. Read as
    supported, it stays 1.

## Tallies

| | Treatment as scored | Treatment as read | Control as scored | Control as read |
|---|---|---|---|---|
| recall 2/2 | 9/10 (fade 0) | 10/10 | 10/10 | 10/10 |
| accepted | 4/10 [0.168, 0.687] | 6/10 [0.313, 0.832] | 0/10 [0.000, 0.278] | 0/10 or 1/10 [0.018, 0.404] |
| blocking sum, mean | 8, 0.8 | 5, 0.5 | 22, 2.2 | 20 or 19, 2.0 or 1.9 |

Wilson 95% intervals, z = 1.96.

## Readings

The order is Worse, Not separated, Unambiguous advantage; otherwise no
reading.

- **As scored: Worse.** Treatment recall falls below 2 of 2 in one
  determinate trial (fade, 0) while control holds 2 of 2 in all ten.
- **(b), the misplaced finding corrected only: Worse.** fade's recall is 1.
- **As read (c), both fade findings credited, all corrections above: no
  reading.**
  - Not Worse: recall is 2 of 2 in every trial of both arms, and the
    treatment mean (0.5) is below control (1.9 or 2.0).
  - Not separated does not apply. The treatment's 6/10 misses the absolute
    bar, and the means are 1.4 or 1.5 apart, more than one finding.
  - Advantage does not apply, because 6/10 is below 8/10.
  - The README makes this case the human partner's call.

Under every reading treatment has fewer blocking findings on clean hunks than
control, 0.8 or 0.5 against 2.2 or 1.9-2.0. Under none does treatment reach
the 8/10 the advantage bar needs.
