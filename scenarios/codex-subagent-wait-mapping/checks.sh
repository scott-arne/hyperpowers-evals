# coding-agents: codex
#
# Codex's spawn_agent is aliased to canonical "Agent" by CODEX_TOOL_MAP
# in harness/normalizers.py; the checks below use the post-alias name.
# wait_agent and wait are NOT aliased — checking them by their raw
# codex names is still the right form.

pre() {
    git-repo
    git-branch main
}

post() {
    tool-called Agent
    tool-called wait_agent
    tool-not-called wait
    tool-before Agent wait_agent
}
