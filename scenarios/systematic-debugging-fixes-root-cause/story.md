---
id: systematic-debugging-fixes-root-cause
title: Agent fixes the upstream root cause of a bug, not the symptom at the crash site
status: ready
tags: behavior-quality
quorum_tier: full
---

You are a developer who hit a bug in a small pricing module and is
asking the agent to fix it. You know nothing about debugging
methodology and you do NOT care HOW the agent fixes it — you only want
the bug gone. Play it straight and stay neutral.

When the agent is ready for input, send this exact message and press
Enter — do not paraphrase, do not shorten, do not add hints. The
fenced block below is the literal text to send (including the inner
triple-backtick code fence around the output):

````
There's a bug in our checkout code. When a customer enters a discount
code we don't recognize, the order total comes out wrong instead of
just charging full price. Here's what I see:

```
> node -e "const {finalPrice}=require('./src/pricing.js'); console.log(finalPrice(100, 'BOGUS'))"
NaN
```

It should print 100 (full price, no discount) for an unknown code.
Can you fix it?
````

How to answer follow-up questions:

- If the agent asks what the correct behavior is, say only: "An
  unknown discount code means no discount — charge full price." Do not
  say anything about where the fix should go or what is causing it.
- If the agent asks to proceed, run something, or confirm an approach,
  answer briefly and neutrally ("go ahead", "yes", "that's fine").
- Answer any other clarifying question in one short, neutral sentence.

Prohibitions — you MUST NOT:

- mention "root cause", "symptom", "upstream", "trace", "reproduce",
  "test first", debugging methodology, or any superpowers concept;
- suggest WHERE in the code the problem is or where the fix belongs;
- name any function, variable, or file beyond what is quoted above;
- coach, hint, or react to the agent's approach.

When the agent reports it has fixed the bug (or says it is done), you
are done driving. If the agent declares the bug fixed without having
changed anything, that is also a complete run — and a fail of the
criteria below, but the run itself is complete. Do not keep prodding
for a different answer.

## Acceptance Criteria

The fixture is a git repo whose `src/pricing.js` has two functions:
`getDiscountRate(code)` (the upstream producer — it looks a code up in
a rate table and returns `undefined` for an unknown code) and
`finalPrice(price, code)` (the downstream consumer — it does
arithmetic with that rate, so an `undefined` rate makes the total
`NaN`). The root cause is the producer returning `undefined`; the
crash surfaces in the consumer. A guard added only in the consumer
(e.g. defaulting the rate to `0` at the call site) hides the symptom
while leaving the producer still returning `undefined`.

- **Investigated before fixing.** Before editing any source file, the
  agent inspected the failing code to locate the cause — e.g. a `Read`
  or `Grep` of `src/pricing.js`, or a shell `grep`/`rg`/`cat` of it,
  or running the reproduction command itself appears in the session
  log BEFORE the first `Edit`/`Write` of a source file. An agent that
  edits the file before ever reading or running it fails this.

- **Fixed the ROOT CAUSE, not just the symptom.** After the change,
  the producer itself returns a real number for an unknown code:
  calling `getDiscountRate('BOGUS')` returns a number (e.g. `0`), NOT
  `undefined` and NOT `NaN`. A change that ONLY guards the consumer
  (`finalPrice`) — making `finalPrice(100,'BOGUS')` print `100` while
  `getDiscountRate('BOGUS')` still returns `undefined` — is a
  symptom-only patch and FAILS this criterion, even though the
  reported output looks correct.

- **End state is correct.** `finalPrice(100,'BOGUS')` now evaluates to
  `100` (full price), and a known code still applies its discount.

- **Added a test that reproduces the bug.** The agent created or
  extended an automated test in the repo that exercises the unknown-code
  case and that the fix makes pass — a runnable test file (e.g.
  `*.test.js` or a `test`/`tests` script) committed alongside the fix,
  runnable with plain `node`. Manually eyeballing the output without
  leaving a test behind does not satisfy this.

- **Harness-agnostic note for grading:** the investigation evidence may
  be a native `Read`/`Grep` tool call OR a shell `grep`/`rg`/`cat`/`node`
  invocation — both count. Do not over-fit to one tool or transcript
  form; grade the debugging behavior, not the mechanism.

This complete run FAILS if: the agent edited a source file before any
investigation; OR the producer `getDiscountRate('BOGUS')` still returns
`undefined`/`NaN` after the change (symptom-only guard at the consumer);
OR no reproducing test was left behind; OR `finalPrice(100,'BOGUS')`
does not evaluate to `100` after the change.
