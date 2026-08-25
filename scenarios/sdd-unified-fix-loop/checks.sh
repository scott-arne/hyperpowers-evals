# SDD unified fix loop CONVERGES after a round-1 blocking finding via
# resume-based scoped re-review (rounds 1-3), fresh takeover at R=4, five-round
# cap shared across task-reviewer + Codex-gate sources, and BLOCKED escalation
# when findings survive the cap. The round-1 finding comes from the stub CODEX
# GATE — SDD's task reviewer is a live Claude subagent no fixture can force —
# and both sources feed the same loop, which is what "unified" names. The
# deterministic checks assert: skill fired, the stub gate ran, an implementer
# was dispatched, the fix was a resume (SendMessage) rather than a fresh
# dispatch, and review-package was invoked for the scoped re-review. The
# judgment calls — that the resume targeted the ORIGINAL implementer, that
# review-package carried three args with FIX_BASE ≠ task BASE, that the
# controller stopped after clean re-review rather than re-running the full task
# review, that R=4 dispatches a fresh takeover, that no sixth round occurs,
# that BLOCKED is surfaced when findings survive five rounds, and that ledger
# discipline held — live in the story's Acceptance Criteria (graded by the
# Gauntlet-Agent), because those patterns need semantic reasoning the bare
# verbs cannot bound deterministically. Claude-Code-only gate; both hyperpowers
# and upstream superpowers namespace variants are accepted.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/plan-execution
    file-exists 'plan.md'
    command-succeeds 'grep -q "^\*\*Spec:\*\*" plan.md'
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
}

post() {
    # SDD skill invoked
    check-transcript skill-called superpowers:subagent-driven-development hyperpowers:subagent-driven-development

    # The stub review gate fired (at least once, for task-reviewer or Codex or both)
    check-transcript tool-arg-match Bash --matches 'command=codex-companion[.]mjs'

    # NOTE: no deterministic ledger check, for two independent reasons.
    #
    # (1) Existence cannot be asserted here. SDD's Finish step DELETES the plan
    # workspace once the final whole-branch review is clean, so at post-check
    # time the ledger is legitimately GONE. A filesystem assertion inverts the
    # test: it passes when the skill stops short of Finish and fails precisely
    # when the skill completes correctly. The sibling sdd-plan-scoped-scratch
    # scenario documents the same rule and omits the same check.
    #
    # (2) Neither can it be asserted from the transcript by tool. The previous
    # revision matched Bash commands mentioning progress.md; that failed on a
    # run whose ledger was written correctly, because the agent used Write
    # rather than Bash. tool-arg-match binds to one tool and no verb ORs across
    # tools, so any single-tool matcher here is a coin flip on tool choice.
    #
    # Ledger discipline — the identity first line, and never touching another
    # plan's ledger — is graded by the Gauntlet-Agent against the story's
    # Acceptance Criteria, which can read intent rather than tool selection.

    # The implementer subagent was dispatched (an Agent call for the implementer)
    check-transcript tool-called Agent

    # SendMessage was used for fix-round resume (the resume path after round 1
    # findings). This is a necessary but not sufficient signal: the AC prose
    # verifies it was the ORIGINAL implementer being resumed, not a fresh
    # dispatch. The transcript check here just confirms SendMessage appears.
    check-transcript tool-called SendMessage

    # The scoped re-review path was exercised: review-package was called (the
    # Bash command that packages the diff for re-review). Full verification that
    # it was invoked with three args (PLAN FIX_BASE HEAD) where FIX_BASE ≠ BASE
    # is a sequencing/semantic judgment the Gauntlet-Agent grades; the
    # deterministic check here just confirms the helper was invoked.
    check-transcript tool-arg-match Bash --matches 'command=.*review-package'
}
