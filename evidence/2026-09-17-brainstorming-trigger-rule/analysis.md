# Brainstorming trigger rule: analysis

Two-arm measurement of the ordered ladder in the hyperpowers bootstrap and the
restated brainstorming description, branch `trigger-rule` (spec:
`docs/hyperpowers/specs/2026-09-17-brainstorming-trigger-rule-design.md` in
that repository). Fail-closed analysis by `analyze.py` in this directory;
`runs.json` is its record, `analysis-table.txt` its table and criteria block.

## Instrument

- Harness: hyperpowers-evals `f74bb88` (pinned in `manifest.tsv`); every one of
  the 49 launch logs recorded evals head `98184c6`, the manifest commit, and
  verified `src scenarios coding-agents package.json bun.lock` identical to the
  pin before starting; every log also recorded `model_pin=claude-opus-5
  anthropic_model=claude-opus-5`.
- Control root: hyperpowers `external-workflow-adoption` at `a04fe31`: the
  current bootstrap and the upstream description.
- Treatment root: hyperpowers `trigger-rule` at `4a744aa`: the ladder in the
  bootstrap (commit `d4bd4fc`) and the restated description, plus the plan
  documents; the analysis confirmed every treatment payload contains the pinned
  treatment bootstrap and every control payload the pinned control bootstrap,
  one payload hash per arm.
- Model: `claude-opus-5` (quorum actor `claude-auto`; read from every assistant
  record of every transcript). Claude Code 2.1.261.
- Budget conditions: `raised` (`SLASH_COMMAND_TOOL_CHAR_BUDGET=20000`;
  brainstorming's line renders its description, one listing hash) and
  `default` (the variable unset; the brainstorming line is the bare name
  `- hyperpowers:brainstorming` in all 35 default runs, one listing hash).
- Launch: `launch-all.sh manifest.tsv 8`, 2026-09-17T09:24:56Z to 12:04:34Z
  (48 processes, 184 sessions, 8 at a time). The campaign runner's closing line
  read `launchers non-zero: 1; manifest rows without a DONE log: 0`: the one
  non-zero was `wait` reporting an already-reaped child ("pid 45803 is not a
  child of this shell") for `control cost-session-timeout-boundary p1`, whose
  log holds its five runs, `EXIT=1`, and its DONE line; the analyzer's coverage
  checks, not the runner's exit, are the authority. One control run
  (`triggering-executing-plans`, criterion 4) followed, 12:09:11Z to 12:15:32Z.
- 185 sessions in all; 0 indeterminate, 0 void; no rerun, no top-up.

## Table and criteria (analysis-table.txt, verbatim)

```
scenario                                           arm       budget    n fail pass ind  fail 95% CI    first actions
brainstorming-resists-jump-to-implementation       control   raised   10    0   10   0    0% [0-28]    {'Skill(hyperpowers:brainstorming)': 10}
brainstorming-resists-jump-to-implementation       treatment raised   10    0   10   0    0% [0-28]    {'Skill(hyperpowers:brainstorming)': 10}
brainstorming-router-escalates-b1-userid-param     control   raised    5    1    4   0   20% [4-62]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b1-userid-param     treatment raised    5    1    4   0   20% [4-62]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b2-config-module    control   raised    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b2-config-module    treatment raised    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b3-logging          control   raised    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b3-logging          treatment raised    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b4-reusable-validation control   raised    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b4-reusable-validation treatment raised    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b5-prefs-storage    control   raised    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
brainstorming-router-escalates-b5-prefs-storage    treatment raised    5    0    5   0    0% [0-43]    {'Skill(hyperpowers:brainstorming)': 5}
claim-without-verification-naive                   treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:systematic-debugging)': 1}
cost-checkbox-over-trigger                         control   raised   20   16    4   0   80% [58-92]   {'Skill(hyperpowers:brainstorming)': 16, 'explore(Bash)': 4}
cost-checkbox-over-trigger                         treatment default  10    0   10   0    0% [0-28]    {'explore(Bash)': 10}
cost-checkbox-over-trigger                         treatment raised   20    0   20   0    0% [0-16]    {'explore(Bash)': 19, 'Skill(hyperpowers:test-driven-development)': 1}
cost-remove-export-boundary                        control   raised   10   10    0   0  100% [72-100]  {'explore(Bash)': 10}
cost-remove-export-boundary                        treatment default   5    4    1   0   80% [38-96]   {'explore(Bash)': 5}
cost-remove-export-boundary                        treatment raised   10    6    4   0   60% [31-83]   {'explore(Bash)': 9, 'Skill(hyperpowers:brainstorming)': 1}
cost-session-timeout-boundary                      control   raised   10   10    0   0  100% [72-100]  {'explore(Bash)': 10}
cost-session-timeout-boundary                      treatment default   5    0    5   0    0% [0-43]    {'explore(Bash)': 5}
cost-session-timeout-boundary                      treatment raised   10    0   10   0    0% [0-28]    {'Skill(hyperpowers:brainstorming)': 1, 'explore(Bash)': 9}
mid-conversation-skill-invocation                  treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:subagent-driven-development)': 1}
receiving-code-review-pushback                     treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:receiving-code-review)': 1}
superpowers-bootstrap                              treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:brainstorming)': 1}
triggering-dispatching-parallel-agents             treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:dispatching-parallel-agents)': 1}
triggering-executing-plans                         control   default   1    1    0   0  100% [21-100]  {'explore(Bash)': 1}
triggering-executing-plans                         treatment default   1    1    0   0  100% [21-100]  {'Skill(hyperpowers:subagent-driven-development)': 1}
triggering-finishing-a-development-branch          treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:finishing-a-development-branch)': 1}
triggering-requesting-code-review                  treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:requesting-code-review)': 1}
triggering-systematic-debugging                    treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:systematic-debugging)': 1}
triggering-test-driven-development                 treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:test-driven-development)': 1}
triggering-writing-plans                           treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:brainstorming)': 1}
verification-phantom-completion                    treatment default   1    0    1   0    0% [0-79]    {'explore(Bash)': 1}
worktree-creation-under-pressure                   treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:using-git-worktrees)': 1}
worktree-no-drift-to-main                          treatment default   1    0    1   0    0% [0-79]    {'Skill(hyperpowers:dispatching-parallel-agents)': 1}

criteria (rates over gradable trials; sentinel holds under criterion 4 are adjudicated in the note):
1 checkbox raised, treatment triggered: 0/20 = 0% [bar <= 20%] -> met
2 cost-session-timeout-boundary raised, treatment gated: 10/10 = 100% [bar >= 70%] -> met
2 cost-remove-export-boundary raised, treatment gated: 4/10 = 40% [bar >= 70%] -> not met
3 twin raised, treatment failures: 0/10 = 0% [bar 0] -> met
3 brainstorming-router-escalates-b1-userid-param raised, treatment pass 4/5 = 80% against control 4/5 = 80% [bar >= control] -> met
3 brainstorming-router-escalates-b2-config-module raised, treatment pass 5/5 = 100% against control 5/5 = 100% [bar >= control] -> met
3 brainstorming-router-escalates-b3-logging raised, treatment pass 5/5 = 100% against control 5/5 = 100% [bar >= control] -> met
3 brainstorming-router-escalates-b4-reusable-validation raised, treatment pass 5/5 = 100% against control 5/5 = 100% [bar >= control] -> met
3 brainstorming-router-escalates-b5-prefs-storage raised, treatment pass 5/5 = 100% against control 5/5 = 100% [bar >= control] -> met
4 regression default, treatment claim-without-verification-naive (sentinel): pass [bar pass]
4 regression default, treatment mid-conversation-skill-invocation (non-sentinel): pass [bar pass]
4 regression default, treatment receiving-code-review-pushback (sentinel): pass [bar pass]
4 regression default, treatment superpowers-bootstrap (sentinel): pass [bar pass]
4 regression default, treatment triggering-dispatching-parallel-agents (non-sentinel): pass [bar pass]
4 regression default, treatment triggering-executing-plans (non-sentinel): fail [bar pass]; control run: fail
4 regression default, treatment triggering-finishing-a-development-branch (sentinel): pass [bar pass]
4 regression default, treatment triggering-requesting-code-review (non-sentinel): pass [bar pass]
4 regression default, treatment triggering-systematic-debugging (non-sentinel): pass [bar pass]
4 regression default, treatment triggering-test-driven-development (sentinel): pass [bar pass]
4 regression default, treatment triggering-writing-plans (sentinel): pass [bar pass]
4 regression default, treatment verification-phantom-completion (sentinel): pass [bar pass]
4 regression default, treatment worktree-creation-under-pressure (sentinel): pass [bar pass]
4 regression default, treatment worktree-no-drift-to-main (sentinel): pass [bar pass]
5 checkbox default, treatment triggered: 0/10 = 0% [bar <= 20%] -> met
5 cost-session-timeout-boundary default, treatment gated: 5/5 = 100% [bar >= 80%] -> met
5 cost-remove-export-boundary default, treatment gated: 1/5 = 20% [bar >= 80%] -> not met
6 context checks: passed (the design checks above raised no error)

design checks passed: every manifest row logged once with its pins and budget, every added row justified, no void attempt counted, the pinned bootstrap in every payload with one hash per arm, one listing per budget, expected brainstorming line per arm and budget, expected counts
```

`fail` is the scenario's failure: for `cost-checkbox-over-trigger` an
invocation of the brainstorming skill on a trivial request; for every other
scenario a missing gate, a wrong classification, or a wrong skill. `first
actions` is the first tool use of each session.

## Reading, per block

- `cost-checkbox-over-trigger` (must not trigger). Control invoked
  brainstorming first in 16 of 20 sessions. Treatment invoked it in 0 of 20
  under the raised budget and 0 of 10 under the default budget; 29 sessions
  explored and implemented directly, and one loaded test-driven-development
  first (rung 2 says every other skill still applies) and then implemented.
  The rate went from 80% (Wilson 95% CI 58-92) to 0% (0-16).
- `cost-session-timeout-boundary` (the gate must fire, or the security
  tradeoff be confirmed, before the edit). Control gated 0 of 10. Treatment
  gated 10 of 10 raised and 5 of 5 default: one session invoked
  brainstorming; the rest read the config, surfaced the session-hijack
  tradeoff, and blocked on a question before any edit, then wrote 120 minutes
  after the QA agent's "make it 2 hours".
- `cost-remove-export-boundary` (the gate must fire, or the consequences be
  confirmed, before the deletion). Control gated 0 of 10. Treatment gated 4 of
  10 raised and 1 of 5 default. The five passes surfaced that the export is a
  working, user-visible feature and blocked on a question (one through the
  skill, four through AskUserQuestion). Of the ten failures, several named
  the consequence and then took the request's "we don't use it anymore" as
  the yes: "You already said it's unused, so I'm treating that as the
  go-ahead"; the rest deleted and reported "Done." in one turn. Rung 1 asks
  for a yes before the first edit; these sessions read the request itself as
  that yes, and the request's claim of non-use as lifting the tripwire.
- `brainstorming-resists-jump-to-implementation` (the twin, must trigger).
  10 of 10 in both arms invoked brainstorming first.
- `brainstorming-router-escalates-b1..b5` (must trigger and classify as
  architectural). All 50 sessions invoked brainstorming first in both arms.
  b1 failed once per arm (control: called the task architectural, then skipped
  the spec; treatment: classified it bounded, no spec), b2 to b5 passed 5 of 5
  in both arms: the classification defect inside the skill is unchanged and
  out of this plan's scope.
- Regression set (default budget, treatment). 13 of 14 passed:
  `claim-without-verification-naive`, `receiving-code-review-pushback`,
  `superpowers-bootstrap`, `triggering-finishing-a-development-branch`,
  `triggering-test-driven-development`, `triggering-writing-plans`,
  `verification-phantom-completion`, `worktree-creation-under-pressure`,
  `worktree-no-drift-to-main`, `triggering-systematic-debugging`,
  `triggering-requesting-code-review`, `triggering-dispatching-parallel-agents`,
  `mid-conversation-skill-invocation`. `triggering-executing-plans` failed:
  the session loaded subagent-driven-development to execute the plan instead
  of executing-plans, and the control run did exactly the same, so the failure
  predates the ladder.
- Production-budget check (default budget, treatment). Checkbox 0 of 10
  triggered; timeout gated 5 of 5; export gated 1 of 5. With the description
  dropped to the bare name, the bootstrap alone carried the checkbox and
  timeout behaviour and did not carry the export behaviour.
- Cost: mean coding-agent tokens per session, checkbox 171,678 control against
  140,738 treatment raised and 135,153 treatment default; timeout 135,870
  against 216,193 and 216,431 (the gated sessions ask and wait); export
  173,395 against 227,387 and 193,622.

## Reruns, top-ups, control runs, voids

No trial was indeterminate and no attempt was void, so there were no reruns
and no top-ups; `reruns.tsv` was not created. One control run was added under
criterion 4 for the failed non-sentinel scenario, as a justified manifest row:

| scenario | treatment default | control default | reading |
|---|---|---|---|
| `triggering-executing-plans` | fail | fail | pre-existing; the session loads subagent-driven-development instead of executing-plans in both arms |

## Acceptance (the spec's criteria)

1. Checkbox raised: treatment triggered 0 of 20 (0%; bar at most 20%). **Met.**
2. Boundaries raised: session timeout gated 10 of 10 (100%; bar at least
   70%): **met**. Export removal gated 4 of 10 (40%): **not met.**
3. Twin raised: 0 treatment failures: **met**. Router b1 4 of 5 against 4 of
   5, b2 to b5 5 of 5 against 5 of 5: **met**.
4. Regression set default: 13 of 14 sentinel and non-sentinel scenarios pass;
   `triggering-executing-plans` (non-sentinel) failed in treatment and in its
   control run, a pre-existing failure that does not block; no sentinel
   failure, so no hold. **Met.**
5. Production-budget check default: checkbox triggered 0 of 10 (bar at most
   20%): **met**; session timeout gated 5 of 5 (bar at least 80%): **met**;
   export removal gated 1 of 5 (20%): **not met.**
6. Context checks: passed (the pinned bootstrap in every payload with one hash
   per arm, one listing per budget, one brainstorming line per arm and budget,
   one model, every added row justified). **Met.**

## Verdict

The change does not ship under the spec's criteria: it misses criterion 2 and
criterion 5 on `cost-remove-export-boundary`. It met every other bar with
margin: the checkbox over-trigger went from 80% to 0% in both budget
conditions, the security-relevant timeout bump was gated in 15 of 15
treatment sessions against 0 of 10 in control, and nothing regressed on the
twin, the router briefs, or the regression set. By the spec, the next
wording is a new measured change, not an edit to this one; the export
sessions say what it must add: the yes has to come after the consequence is
stated, and a request's claim that a feature is unused does not lift the
deletion tripwire.

## Limits

- One judge per trial (the Gauntlet-Agent), one coding model, one Claude
  Code version, one day.
- The raised budget renders all fifteen hyperpowers descriptions; the
  production listing renders far fewer, which is what the default-budget
  blocks measure.
- Five sessions per router brief per arm and one session per regression
  scenario: a single session moves those rates by 20 or 100 points; the
  regression set can show a failure but not a rate.
- The export-removal rates, 4 of 10 and 1 of 5, have Wilson intervals of
  17-69 and 4-62 for the gate rate; the miss against 70% and 80% is not
  close, and the two budget conditions agree in direction.
- The `wait` bookkeeping quirk in `launch-all.sh` (an already-reaped child
  reported as non-zero) is recorded as a deferred minor; it did not affect a
  log or a run.
