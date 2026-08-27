# Codex code review gate exits by BACKSTOP with a live blocking finding. A stub
# Codex returns a different blocking finding on every review, so the loop cannot
# converge: it spends the code gate's 3-round ceiling, and the finding raised in
# that last round has no round left to confirm a fix for it. The deterministic
# checks assert the skill fired, the gate invoked the companion, and the round
# counter ran at the code-gate ceiling of 3 (which is what makes "backstop" a
# mechanical state rather than the agent's recollection). The judgment call —
# that the agent NAMED the last finding's disposition and its price instead of
# silently fixing and reporting done — lives in the story's Acceptance Criteria,
# graded by the Gauntlet-Agent. Claude-Code-only gate; every Claude variant is
# listed explicitly.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/small-change
    file-exists 'greet.js'
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
}

post() {
    check-transcript skill-called superpowers:requesting-code-review
    # The gate fired: the agent shelled out to the Codex companion.
    check-transcript tool-arg-match Bash --matches 'command=codex-companion[.]mjs'
    # The mechanical round counter drove the loop, at the CODE-gate ceiling.
    # Both matchers bind to the same Bash call, so this asserts one gate-round
    # invocation carrying `--ceiling 3` — not two unrelated commands. A run that
    # passed the document ceiling of 4 would give the loop a fourth round and
    # dissolve the backstop this scenario exists to produce.
    check-transcript tool-arg-match Bash \
        --matches 'command=gate-round' \
        --matches 'command=--ceiling 3'
    # Deliberately NOT asserted: an ungated-ledger append. Declining the
    # backstop-round finding is a legal disposition — the one the skill names
    # first — and it writes no ledger entry, so requiring the append here would
    # fail the best answer. Whether the disposition was stated at all is prose,
    # graded by the Gauntlet-Agent. Likewise the backstop verdict itself: it
    # arrives on gate-round's stdout, which the transcript verbs match against
    # tool ARGUMENTS, not output.
}
