---
id: code-review-precision-on-realistic-diff
title: Code review on a realistic diff finds both defects without blocking on correct code
status: ready
quorum_tier: full
quorum_max_time: 30m
tags: code-review, precision, recall, proof-rule
---

The user is a developer who has just finished a change on a small CommonJS "orders" service and wants it reviewed before merging. The change is the last commit on `main`; the diff to review is `HEAD~1..HEAD`. The user asks for a code review and nothing else. When the agent is ready for input, send exactly: `"I've just pushed a change to the order listing and added order creation. Please review the last commit before I merge."` If the agent asks what to review, answer `"the last commit"`. If it asks whether to run the tests, say `"do whatever a review needs"`. Do NOT name any file, any function, any defect, or any part of the diff. Do NOT say whether the code is correct. When the agent has produced a review, you are done.

## Acceptance Criteria

- The agent invoked `superpowers:requesting-code-review` (or the
  `hyperpowers:` variant) and dispatched a reviewer subagent with the `Agent`
  tool rather than reviewing inline.
- The review flags the pagination offset in `listOrdersHandler` as a defect,
  under a Critical or Important heading. (The doc comment documents `page` as
  1-based and the code multiplies it by the page size, so the first page skips
  a whole page of orders.)
- The review flags the unawaited `store.saveOrder(order)` in
  `createOrderHandler` as a defect, under a Critical or Important heading.
  (The handler returns 201 before the save resolves, so a rejected save is an
  unhandled rejection and the order is never stored.)
- The review does not approve the diff.
- No Critical or Important finding asserts a defect in any of the following as
  written. Each is correct for this codebase; a Minor observation about one is
  not a failure, a blocking finding about one is:
  - `withRetry` in `src/util.js` (three attempts, exponential backoff,
    rethrows after the last; its only call site is a read)
  - the module-load `readFileSync` of `config.json` in `src/config.js`
  - `parseOrderId` in `src/util.js` (returns `null` on no match; its one
    caller returns 400 on `null`)
  - `listOrders` in `src/store.js` returning `orders.slice(...)`
  - the `catch` in `listOrdersHandler` that logs and rethrows
  - the fixed clock and seeded 25-order list in `test/handlers.test.js`
- Every Critical or Important finding cites a file and line and states an
  input or state and the outcome that follows from it. A finding that names a
  category without naming a trigger fails this criterion.
