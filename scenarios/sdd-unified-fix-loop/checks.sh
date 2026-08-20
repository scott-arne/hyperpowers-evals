# SDD unified fix loop CONVERGES after task-reviewer round-1 findings via
# resume-based scoped re-review (rounds 1-3), fresh takeover at R=4, five-round
# cap shared across task-reviewer + Codex-gate sources, and BLOCKED escalation
# when findings survive the cap. A stub task-reviewer and Codex gate both flag
# one blocking finding on the first review and approve every review after. The
# deterministic checks assert: skill fired, the implementer was resumed (not
# re-dispatched) for the first fix, scoped re-review was used (review-package
# with three args: PLAN FIX_BASE HEAD where FIX_BASE ≠ task BASE), and the
# ledger discipline is correct. The judgment calls — that the controller stopped
# after clean re-review rather than re-running the full task review, that R=4
# dispatches a fresh takeover, that no sixth round occurs, and that BLOCKED is
# surfaced when findings survive five rounds — live in the story's Acceptance
# Criteria (graded by the Gauntlet-Agent), because transcript sequencing for
# those patterns needs semantic reasoning the bare verbs cannot bound
# deterministically. Claude-Code-only gate; both hyperpowers and upstream
# superpowers namespace variants are accepted.
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

    # Ledger file created with correct first-line pattern. The real ledger path
    # is under .cache/hyperpowers/sdd/<hash>/ledgers/<plan-hash>.ledger (or
    # .superpowers/sdd/... for upstream). We assert that SOME ledger exists
    # matching the pattern, not a specific path, because the hash is not known
    # at authoring time.
    check-transcript tool-arg-match Bash --matches 'command=.*progress\.md'
    command-succeeds 'find ../home/.cache -path "*/sdd/*/plans/*/progress.md" 2>/dev/null | xargs grep -l "^# SDD ledger — plan:" | grep -q .'

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
