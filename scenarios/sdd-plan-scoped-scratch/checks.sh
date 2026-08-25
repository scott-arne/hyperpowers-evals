# SDD plan-scoped scratch isolates each plan's workspace and ledger. Plan A's
# COMPLETED workspace is pre-seeded by the fixture; plan B is the plan under
# execution. Deterministic checks verify: skill fired, codex stub invoked, plan
# B's workspace exists with the correct slug pattern, plan A's workspace still
# exists after plan B completes, and plan B's workspace is deleted on clean
# finish. The cross-plan ledger-access prohibition is semantic (which tool calls
# accessed which paths) and lives in the story's Acceptance Criteria for
# Gauntlet-Agent grading, because path-matching transcript analysis needs
# reasoning the bare verbs cannot bound deterministically. Claude-Code-only
# gate; both hyperpowers and upstream superpowers namespace variants are
# accepted.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/multi-plan
    file-exists 'docs/superpowers/plans/planA.md'
    file-exists 'docs/superpowers/plans/planB.md'
    # Plan A's workspace must exist before the run starts (seeded by setup.sh).
    # The exact path is computed by the candidate's sdd-dir; we assert it exists
    # by checking that SOME ledger matching plan A's identity line exists under
    # the harness home cache (workspaces live under $HOME/.cache, not the repo).
    
    command-succeeds 'find ../home/.cache -type f -name "progress.md" -exec grep -l "^# SDD ledger — plan: docs/superpowers/plans/planA.md" {} \; 2>/dev/null | grep -q .'
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
}

post() {
    # SDD skill invoked for plan B
    check-transcript skill-called superpowers:subagent-driven-development hyperpowers:subagent-driven-development

    # The stub review gate fired (at least once)
    check-transcript tool-arg-match Bash --matches 'command=codex-companion[.]mjs'

    # NOTE: no positive post-check for plan B's ledger existence — the skill's
    # delete-at-finish removes plan B's workspace on a clean finish, so at
    # post-check time the ledger is legitimately GONE. Its in-run existence and
    # identity line are covered by the Acceptance Criteria (Gauntlet-verified),
    # and its post-run ABSENCE is asserted by the negated check below.

    # The implementer subagent was dispatched (an Agent call for the implementer)
    check-transcript tool-called Agent

    # Plan A's workspace still exists after plan B completes (the controller does
    # not delete sibling plan workspaces; only the current plan's workspace is
    # deleted on clean finish).
    
    command-succeeds 'find ../home/.cache -type f -name "progress.md" -exec grep -l "^# SDD ledger — plan: docs/superpowers/plans/planA.md" {} \; 2>/dev/null | grep -q .'

    # Plan B's workspace is deleted on clean finish (the scoped cleanup). This is
    # the key signal: after a successful SDD run, the plan's workspace dir
    # (plans/planB-<hash8>) should NOT exist. We check that no ledger matching
    # plan B's identity survives under harness home cache (it was deleted).
    
    not command-succeeds 'find ../home/.cache -type f -name "progress.md" -path "*/plans/planB-*" -exec grep -l "^# SDD ledger — plan: docs/superpowers/plans/planB.md" {} \; 2>/dev/null | grep -q .'
}
