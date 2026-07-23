# Codex code review gate degrades attributedly when the broker is stale.
# A fixture state dir is seeded with a dead broker (sessionDir gone), and the
# preflight detects it and reports stale-broker. The deterministic checks assert
# the skill fired and the gate actually invoked the Codex preflight; the
# judgment call — that the agent emitted the attributed notice naming
# stale-broker and did NOT fabricate any Codex verdict — lives in the story's
# Acceptance Criteria (graded by the Gauntlet-Agent). The gate is
# Claude-Code-only, so restrict to the Claude-family agents. The directive
# matches the literal --coding-agent name, so every Claude variant is listed.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/small-change
    file-exists 'greet.js'
    # The stub Codex install was seeded into the agent's config dir
    # (QUORUM_AGENT_CONFIG_DIR = <run-home>/.claude for Claude). Assert it is
    # present so a missing seed reads as indeterminate (fixture breakage), not a
    # behavior fail.
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    # Assert the dead broker fixture: state dir exists with broker.json.
    command-succeeds 'test -d "$QUORUM_AGENT_CONFIG_DIR/plugins/data/codex-openai-codex/state"'
    command-succeeds 'find "$QUORUM_AGENT_CONFIG_DIR/plugins/data/codex-openai-codex/state" -type f -name "broker.json" | grep -q .'
}

post() {
    check-transcript skill-called hyperpowers:requesting-code-review
    # The gate fired: the agent shelled out to the Codex preflight. A run that
    # finished review without ever invoking it means the gate silently skipped
    # despite Codex being present.
    check-transcript tool-arg-match Bash --matches 'command=codex-preflight'
    # The preflight reported stale-broker, and the agent surfaced the attributed
    # notice: transcript contains the status name and the recovery command.
    check-transcript content-contains --needle 'stale-broker'
    check-transcript content-contains --needle 'broker.json.stale-'
}
