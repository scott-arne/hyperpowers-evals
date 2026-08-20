# Brainstorming bounded path fires approach gate (presents alternatives, gets
# approval) WITHOUT producing a spec file. The brief is clearly bounded (add
# truncate option with two genuine alternatives); the agent must classify it as
# bounded, present the alternatives in chat, get approval, and implement —
# WITHOUT escalating to the architectural path (no spec file). Deterministic
# checks verify: skill fired, NO spec file was created under docs/, and the
# approach gate fired (alternatives presented in transcript). The semantic
# judgments (was the classification correct, were alternatives presented, was
# approval requested) live in the story's Acceptance Criteria for Gauntlet-Agent
# grading. Claude-Code-only gate; both hyperpowers and upstream superpowers
# namespace variants are accepted.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/add-truncate
    file-exists 'format.js'
    file-exists 'format.test.js'
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
}

post() {
    # Brainstorming skill invoked
    check-transcript skill-called superpowers:brainstorming hyperpowers:brainstorming

    # NO spec file created under docs/ (bounded path keeps design in chat). This
    # is a critical negative assertion: the bounded path does NOT produce a spec
    # document. If a spec file exists, the agent inappropriately escalated to
    # the architectural path.
    not command-succeeds 'find . -type f \( -path "./docs/superpowers/specs/*.md" -o -path "./docs/hyperpowers/specs/*.md" \) 2>/dev/null | grep -q .'

    # Approach gate fired: the agent presented alternatives and requested
    # approval. The semantic verification (were the two truncation approaches
    # presented, was approval requested) lives in the AC prose for Gauntlet
    # grading. The deterministic check here just confirms the skill fired and no
    # spec was created (covered above).

    # NOTE: The agent may or may not have created implementation code by the
    # post-check time (it might still be mid-implementation when the session
    # caps), so we do NOT assert that format.js was modified. The AC prose
    # verifies the agent began implementation after approval.
}
