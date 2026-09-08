# A per-task Codex code gate resumed at round 2. The fixture stages a spent
# round 1 (gate-round.json, a round ledger with two resolved and one declined
# finding, a committed fix diff) and the four task materials the §3 per-task
# focus string names. The stub companion records every adversarial-review focus
# argument, so the checks measure the string the launch actually carried rather
# than the transcript's rendering of it.
#
# The measured defect: the round-2 focus restates the ledger inline — findings
# retyped, the fix summarized, the diff quoted — when the ledger is already
# handed over as a path. The checks bound it four ways: a word ceiling, the
# ledger path present, the ledger's planted finding title absent, and the whole
# fixed shape. Every expectation is derived from the plugin files the run used,
# so the checks cannot drift from the skill text they judge. The gate is
# Claude-Code-only, so restrict to Claude-family agents.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/flush-queue
    file-exists 'flush.js'
    # The four files the §3 per-task focus string names.
    file-exists '.cache/hyperpowers/sdd-scratch/task-1/task-brief.md'
    file-exists '.cache/hyperpowers/sdd-scratch/task-1/implementer-report.md'
    file-exists '.cache/hyperpowers/sdd-scratch/task-1/review-package.md'
    file-exists '.cache/hyperpowers/sdd-scratch/global-constraints.md'
    # The stub Codex install.
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'node "$QUORUM_AGENT_CONFIG_DIR/plugins/cache/openai-codex/codex/stub/scripts/codex-companion.mjs" setup --json >/dev/null'
    # The mid-loop gate: round 1 spent, ledger written, nothing launched yet.
    command-succeeds 'G="$(dirname "$QUORUM_AGENT_CONFIG_DIR")/.cache/hyperpowers/codex-review/active-gate"; grep -q "\"round\":1" "$G/gate-round.json" && grep -qi "orphaned retry sentinel" "$G/codex-round-ledger.md"'
    command-succeeds 'test ! -e "$QUORUM_AGENT_CONFIG_DIR/plugins/cache/openai-codex/codex/stub/scripts/.launches"'
    # The assertion the post-checks run, and the plugin root it derives from.
    command-succeeds 'A="$(dirname "$QUORUM_AGENT_CONFIG_DIR")/.focus-assert"; test -f "$A/focus-assert.mjs" && test -f "$A/manifest.json"'
}

post() {
    check-transcript skill-called hyperpowers:requesting-code-review
    check-transcript tool-arg-match Bash --matches 'command=codex-companion[.]mjs'
    # The round-2 re-review was actually launched, so the checks below are not
    # asserting over an empty set.
    command-succeeds 'node "$(dirname "$QUORUM_AGENT_CONFIG_DIR")/.focus-assert/focus-assert.mjs" launched'
    # The focus string stays short: the ledger it hands over carries the detail.
    command-succeeds 'node "$(dirname "$QUORUM_AGENT_CONFIG_DIR")/.focus-assert/focus-assert.mjs" words'
    # It hands the findings over as a path.
    command-succeeds 'node "$(dirname "$QUORUM_AGENT_CONFIG_DIR")/.focus-assert/focus-assert.mjs" ledger'
    # It does not also restate them: the ledger's first finding title is planted
    # with a distinctive noun phrase that must not appear in the launch.
    command-succeeds 'node "$(dirname "$QUORUM_AGENT_CONFIG_DIR")/.focus-assert/focus-assert.mjs" no-restate'
    # The complete fixed shape: the round-aware preamble, the ledger path, the
    # §3 per-task focus string, and nothing before, between, or after.
    command-succeeds 'node "$(dirname "$QUORUM_AGENT_CONFIG_DIR")/.focus-assert/focus-assert.mjs" shape'
}
