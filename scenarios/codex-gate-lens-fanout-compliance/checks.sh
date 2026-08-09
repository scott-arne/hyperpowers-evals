# Lens fan-out compliance: round 1 of a per-task Codex code gate is a
# dossier-backed three-lens fan-out. The fixture pre-stages a completed task
# (brief, report, review package, committed diff) and a working stub Codex
# install. The scenario asserts that the agent assembles a dossier before any
# lens launch, records exactly one round, generates exactly 3 lens prompts, and
# merges verdicts per the capture-set rule. The judgment calls — that the
# dossier was assembled BEFORE lens launches, normalization included the coverage
# flag, and the merged verdict follows the capture-set rule — live in the story's
# Acceptance Criteria (graded by the Gauntlet-Agent). The gate is Claude-Code-only,
# so restrict to Claude-family agents.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/add-utils
    file-exists 'utils.js'
    # The stub Codex install was seeded into the agent's config dir.
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    # Stub health: the companion script must execute successfully
    command-succeeds 'STUB=$(node -e "const d=JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")); console.log(d.plugins[\"codex@openai-codex\"][0].installPath)" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"); node "$STUB/scripts/codex-companion.mjs" setup --json >/dev/null'
    # The pre-staged task materials must be present.
    file-exists '.cache/hyperpowers/sdd-scratch/task-1/task-brief.md'
    file-exists '.cache/hyperpowers/sdd-scratch/task-1/implementer-report.md'
    file-exists '.cache/hyperpowers/sdd-scratch/task-1/review-package.md'
}

post() {
    check-transcript skill-called hyperpowers:requesting-code-review
    # Dossier exists: the agent assembled a review dossier before launching lenses.
    command-succeeds 'RH="$(dirname "$QUORUM_AGENT_CONFIG_DIR")"; D=$(find "$RH/.cache/hyperpowers/codex-review" -name dossier.md | head -1); test -n "$D"'
    # Round 1: exactly one logical round for the whole batch.
    command-succeeds 'RH="$(dirname "$QUORUM_AGENT_CONFIG_DIR")"; G=$(dirname "$(find "$RH/.cache/hyperpowers/codex-review" -name dossier.md | head -1)"); test -f "$G/gate-round.json" && node -e "const d=require(\"fs\").readFileSync(process.argv[1],\"utf8\"); const obj=JSON.parse(d); process.exit(obj.round===1?0:1)" "$G/gate-round.json"'
    # Exactly 3 lens prompts: the three-lens fan-out generates 3 lens-*-prompt.md files.
    command-succeeds 'RH="$(dirname "$QUORUM_AGENT_CONFIG_DIR")"; G=$(dirname "$(find "$RH/.cache/hyperpowers/codex-review" -name dossier.md | head -1)"); test $(ls "$G" | grep -c "^lens-.*-prompt.md$") -eq 3'
    # Exactly 3 lens captures: the three-lens fan-out captures each lens's output.
    command-succeeds 'RH="$(dirname "$QUORUM_AGENT_CONFIG_DIR")"; G=$(dirname "$(find "$RH/.cache/hyperpowers/codex-review" -name dossier.md | head -1)"); test $(ls "$G" | grep -c "^lens-.*-capture$") -eq 3'
}
