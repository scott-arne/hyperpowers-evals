# SDD ledger — plan: plan.md
session bc6569d5-8d59-49f1-ae53-b2fdcb59f192: mode current-branch on feature/textstats integrating feature/textstats at /Users/johnss51/Development/agents/hyperpowers/evals/results/workspaces/sdd-compaction-reread-claude-auto-20261112T231620Z-59e5/coding-agent-workdir started 2026-11-12T23:17:49Z
plan: integration feature/textstats code-root e20c8e7 plan-ref feature/textstats plan-root e20c8e7 spec none (fixture)
Spec: none (fixture) — conflicts have no tiebreaker but the human partner.
Decisions: none (no spec)
Risk tiers: none declared → all tasks standard.
deps: task=1 none; task=2 1; task=3 1,2; task=4 1,2,3. deps --check: clean.

## Pre-flight scan
| Pair/Task | Produces vs consumes | Finding |
|---|---|---|
| T1↔T2,T3,T4 (src/textstats.js) | T1 makes tokenize/assertText/wordCount; later tasks append and replace only the export line | consistent |
| T2↔T3, T3↔T4 (export line) | each replaces the previous task's exact export line | consistent |
| T4↔T1 | readingTimeMinutes calls wordCount | consistent |
| T1 self | Unused PASSAGE constant (comment says wc -w checked); behaviours with no tests: joiners ' ’ -, stray joiners, 3.14, example.com, letter-free strings. Test count 8 matches the code | CONFLICT: dead constant + untested rules |
| T2 self | PASSAGE unused, but the prose says hand counts were made for it (8 sentences, I checked the count against the code: 8). Abbreviations/decimals/closing quotes untested | CONFLICT: prose names a test the code lacks |
| T3 self | PASSAGE unused, prose says "passage test pins the ranking". Comment leaves out climbed/hand/lit/old/older/shook (count 1), so top-5 would have climbed in 5th place, not storm. n RangeError, case/apostrophe folding, fresh objects: untested | CONFLICT |
| T4 self | Prose names a 270-word multi-paragraph test the code lacks; wpm RangeError and fractional wpm untested | CONFLICT |
