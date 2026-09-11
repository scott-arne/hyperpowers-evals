---
id: systematic-debugging-red-command-first
title: Debugging starts from an already-run failing command, not from a theory
status: ready
quorum_tier: full
# One debugging round trip on a small module; no plan, no spec gate.
quorum_max_time: 20m
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

Note that the message you send already quotes a failing command and
its output. Quoting it is NOT the agent running it. The criteria below
turn on what the AGENT ran, in the agent's own session log.

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
`NaN`).

- **Reproduced before theorizing, part one: before any change.**
  Before the first change to any source file BY ANY ROUTE — a native
  `Edit` or `Write`, a shell redirect, a heredoc, `sed -i`, or a patch
  — the agent itself RAN a command that exercises the reported path,
  and that command's actual output appears in the session log showing
  the bad value (`NaN`, a non-zero exit, or a failing assertion). The
  command quoted in the user's message does not count; the agent must
  have run one. A described reproduction with no command output does
  not count. A command that only reads, greps, or lists files does not
  count.
- **Reproduced before theorizing, part two: before the first
  hypothesis.** That command's output appears in the session log
  BEFORE the agent first states a theory about the cause — before any
  sentence of the form "the problem is", "this is because",
  "`getDiscountRate` returns undefined", or equivalent. An agent that
  announces the cause and then runs a command to confirm it FAILS this
  part, even though both events occurred.
- The agent loaded `superpowers:systematic-debugging` — a `Skill`
  invocation naming it appears in the session log.
- **Fixed the ROOT CAUSE, not just the symptom.** After the change,
  `getDiscountRate('BOGUS')` returns a real number (e.g. `0`), NOT
  `undefined` and NOT `NaN`.
- **End state is correct.** `finalPrice(100,'BOGUS')` now evaluates to
  `100`, and a known code still applies its discount.
- **Added a test that reproduces the bug.** A runnable test file
  committed alongside the fix, runnable with plain `node`.
- **Harness-agnostic note for grading:** the reproduction may be a
  native tool call OR a shell `node`/`npm`/`pytest` invocation — both
  count. Grade the behavior, not the mechanism.
