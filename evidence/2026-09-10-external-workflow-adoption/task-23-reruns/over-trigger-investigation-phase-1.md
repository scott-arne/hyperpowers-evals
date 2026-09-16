# Brainstorming over-trigger — Phase 1 investigation (evidence only, no fix proposed)

Scenario: `cost-checkbox-over-trigger` (sentinel tier).
Failing run: batch 8, `2026-09-16T01:00:13Z`.
Read-only investigation. Nothing in any repository was modified.

Paths referenced below are absolute. The run root prefix
`/Users/johnss51/Development/agents/hyperpowers/evals/evidence/2026-09-10-external-workflow-adoption/task-23-reruns/`
is abbreviated `<T23>/` after first use.

## Scenario definition (for reference)

`/Users/johnss51/Development/agents/hyperpowers/evals/scenarios/cost-checkbox-over-trigger/story.md:14-15`
gives the exact user message the gauntlet sends:

> "I want to add a checkbox component to this page that lets users mark
> items as done. Just a basic checkbox with on/off state, nothing fancy."

`story.md:37-40` states the failure condition:

> - The agent did NOT invoke the `superpowers:brainstorming` skill.
>   Brainstorming on an obviously-trivial mechanical UI tweak is the
>   over-trigger cost pattern this scenario measures — a `Skill`
>   invocation naming `superpowers:brainstorming` is the failure.

`/Users/johnss51/Development/agents/hyperpowers/evals/scenarios/cost-checkbox-over-trigger/checks.sh:9`:
`check-transcript skill-not-called superpowers:brainstorming`. The detector
also matches the `hyperpowers:` namespace, which is why the post-check
records `Skill(superpowers:brainstorming) called 1 time(s) (expected 0)`
for a `hyperpowers:brainstorming` invocation.

`setup.sh:3` runs `setup-helpers run create_cost_checkbox_page`
(`/Users/johnss51/Development/agents/hyperpowers/evals/src/setup-helpers/cost-fixtures.ts:23-31`):
`git init -b main`, write `index.html`, one commit `initial: empty tasks page`.
The fixture is **deliberately shared** with the calibration twin
`brainstorming-resists-jump-to-implementation`
(`scenarios/brainstorming-resists-jump-to-implementation/story.md:45-48`,
and `evals/docs/superpowers/plans/2026-06-09-representative-failure-scenarios-batch-1.md:535`:
"**deliberately the same fixture** (`create_cost_checkbox_page`), so the
only discriminator is the request"). The design spec calls the empty
`<main></main>` "load-bearing"
(`evals/docs/superpowers/specs/2026-06-13-quorum-setup-helpers-ts-port-design.md:142`).

---

## Failing run (what happened, quoted)

Run: `<T23>/sentinel-runs-5/cost-checkbox-over-trigger-claude-auto-20260916T010013Z-962e/`
Transcript: `home/.claude/projects/-Users-johnss51-...-962e-coding-agent-workdir/36b940fb-e644-4b1c-a0c5-294834720cf1.jsonl`
(34 records; indices below are 0-based record numbers in that file).

Session metadata: `model = claude-opus-5`, CLI `version 2.1.261`,
`entrypoint sdk-ts`, `permissionMode bypassPermissions`, `gitBranch main`.

### Timeline

| Record | t | What |
|---|---|---|
| 4–5 | 01:00:47.891Z | `SessionStart:startup` hook fires; `hook_additional_context` injects the bootstrap (3,288 chars) |
| 7 | 01:00:52.066Z | User message (the scenario prompt, verbatim) |
| 13 | 01:01:01.733Z | Assistant thinking block — **493 thinking tokens**, text stored as `''` |
| **14** | **01:01:01.743Z** | **`Skill(hyperpowers:brainstorming)` — the first action of the session** |
| 16 | 01:01:01.748Z | Skill body returned into context |
| 25 | 01:01:05.908Z | `Bash: ls -la <workdir>` |
| 28 | 01:01:08.232Z | `Read: <workdir>/index.html` |
| 32 | 01:01:25.732Z | Text: classification + design fork |
| 33 | 01:01:28.073Z | `AskUserQuestion` — blocks on a two-option choice |

### The decisive moment

The `Skill` call is the **first tool use and the first output of any kind**.
There is no preceding assistant text, no announcement, no exploration.
Record 14, verbatim input:

```json
{"skill": "hyperpowers:brainstorming"}
```

Record 13's thinking block is `{"type": "thinking", "thinking": "", "signature": "<2200 chars>"}`.
**The reasoning text is not retained by the harness** — only a signature and
the token count (`output_tokens_details.thinking_tokens: 493`). The same is
true in every run, passing and failing. So the agent's stated reason for
reaching for brainstorming is unrecoverable from these artifacts. This is a
material instrumentation gap for any Phase 2.

### What the agent said after loading the skill (record 32, verbatim)

> Classification: **bounded** — one existing file, a self-contained change. So I'll ask the one question that matters, present a short design in chat, and skip any spec or plan document.
>
> Context: `index.html` is a single static page, no framework, no build step, no tests, and `<main>` is empty — there are no task items on the page yet.
>
> **The fork:** you said "component," and in a plain HTML page that can mean two different things, which differ in whether this change introduces JavaScript at all.
>
> - **Static markup only** — a `<label><input type="checkbox"> …</label>` written directly into `<main>`. The browser handles on/off for free; zero JS, nothing to maintain. Costs: it's one hardcoded checkbox, so adding items later means hand-writing more markup.
> - **A JS factory** — a small `createCheckbox(label)` function plus a `<script>` that appends one. Buys reuse when you start rendering a real task list. Costs: introduces a script and a state-ownership question (does the DOM hold the checked state, or a JS array?) that you'd otherwise defer.
>
> Both are cheap to change later — going from static markup to a factory is a few minutes of work — so I'd lean static markup and let a real task list drive the JS when you actually have one.

Then record 33, `AskUserQuestion`, header "Approach", options
"Static markup only (Recommended)" / "Small JS factory".

### Answers to the specific questions asked

**Did the agent classify the request?** Yes, explicitly and out loud:
"Classification: **bounded**". This is exactly what `skills/brainstorming/SKILL.md:23-26`
demands ("Before your first question, classify the request and say the
classification out loud"). Note the classification happened *after* the
skill was loaded — it cannot have been the reason for loading it.

**Did it treat "nothing fancy" as a signal?** No. The phrase "nothing
fancy" appears nowhere in the agent's output. The agent's own framing
pivots on a different token: *"you said 'component'"*. The word
"component" is the request's only word that maps onto a design question,
and it is also a verbatim phrase in the brainstorming trigger text
(see Prompt surfaces below). The judge flagged the same asymmetry
(`gauntlet-agent/.../issues/001-...md`):

> Over-trigger: brainstorming skill invoked for a trivial mechanical UI tweak explicitly described as 'nothing fancy'. The agent itself classified the work as 'bounded' yet still ran the brainstorming flow and blocked on a user choice.

**Did anything in the workdir invite a design question?** The workdir
contained exactly two entries — `.git` and `index.html` (record 26). No
README, no `CLAUDE.md`/`AGENTS.md`, no config, no tests. `index.html`
(record 29) is 11 lines:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Tasks</title>
  </head>
  <body>
    <h1>Tasks</h1>
    <main></main>
  </body>
</html>
```

The one feature that *is* suggestive is the empty `<main></main>`: there
is no task list to attach a checkbox to. The agent named it ("there are no
task items on the page yet") and built the fork on it (one hardcoded item
vs. a factory for a list that does not exist). Every passing run noticed
the same thing and resolved it by writing a placeholder item and flagging
it in the summary rather than asking. Critically, the fixture is identical
in all seven runs, so it is a constant, not the discriminator.

**Cost.** The run's coding-agent token total is **158,259** against a
134.1k–134.9k band for all six passes — a ~17% over-spend, plus a blocked
turn. (`verdict.json` `economics.coding_agent.tokens.total`.)

---

## Passing runs (what differed)

Examined: the batch-8 re-run nine minutes later
(`<T23>/sentinel-runs-5/...-20260916T010942Z-8568/`), the batch-9 run
(`<T23>/sentinel-runs-6/...-20260916T040815Z-4e17/`), and all four earlier
heads (`sentinel-runs-4/...-678e`, `sentinel-runs-3/...-a3ec`,
`sentinel-runs-2/...-9e96`, `sentinel-runs/...-fbb7`).

### The single behavioural difference is turn 1

| Run | Turn-1 action | Turn-1 thinking tokens | Result |
|---|---|---|---|
| `...-fbb7` (batch 1) | `Bash: ls -a <workdir>` | 330 | pass |
| `...-9e96` (batch 3) | `Bash: ls -la && git status --short` | 312 | pass |
| `...-a3ec` (batch 5) | `Bash: ls -la && git status --short` | 304 | pass |
| `...-678e` (batch 7) | `Bash: ls -la … && git … status --short` | 280 | pass |
| **`...-962e` (batch 8)** | **`Skill(hyperpowers:brainstorming)`** | **493** | **fail** |
| `...-8568` (batch 8 re-run) | `Bash: ls -la && git status --short` | 353 | pass |
| `...-4e17` (batch 9) | `Bash: ls -la && git status --short && git log --oneline -3` | 499 | pass |

Six of seven runs open with a filesystem/git probe. One opens with the
Skill call. After that first action the trajectories are fully determined:
the six explorers all read `index.html`, then edit it directly; the one
skill-loader follows the brainstorming checklist to a design fork.

Representative passing text, the batch-8 re-run (record 21):

> Single static HTML file, no framework or build. This is a small, fully-specified change, so I'll just make it directly rather than running a planning workflow.

Batch 9 (record 22):

> Plain static HTML page, no framework or build. A native `<input type="checkbox">` already carries on/off state, so no JS is needed.

Batch 7 (record 22):

> Plain static page, no framework or build. Adding a native checkbox directly.

Note what the passing runs are doing: they **explore first, then decide the
task is too small for a skill**. That sequence is the exact behaviour the
bootstrap's Red Flags table names as rationalization (see next section).
The batch-8 re-run states the rationalization almost verbatim — "rather than
running a planning workflow".

Also note the batch-9 pass and the batch-8 fail both mention the empty
`<main>` and both flag the item-source question; the pass raises it *after*
implementing, as a closing note:

> One thing to flag: I hardcoded a single placeholder item ("Write the thing") since the page had an empty `<main>` and no item data. If items will come from somewhere (a list, a data source, user input), say the word and I'll wire the checkbox into that instead.

The same uncertainty, resolved by acting and flagging rather than by
blocking. The scenario's pass/fail therefore turns on *when* the agent
raises the ambiguity, not on whether it sees one.

### Everything else is identical — verified, not assumed

| Surface | Result across all 7 runs |
|---|---|
| Model id | `claude-opus-5` in every assistant record of every run |
| CLI version / entrypoint | `2.1.261` / `sdk-ts`, all runs |
| `home/.claude/settings.json` | byte-identical (`diff` clean); content is `{"theme":"dark","skipDangerousModePermissionPrompt":true}` |
| **SessionStart `additionalContext`** | **byte-identical: SHA-256 `958fa8a7b728d3a7…`, 3,276 chars, all 7 runs** |
| Skill listing attachment | byte-identical: SHA-256 `d5d6ad6f19d16ad3…`, 5,952 chars, all 7 runs |
| Attachment type sequence | identical, except the failing run has one extra `command_permissions` record — a *consequence* of the Skill call, emitted at 01:01:01.748Z after it |
| Turn-1 prompt size | 32,439 – 32,447 tokens (spread of 8 tokens, explained by the run-id string in the cwd path); failing run = 32,441, mid-band |
| User message | byte-identical scenario prompt at record 7 in all 7 runs |
| Fixture | identical `index.html`, identical `initial: empty tasks page` commit |

The hook payload was reconstructed from each transcript's
`hook_additional_context` attachment and confirmed to be
`skills/using-hyperpowers/SKILL.md` embedded verbatim (Python substring
check: whole file present) inside the `<EXTREMELY_IMPORTANT>` wrapper, plus
nothing else — **no notices fired** in any run (payload 3,288 bytes vs.
SKILL.md 3,063 bytes; the 225-byte delta is exactly the wrapper).

So there is no recorded input difference between the failing run and the
six passing ones. The divergence is entirely in the sampled turn-1 action.

Thinking-token counts rule out a simple "deliberated more, over-thought it"
story: the failing run's 493 sits *below* batch 9's passing 499 and above
five other passes. There is no gradient.

---

## Prompt surfaces (quoted, with assessment)

### 1. The bootstrap's 1%-chance rule

`/Users/johnss51/Development/agents/hyperpowers/.worktrees/external-workflow-adoption/skills/using-hyperpowers/SKILL.md:10-16`,
injected verbatim at session start:

> ```
> <EXTREMELY-IMPORTANT>
> If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.
>
> IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.
>
> This is not negotiable. You cannot rationalize your way out of this.
> </EXTREMELY-IMPORTANT>
> ```

`SKILL.md:20` (The Rule):

> **Invoke relevant or requested skills BEFORE any response or action** — including clarifying questions, exploring the codebase, or checking files. If it turns out wrong for the situation, you don't have to use it.

`SKILL.md:28-30` (Skill Priority):

> When multiple skills apply, process skills come first … Brainstorming and systematic-debugging are Superpowers' most common process skills …
>
> - "Let's build X" → hyperpowers:brainstorming first, then implementation skills.

### 2. The Red Flags rows that argue against "this is too simple"

`SKILL.md:37-50`. The rows that bear directly on what the six passing runs did:

| Thought | Reality |
|---------|---------|
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "This is just a simple question" | Questions are tasks. Check for skills. |

### 3. The brainstorming trigger text

`skills/brainstorming/SKILL.md:3` (frontmatter `description`, verbatim):

> "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."

The user's message is "I want to add a checkbox **component** … that lets
users mark items as done". Against this description that is a three-way
lexical hit: *building components*, *creating features*, *adding
functionality*. The description contains no exception, no threshold, and no
counter-signal for size — "You MUST use this before any creative work".

### 4. What the skill body mandates once loaded

`skills/brainstorming/SKILL.md:47-51` (Bounded path):

> Ask the clarifying questions that matter, present a short design IN CHAT (a few sentences to a few short paragraphs), and STOP. Implementation starts only after your human partner says yes to that design — a bounded task's approval is as hard a gate as an architectural one.

`SKILL.md:61-68`:

> ## Anti-Pattern: "Too Simple To Need Approval"
>
> Every path ends with your human partner approving your intent before implementation. A todo list, a single-function utility, a config change — the design may be two sentences in chat, but you MUST present it and get approval. "Simple" tasks are where unexamined assumptions cause the most wasted work. What scales with simplicity is the artifact, never the approval.

`SKILL.md:74` (Red Flags): `| "This is too simple to need a design" | Simple means a short design, not no design. Two sentences in chat, then approval. |`

`SKILL.md:96-102` (Bounded checklist): step 5 "Present short design in
chat", step 6 "**Get approval** — STOP and wait for an explicit yes".

`SKILL.md:36-45` also makes the *heavier* reading available for this exact
fixture: "bounded means the flow you are changing is already here to read.
If there is no existing flow to change, the task is not bounded… reuse
across components that do not exist yet — … the task is architectural."
The fixture's `<main>` is empty; there is no task-list flow. A literal
reading pushes toward architectural, and `SKILL.md:57` says "When in doubt
between two paths, take the heavier one."

### Honest assessment

**The failing run is the prompt surfaces working exactly as written. The
six passing runs are the model exercising judgment against them.**

Step by step:

- The bootstrap's threshold is 1%. A request whose head noun is
  "component" plainly clears 1% against a description whose second clause
  is "building components". Nothing in the bootstrap carves out triviality;
  the Red Flags table pre-emptively rejects the three thoughts that would
  produce a carve-out ("the skill is overkill", "this doesn't need a formal
  skill", "simple question").
- The ordering constraint is explicit and the passing runs violate it.
  "Invoke … BEFORE any response or action — including … exploring the
  codebase, or checking files" is precisely what `ls -la && git status`
  is. The passing runs cannot tell the request is trivial *without*
  breaking the rule first, because triviality is only visible after reading
  `index.html`. The bootstrap does offer an escape valve — "If it turns out
  wrong for the situation, you don't have to use it" — but that valve opens
  *after* invocation, which is the failing state under this check.
- Once the skill loaded, the failing run had no compliant path to a silent
  implementation. It classified bounded (correct, and the lighter of the
  two defensible classifications), then did what the Bounded path and the
  "Too Simple To Need Approval" section jointly require: present a design
  and stop. The judge's complaint — "classified the work as 'bounded' yet
  still ran the brainstorming flow and blocked on a user choice" — is a
  complaint about the skill text, not about the agent: for a bounded task
  the skill says the approval gate is "as hard a gate as an architectural
  one".

So the scenario is not measuring whether the prompt surfaces suppress
over-triggering; they do not, and as written they command the opposite.
It is measuring how often the model's prior for "just do the small thing"
outweighs an explicit, capitalized, non-negotiable instruction. At the
current wording that prior wins about 90% of the time.

One caveat on the trigger text, honestly flagged. In the `skill_listing`
attachment these sessions actually received, `hyperpowers:brainstorming`
is rendered **bare, with no description**:

```
- hyperpowers:brainstorming
- hyperpowers:dispatching-parallel-agents: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
- hyperpowers:executing-plans
...
- dataviz: Use this skill whenever you are about to create ANY chart, ...
```

Fourteen of the fifteen hyperpowers skills appear name-only while the
non-hyperpowers skills carry full descriptions. All fifteen frontmatter
`description:` fields are single-line and well-formed, so this is not a
parse failure in the skill files; the rendering mechanism was not
determined from these artifacts. The listing is byte-identical in all seven
runs, so it cannot explain the divergence — but it does mean the "building
components" lexical hit may reach the model only through a surface these
transcripts do not record (the system prompt is not stored in the `.jsonl`).
That materially weakens Hypothesis 2 below, and it is a prerequisite check
for any Phase 2 that would consider editing the description.

---

## Branch changes to those surfaces

Worktree: `/Users/johnss51/Development/agents/hyperpowers/.worktrees/external-workflow-adoption`, HEAD `c6b69d8`.
`git merge-base f5a9843 HEAD` → `f5a9843`, so `f5a9843..HEAD` is the branch's
whole contribution.

```
$ git diff --stat f5a9843..HEAD -- skills/using-hyperpowers skills/brainstorming
 skills/brainstorming/SKILL.md | 4 ++++
 1 file changed, 4 insertions(+)
```

`skills/using-hyperpowers/` is **unchanged**. The bootstrap injected at
session start is byte-for-byte the merge-base version.

The entire branch delta to either surface is one four-line addition at
`skills/brainstorming/SKILL.md:297-300`:

```diff
@@ -294,6 +294,10 @@
 - Do NOT commit the design document. Leave it as an uncommitted working file unless the user explicitly asks you to commit it.
+- Where the design rests on something nobody confirmed, write it as
+  `Assumption: <what>, validate via <method>` rather than as a fact; the
+  plan will attach the deadline. The placeholder scan accepts that form
+  and flags bare TBD or TODO.
```

This is the named-unknowns sentence. It sits under
`## After the Design (architectural path)` (heading at `SKILL.md:289`),
inside the **Documentation** bullet list that governs writing a spec file.

**Assessment: no branch change plausibly affects triggering on a trivial
request.** Three independent reasons:

1. The text is inside the skill body. It is only in context *after* the
   skill has been invoked, so it cannot influence the invoke/don't-invoke
   decision, which is the only thing that varied.
2. It is on the architectural path only. The failing run classified
   bounded and never reached that section.
3. The trigger surfaces themselves — the bootstrap, the Red Flags table,
   the Three Paths classification text, and the frontmatter description —
   are untouched by this branch.

This corroborates the adjudication's independent finding
(`<T23>/adjudication-remeasurement.md:492-498`):

> What the two non-passes are not: a regression from this head's change. The `skills/` tree at `2ee268c` is byte-identical to the tree at `46bcf46`, `0145cd7`, `65d7747`, `fd457d3` and `7e8ba23`, where both scenarios passed in every batch (seven consecutive passes each); the only product change since `46bcf46` is one `shopt -s dotglob` line inside the SessionStart hook's compaction subshell, which runs only after a compaction and cannot influence which skill a fresh session loads.

That claim is now independently verified from the run artifacts: the
injected payload hashes identically across all four earlier heads and both
later runs.

---

## Base rate

**Retained evidence directories: 7 runs, 6 pass / 1 fail (85.7% pass).**
All seven live under `<T23>/sentinel-runs*/`; there is no
`cost-checkbox-over-trigger` run under `task-8-runs/`, `task-9-runs/`,
`task-19-runs/`, or `evidence/2026-09-05-gate-calibration/`. No run has a
non-null `error`; no `verdict.json` is missing.

| # | started_at | arm | final | coding-agent tokens |
|---|---|---|---|---|
| 1 | 2026-09-15T18:38:04Z | `sentinel-runs` | pass | 134,634 |
| 2 | 2026-09-15T20:52:08Z | `sentinel-runs-2` | pass | 134,152 |
| 3 | 2026-09-15T23:10:36Z | `sentinel-runs-3` | pass | 134,105 |
| 4 | 2026-09-16T00:25:13Z | `sentinel-runs-4` | pass | 134,608 |
| **5** | **2026-09-16T01:00:13Z** | **`sentinel-runs-5`** | **fail** | **158,259** |
| 6 | 2026-09-16T01:09:42Z | `sentinel-runs-5` (re-run) | pass | 134,934 |
| 7 | 2026-09-16T04:08:15Z | `sentinel-runs-6` | pass | 134,911 |

`sentinel-runs-5` is the only arm holding two runs of this scenario: the
failure and its ~9.5-minute-later re-run at the same head.

**Counting executions rather than retained copies: 10 runs, 9 pass / 1 fail
(90% pass).** Three further passes exist in the gitignored harness tree
`/Users/johnss51/Development/agents/hyperpowers/evals/results/` whose copies
were not retained: `...-20260913T215416Z-0d24` (the task-19 `d0a187d` batch,
pass, 134,052 tokens) and two superseded remeasurement heads
(`...-20260915T224434Z-4b5b`, `...-20260915T235142Z-6e8d`, both pass).
The nine batch lines across `sentinel-remeasurement-1..9.log` read
`✓ 2m13s, ✓ 2m21s, ✓ 2m11s, ✓ 2m16s, ✓ 2m18s, ✓ 2m09s, ✗ 2m00s, ✓ 2m11s`
plus the task-19 batch's `✓ 3m12s`
(`<T23>/../task-19-runs/adjudication.md:267`).

Every pass sits in a 134.0k–135.2k token band. The single failure is a
158,259-token outlier — the over-trigger is visible in the cost headline
this scenario was built to measure, not only in the pass/fail bucket.

### Earlier adjudications on this scenario's stability

`<T23>/adjudication-remeasurement.md:471-472`:

> This batch is the first of the eight with a non-pass.

`<T23>/adjudication-remeasurement.md:476-482`:

> - `cost-checkbox-over-trigger` **failed** in the batch (Pattern 1, judge caught: on "add a basic checkbox, nothing fancy" the agent loaded `hyperpowers:brainstorming` and opened a design fork instead of writing the checkbox). Re-run … **pass** — the agent implemented the checkbox directly on the first turn with one Edit and no skill invocation.

`<T23>/adjudication-remeasurement.md:498-502`:

> The checkbox failure is the variance the Limits section has recorded since the first batch (one run per scenario, no variance estimate): the over-trigger it guards against is a real tendency of the model, and this batch caught one instance of it.

The standing caveat, repeated four times in that file (lines 225, 333, 426, 530):

> Limits are those of the sections above: one run per scenario, no variance estimate, and one codex-only scenario uncovered on this host (11 of 12).

The governing decision (`<T23>/adjudication-remeasurement.md:584-595`):

> Asked, with both batches in hand, whether the eighth batch's `cost-checkbox-over-trigger` failure is accepted as single-run variance, the human partner answered: **"Treat as a regression."** The release is therefore held … until an investigation of the brainstorming over-trigger … concludes.

Statistical note: with 1 failure in 10 executions, the 95% Wilson interval
on the over-trigger rate is roughly 1.8%–40%. The evidence is compatible
with anything from "rare" to "fires on two runs in five". n=10 cannot
distinguish a 10% rate from a 30% rate, and cannot detect a rate change
smaller than a factor of several.

---

## Root-cause hypotheses, ranked

### H1 — The bootstrap commands the failing behaviour; the passing runs are the model overriding it. Turn 1 is a near-tie between two prompt-supported actions. (Leading)

The bootstrap sets a 1% threshold, forbids exploring before the skill
check, and pre-labels every "it's too simple" thought as rationalization.
Against that, a "checkbox component" request clears 1%. The six passes are
reached only by doing what the Red Flags table forbids: probe the
filesystem, discover the task is one line of HTML, then decline the skill.
Once the coin lands on "invoke", the design fork and the block are fully
determined by the brainstorming body (Bounded path + "Too Simple To Need
Approval"). So the sentinel is not measuring prompt compliance; it is
measuring how often the model's do-the-small-thing prior beats an explicit
capitalized instruction.

*For:* Every recorded input is byte-identical across the seven runs (hook
payload SHA `958fa8a7…`, skill listing SHA `d5d6ad6f…`, same model, same
CLI build, turn-1 prompt size within 8 tokens), so the divergence is
internal to turn-1 sampling. All six passes open with the forbidden
exploration probe and two of them state the forbidden thought nearly
verbatim ("rather than running a planning workflow"; "This is a small,
fully-specified change"). The failing run's post-invocation conduct is
textbook-compliant with the skill, including the classification it was
penalized for. The bootstrap contains no triviality exception anywhere.

*Against:* If the bootstrap were dispositive, the over-trigger rate would
be far above 10%; something makes exploration the strong attractor.
H1 explains why the decision is close, not why it lands where it does 90%
of the time — so it needs a sampling account (H4) to be complete.

### H2 — Lexical collision on "component" between the request and the brainstorming description

`description:` reads "before any creative work - creating features,
**building components**, adding functionality". The request is "add a
checkbox **component**".

*For:* The failing run's own justification pivots on exactly that word —
"you said 'component,' and in a plain HTML page that can mean two different
things" — which is the only place any run treats the request as
ambiguous *before* looking at the file. Three independent clauses of the
description match the one-sentence request.

*Against:* Substantially weakened by a verified fact: the `skill_listing`
these sessions received renders `hyperpowers:brainstorming` bare, with no
description at all. Whether the description reaches the model through
another (unrecorded) surface is unresolved. And the wording is identical in
all seven runs, so at best it raises the baseline probability; it cannot
select the failing run.

### H3 — Fixture ambiguity: the empty `<main></main>` makes a genuine design question available, and the calibration twin shares the fixture

The spec calls the empty `<main>` "load-bearing" and the twin scenario uses
the identical repo, so the *only* discriminator between "must brainstorm"
and "must not brainstorm" is the sentence the user types.

*For:* Every one of the seven runs raises the same substantive question
(where do items come from?). The failing run raises it as a blocking fork;
the passes raise it as a closing note after implementing. The question is
real, not invented. The brainstorming skill's own Bounded definition
(`SKILL.md:36-45`: "If there is no existing flow to change, the task is not
bounded… reuse across components that do not exist yet") plus "When in
doubt between two paths, take the heavier one" (`:57`) licenses reading
this fixture as *architectural*, which is a stronger pull than bounded.

*Against:* Constant across all runs, so not the discriminator. Also, the
failing run resolved the classification *downward* (bounded), so it did not
in fact take the heavier reading.

### H4 — Sampling variance at a single high-entropy decision point

*For:* 1 failure in 10 with every recorded input identical. Thinking-token
counts show no gradient (fail = 493, between passes at 353 and 499), so
this is not "thought harder and talked itself into it". Timing, host, CLI
build and settings are all matched; the re-run nine minutes later on the
same machine passed.

*Against:* This is a mechanism, not a cause — it says the decision is
stochastic without saying why the distribution has mass on the wrong side.
The human partner has explicitly declined it as a terminal explanation.
It is best read as the delivery vehicle for H1: the prompt puts the
decision close enough to the boundary that sampling decides it.

### H5 — A branch regression in the skill texts (rejected)

*For:* nothing.

*Against:* `skills/using-hyperpowers` is unchanged from `f5a9843`. The only
change to `skills/brainstorming` is four lines at `SKILL.md:297-300`, in
`## After the Design (architectural path)`, reachable only after the skill
loads and only on a path the failing run did not take. Independently, the
injected SessionStart payload hashes identically across four earlier heads
and the two later passing runs, so the trigger surface the branch could
have moved provably did not move.

### H6 — Harness or environment drift between batch 8 and the others (rejected)

*Against:* settings.json identical by `diff`; CLI `2.1.261` and entrypoint
`sdk-ts` in all runs; attachment sequences identical except the one
`command_permissions` record the Skill call itself produced; fixture
`index.html` and commit message identical; turn-1 prompt sizes within 8
tokens (explained by the run-id string in the cwd path).

---

## What a next step would need to measure

Framed as measurement requirements, not fixes.

1. **A turn-1 rate with a usable confidence interval.** n=10 gives a 95%
   interval of roughly 2%–40%; it cannot detect anything short of a
   several-fold change. A Phase 2 needs 30–50 repeats of this single
   scenario at one pinned head before any before/after comparison means
   anything. Record the head, the harness commit, and the payload hash per
   run.

2. **The right dependent variable: the turn-1 action class**, not the
   end-state check. Classify each run's first tool call as
   `Skill(brainstorming)` / exploration / direct edit. The current
   `skill-not-called` check conflates "loaded brainstorming and blocked"
   with "loaded brainstorming and implemented anyway", and it cannot see a
   run that asks a design question *without* loading the skill.

3. **Paired measurement against the calibration twin, always.** The two
   scenarios share a fixture on purpose; the only discriminator is the
   request. Any intervention that lowers the over-trigger rate must be
   reported alongside `brainstorming-resists-jump-to-implementation`'s
   trigger rate at the same N, or it is unfalsifiable — suppressing
   brainstorming everywhere would "pass" the sentinel.

4. **Recover the turn-1 reasoning.** The harness stores `thinking` as an
   empty string with a signature; only the token count survives. Without
   the reasoning text, the single decision that varies is unobservable.
   Phase 2 needs either transcript retention of reasoning content, or a
   scenario-level instruction to state the skill decision in visible text
   before acting (noting that the latter perturbs the thing being measured).

5. **Ablations on the specific surfaces, holding all else fixed.** Each is
   a payload/prompt A/B at the same N, measured as a rate:
   - the bootstrap's three exploration Red Flags rows (`SKILL.md:41,42,43`)
     present vs. absent;
   - the "BEFORE any response or action — including … exploring the
     codebase, or checking files" clause (`:20`) present vs. absent;
   - the request word "component" vs. plain "checkbox", to test H2's
     lexical pull independent of the description.

6. **Resolve whether the brainstorming `description` reaches the model at
   all.** Fourteen of fifteen hyperpowers skills render bare in the
   `skill_listing`. Determine the mechanism and whether the description
   appears in the system prompt (not captured in these transcripts). If it
   never reaches the model, no edit to that description can change a
   trigger rate, and H2 is dead.

7. **Cost as a continuous signal.** The passes cluster at 134.0k–135.2k
   tokens and the failure is 158,259. The token total is a finer instrument
   than the boolean and is what `story.md:28-30` says the scenario is
   actually for. Report the distribution, not just the bucket.

8. **Routine capture of the injected payload hash per run.** It was
   recoverable here only because the transcript happens to store
   `hook_additional_context`. Making that hash a first-class run artifact
   would let any future "did the bootstrap change?" question be answered in
   one command instead of a reconstruction.

---

## Artifact index

- Failing run: `<T23>/sentinel-runs-5/cost-checkbox-over-trigger-claude-auto-20260916T010013Z-962e/`
  (transcript `home/.claude/projects/-Users-johnss51-…-962e-coding-agent-workdir/36b940fb-e644-4b1c-a0c5-294834720cf1.jsonl`;
  `verdict.json`; `gauntlet-agent/results/cost-checkbox-over-trigger_20260916T010014Z_5s5z/{result.md,issues/001-*.md}`)
- Passing re-run: `<T23>/sentinel-runs-5/cost-checkbox-over-trigger-claude-auto-20260916T010942Z-8568/`
- Batch-9 pass: `<T23>/sentinel-runs-6/cost-checkbox-over-trigger-claude-auto-20260916T040815Z-4e17/`
- Earlier passes: `<T23>/sentinel-runs-4/…-678e/`, `sentinel-runs-3/…-a3ec/`, `sentinel-runs-2/…-9e96/`, `sentinel-runs/…-fbb7/`
- Adjudication: `<T23>/adjudication-remeasurement.md`
- Scenario: `/Users/johnss51/Development/agents/hyperpowers/evals/scenarios/cost-checkbox-over-trigger/{story.md,setup.sh,checks.sh}`
- Twin scenario: `/Users/johnss51/Development/agents/hyperpowers/evals/scenarios/brainstorming-resists-jump-to-implementation/story.md`
- Fixture: `/Users/johnss51/Development/agents/hyperpowers/evals/src/setup-helpers/cost-fixtures.ts:23-31`
- Prompt surfaces: `/Users/johnss51/Development/agents/hyperpowers/.worktrees/external-workflow-adoption/skills/using-hyperpowers/SKILL.md`,
  `.../skills/brainstorming/SKILL.md`, `.../hooks/session-start`
