# Codex code review gate CONVERGES after the round-1 blocking finding is
# addressed. A stub Codex flags one blocking finding on the first review and
# approves every review after. The deterministic checks assert the skill fired,
# the gate invoked the companion, and the review ran more than once (the fix was
# re-reviewed). The judgment call — that the agent STOPPED once the re-review
# came back clean rather than thrashing — lives in the story's Acceptance
# Criteria (graded by the Gauntlet-Agent). Claude-Code-only gate; every Claude
# variant is listed explicitly.
# coding-agents: claude, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/small-change
    file-exists 'greet.js'
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
}

post() {
    check-transcript skill-called superpowers:requesting-code-review
    # The gate fired: the agent shelled out to the Codex companion. The full
    # loop shape — ran the review more than once, then STOPPED once it came back
    # clean — is a sequencing/judgment call the transcript verbs cannot bound
    # deterministically (tool-count can't filter Bash by argument, and "stopped
    # after clean" has no negative anchor), so it lives in the AC prose, graded
    # by the Gauntlet-Agent. A per-invocation count check here would either
    # over-count unrelated Bash calls or vacuously pass, so it is omitted on
    # purpose rather than asserted misleadingly.
    check-transcript tool-arg-match Bash --matches 'command=codex-companion[.]mjs'
}
