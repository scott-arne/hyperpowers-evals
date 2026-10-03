"""Insert one hyperpowers:communication cross-reference per skill, at the anchors
surveyed on 2026-10-03. Every anchor must match exactly once or nothing is written."""
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
S = ROOT / "skills"

EDITS = [
    (S / "using-hyperpowers/SKILL.md",
     '- "Fix this bug" → hyperpowers:systematic-debugging first, then domain skills.\n',
     '- "Fix this bug" → hyperpowers:systematic-debugging first, then domain skills.\n'
     '- Writing for your human partner (a summary, a finding, a design, a plan, a recommendation, or any reply longer than a few sentences) → hyperpowers:communication before you write it.\n'),
    (S / "brainstorming/SKILL.md",
     "the approval gate never does.\n</HARD-GATE>\n\n",
     "the approval gate never does.\n</HARD-GATE>\n\n"
     "**REQUIRED SUB-SKILL:** Use hyperpowers:communication for everything your human partner reads on every path: the questions, the approach comparison, the design presentation, and the spec.\n\n"),
    (S / "writing-plans/SKILL.md",
     '**Announce at start:** "I\'m using the writing-plans skill to create the implementation plan."\n\n',
     '**Announce at start:** "I\'m using the writing-plans skill to create the implementation plan."\n\n'
     "**REQUIRED SUB-SKILL:** Use hyperpowers:communication for the plan's prose and for the handoff message. Your human partner reads the plan before any implementer does.\n\n"),
    (S / "subagent-driven-development/SKILL.md",
     "**Narration:** between tool calls, narrate at most one short line — the\nledger and the tool results carry the record.\n\n",
     "**Narration:** between tool calls, narrate at most one short line — the\nledger and the tool results carry the record.\n\n"
     "**REQUIRED SUB-SKILL:** Use hyperpowers:communication for anything you write to your human partner in this skill: the pre-flight question, an escalation, a BLOCKED hand-back.\n\n"),
    (S / "executing-plans/SKILL.md",
     '**Announce at start:** "I\'m using the executing-plans skill to implement this plan."\n\n',
     '**Announce at start:** "I\'m using the executing-plans skill to implement this plan."\n\n'
     "**REQUIRED SUB-SKILL:** Use hyperpowers:communication for the concerns you raise before starting and for the completion report.\n\n"),
    (S / "finishing-a-development-branch/SKILL.md",
     '**Announce at start:** "I\'m using the finishing-a-development-branch skill to complete this work."\n\n',
     '**Announce at start:** "I\'m using the finishing-a-development-branch skill to complete this work."\n\n'
     "**REQUIRED SUB-SKILL:** Use hyperpowers:communication for the test-failure report and the PR description. The option menus below are presented exactly as written.\n\n"),
    (S / "requesting-code-review/SKILL.md",
     "**Core principle:** Review early, review often.\n\n",
     "**Core principle:** Review early, review often.\n\n"
     "**REQUIRED SUB-SKILL:** Use hyperpowers:communication when you report findings or a gate hand-back to your human partner. The fixed notices in gate-preflight.md are quoted as written.\n\n"),
    (S / "receiving-code-review/SKILL.md",
     "**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.\n\n",
     "**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.\n\n"
     "**REQUIRED SUB-SKILL:** Use hyperpowers:communication for the reply itself, whether it goes to your human partner or into a review thread.\n\n"),
    (S / "systematic-debugging/SKILL.md",
     "**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.\n\n",
     "**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.\n\n"
     "**REQUIRED SUB-SKILL:** Use hyperpowers:communication when you report a root cause, state a hypothesis, or bring a question to your human partner.\n\n"),
    (S / "dispatching-parallel-agents/SKILL.md",
     "- Run full test suite\n- Integrate all changes\n",
     "- Run full test suite\n- Integrate all changes\n"
     "- Report the synthesis to your human partner. **REQUIRED SUB-SKILL:** Use hyperpowers:communication for that report.\n"),
    (S / "optimizing-performance/SKILL.md",
     "## Final Report\n\nBuilt from the attempts ledger, presented at the end.",
     "## Final Report\n\n**REQUIRED SUB-SKILL:** Use hyperpowers:communication to write this report.\n\nBuilt from the attempts ledger, presented at the end."),
    (S / "profiling-performance/SKILL.md",
     "**Output this ranked list** as the primary deliverable. The `hyperpowers:optimizing-performance` skill consumes this list.\n",
     "**Output this ranked list** as the primary deliverable. The `hyperpowers:optimizing-performance` skill consumes this list.\n\n"
     "**REQUIRED SUB-SKILL:** Use hyperpowers:communication to write the deliverable your human partner reads.\n"),
    (ROOT / "scripts/claude-skill-root.md",
     '"Fix this bug" → systematic-debugging first, then domain-specific skills.\n',
     '"Fix this bug" → systematic-debugging first, then domain-specific skills.\n'
     'Writing for your human partner (a summary, a finding, a design, a plan, a recommendation, or any reply longer than a few sentences) → communication before you write it.\n'),
]

planned = []
for path, old, new in EDITS:
    text = path.read_text()
    n = text.count(old)
    if n != 1:
        sys.exit(f"anchor count {n} != 1 in {path}")
    planned.append((path, text.replace(old, new)))
for path, text in planned:
    path.write_text(text)
    print("edited", path.relative_to(ROOT))
