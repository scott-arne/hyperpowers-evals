# Codex code review gate treats an INCOMPLETE Codex result as not-approval.
# A stub Codex is seeded whose review never finishes (status stays "running",
# no verdict). The deterministic checks assert the skill fired and the gate
# actually invoked the Codex companion; the judgment call — that the agent did
# NOT report a pass/approval off the unfinished review — lives in the story's
# Acceptance Criteria (graded by the Gauntlet-Agent). The gate is
# Claude-Code-only, so restrict to the Claude-family agents. The directive
# matches the literal --coding-agent name, so every Claude variant is listed.
# coding-agents: claude, claude-bedrock, claude-sonnet, claude-haiku

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
}

post() {
    check-transcript skill-called superpowers:requesting-code-review
    # The gate fired: the agent shelled out to the Codex companion. A run that
    # finished review without ever invoking it means the gate silently skipped
    # despite Codex being present.
    check-transcript tool-arg-match Bash --matches 'command=codex-companion[.]mjs'
    # Under the gate's detached-launch contract the agent must consult the job
    # registry (job-id capture and/or the status --wait watch loop) rather than
    # trust the launch stdout alone. At least one status invocation is the
    # deterministic floor of that behavior; the full loop shape stays in the AC
    # prose.
    check-transcript tool-arg-match Bash --matches 'command=codex-companion[.]mjs.* status'
}
