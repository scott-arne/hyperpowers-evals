# Codex code review gate FIRES when codex-plugin-cc is present. A stub Codex is
# seeded into the agent's plugin home; this scenario asserts the gate actually
# runs the Codex companion (not just that the skill loaded). The gate is
# Claude-only, so restrict to the claude agent.
# coding-agents: claude

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
    # The core signal: the gate fired, i.e. the agent ran the Codex companion
    # (its availability probe and/or its review call shell out to
    # codex-companion.mjs). A run that finished review without ever invoking it
    # means the gate silently skipped despite Codex being present — a fail.
    check-transcript tool-arg-match Bash --matches 'command=codex-companion[.]mjs'
}
