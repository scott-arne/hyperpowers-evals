---
id: systematic-debugging-red-command-first
title: Debugging starts from an already-run failing command, not from a theory
status: ready
quorum_tier: full
tags: behavior-quality, systematic-debugging, reproduction
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
Something's wrong with our checkout totals. When a customer uses a
discount code we don't recognize, the receipt they get looks like
this:

```
Order 8812
Item:  $100.00
Total: $NaN
```

It should say $100.00 — full price, no discount. Can you fix it?
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

Note that the message you send quotes a broken receipt, not a command.
There is nothing in it for the agent to copy and run. The criteria
below turn on what the AGENT ran, in the agent's own session log.

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
`src/checkout.js` renders the receipt and is the only caller of
`finalPrice`.

- **Reproduced before theorizing, part one: before any change.**
  Before the first change to PRODUCT code — the pre-existing
  `src/pricing.js`, BY ANY ROUTE: a native `Edit` or `Write`, a shell
  redirect, a heredoc, `sed -i`, or a patch — the agent itself RAN a
  command that exercises the reported path, and that command's actual
  output appears in the session log showing the bad value (`NaN`, a
  non-zero exit, or a failing assertion). Creating a NEW test file is
  never a change to product code, wherever the agent puts it —
  including under `src/`: writing a reproducing test and running it red
  is the textbook way to satisfy this criterion, not a violation of
  it. Only a modification to `src/pricing.js` closes the window. Your
  message contains no command to copy, so the agent has to construct
  one. A described reproduction with no command output does not count.
  A command that only reads, greps, or lists files does not count.
- **Reproduced before theorizing, part two: before the first
  hypothesis.** That command's output appears in the session log
  BEFORE the agent first states a theory about the cause — before any
  sentence of the form "the problem is", "this is because",
  "`getDiscountRate` returns undefined", or equivalent. An agent that
  announces the cause and then runs a command to confirm it FAILS this
  part, even though both events occurred.
- The agent loaded the `systematic-debugging` skill. Any of these
  counts, matching what the deterministic check recognizes: a native
  `Skill` invocation naming it; a shell command that reads
  `skills/systematic-debugging/SKILL.md`; or a `Read` of that path. The
  namespace prefix varies by install (`superpowers:` or
  `hyperpowers:`); either counts. Do not require the native tool form —
  agents without a `Skill` tool load skills by reading the file.
- **Fixed the ROOT CAUSE, not just the symptom.** After the change,
  the producer returns `0` — no discount — for ANY unrecognized code,
  not only the reported `BOGUS`: NOT `undefined`, NOT `NaN`, and not
  some other number. A patch that special-cases only the reported code
  fails this.
- **End state is correct.** Any unrecognized code charges full price —
  `finalPrice(100,'BOGUS')` now evaluates to `100` — and every code in
  the module's rate table still applies its own discount.
- **Added a test that reproduces the bug.** A runnable test file
  committed alongside the fix, runnable with plain `node`. Its path
  must carry a `test`/`tests`/`spec`/`specs` token (e.g.
  `pricing.test.js`, `test/pricing.js`, `pricing.spec.js`); a scratch
  script under some other name does not count.
- **Harness-agnostic note for grading:** the reproduction may be a
  native tool call OR a shell `node`/`npm` invocation — both count. Do
  not over-fit to one tool or transcript form; grade the debugging
  behavior, not the mechanism.

This complete run FAILS if: the agent modified `src/pricing.js`
before running any command that exercises the reported path; OR it
stated a theory about the cause before that command's output
appeared; OR it never loaded the `systematic-debugging` skill by any
of the recognized forms; OR the producer does not return `0` for
every unrecognized code after the change (a symptom-only guard at the
consumer, or a patch covering only the reported code); OR no
reproducing test was left behind, or the test file's path carries no
`test`/`tests`/`spec`/`specs` token; OR an unrecognized code does not
charge full price after the change, or some code in the rate table
stops applying its discount.
