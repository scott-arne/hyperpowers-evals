# The inline-path note in executing-plans (SKILL.md:14) tells the agent it is on
# the inline path because its human partner asked for it, and not to re-open the
# choice. The 6.12.0 text said the opposite: recommend subagent-driven
# development whenever subagents are available. This scenario is the
# mechanically checkable half of that difference -- the user asked for inline
# execution with no subagents, so a compliant run loads executing-plans, never
# loads subagent-driven-development, and dispatches nothing.
#
# The judgment half -- that the agent did not *argue* for switching before
# complying -- is not mechanically checkable and lives in the story's Acceptance
# Criteria, graded by the Gauntlet-Agent.
#
# Restricted to the Claude family: the directive matches the literal
# --coding-agent name, not a runtime family, so every variant is listed.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-sonnet-vertex, claude-haiku

pre() {
    git-repo
    git-branch main
    git-clean
    file-exists 'docs/hyperpowers/plans/2026-09-09-config-flags.md'
    file-exists 'package.json'
    file-exists 'src/utils.js'
    # The stub Codex install was seeded into the agent's config dir
    # (QUORUM_AGENT_CONFIG_DIR = <run-home>/.claude for Claude). A missing seed
    # should read as fixture breakage, not as a behavior result.
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'test -f "$(dirname "$QUORUM_AGENT_CONFIG_DIR")/.codex-stub-job-protocol"'
    # Stub health: the companion script must execute successfully.
    command-succeeds 'STUB=$(node -e "const d=JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")); console.log(d.plugins[\"codex@openai-codex\"][0].installPath)" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"); node "$STUB/scripts/codex-companion.mjs" setup --json >/dev/null'
}

post() {
    # The inline path was taken...
    check-transcript skill-called hyperpowers:executing-plans
    # ...and the choice was not re-opened by loading the other path.
    check-transcript skill-not-called hyperpowers:subagent-driven-development
    # No work was handed off. `Agent` is the dispatch tool this harness actually
    # records (confirmed against a live SDD trajectory); `Task` is asserted too
    # so a rename cannot silently void the check by making it match nothing.
    check-transcript tool-not-called Agent
    check-transcript tool-not-called Task
}
