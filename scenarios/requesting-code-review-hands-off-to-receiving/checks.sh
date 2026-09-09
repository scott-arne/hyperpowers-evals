# Step 3 of requesting-code-review ("Act on feedback") carries a REQUIRED
# SUB-SKILL pointer to receiving-code-review. Before 6.13.0 the step was four
# bullets with no pointer, and receiving-code-review was reachable only if the
# agent happened to think of it -- it is the sole route to that skill anywhere
# in skills/. This scenario is the mechanically checkable half of the
# difference: the skill loaded, the reviewer ran, and the evaluation skill was
# entered between the findings arriving and any code changing.
#
# The judgment half -- that a finding was actually weighed rather than
# implemented on sight -- lives in the story's Acceptance Criteria, graded by
# the Gauntlet-Agent.
#
# Deliberately NOT asserted: that the Codex review gate fired. That gate runs at
# step 4, after the hand-off under test, and other scenarios already cover it.
# Binding it here would let a gate hiccup register as a routing failure. The
# stub is still seeded and its calls are still on disk for triage.
#
# Restricted to the Claude family: the directive matches the literal
# --coding-agent name, not a runtime family, so every variant is listed.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-sonnet-vertex, claude-haiku

pre() {
    git-repo
    git-branch feature/config-loader
    git-clean
    file-exists 'src/config.js'
    file-exists 'app.conf'
    # The seeded defect must actually be in the fixture: a bare `DEBUG` line
    # with no `=`, which is what makes the reviewer's findings real.
    command-succeeds 'grep -qx "DEBUG" app.conf'
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
    check-transcript skill-called hyperpowers:requesting-code-review
    # The route was taken at all.
    check-transcript skill-called hyperpowers:receiving-code-review
    # A reviewer was dispatched. `Agent` is the dispatch tool this harness
    # records (confirmed against a live SDD trajectory).
    check-transcript tool-called Agent
    # ...and the route was taken AFTER the review, not pre-loaded before it.
    # Vacuous if the agent entered receiving-code-review by reading its
    # SKILL.md instead of through the native Skill tool; `skill-called` above
    # covers presence in that case.
    check-transcript tool-match-before-tool-match Agent '[Rr]eview' Skill 'receiving-code-review'
    # ...and BEFORE any fix landed. Vacuous when nothing was edited, which is a
    # legitimate outcome: not every finding has to be acted on.
    check-transcript skill-before-implementation-tool hyperpowers:receiving-code-review Edit
    check-transcript skill-before-implementation-tool hyperpowers:receiving-code-review Write
}
