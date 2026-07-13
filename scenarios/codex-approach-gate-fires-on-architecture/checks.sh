# coding-agents: claude, claude-vertex, claude-bedrock, claude-auto, claude-sonnet, claude-haiku
pre() {
    git-repo
    git-branch main
    requires-tool node
}

post() {
    # The skill fired.
    check-transcript skill-called hyperpowers:brainstorming
    # The stub was actually invoked (deterministic artifact exists).
    file-exists 'codex-stub-calls/call-1.md'
    # The prompt hands Codex the blind context file. Per the skill's handoff
    # design the prompt itself carries only the pointer + output schema, so
    # the verbatim-idea assertion must target the context file, not call-1.md.
    file-contains 'codex-stub-calls/call-1.md' 'approach-context.md'
    # The blind handoff carried the verbatim idea (codename marker). The
    # context file lives in the gate's scratch dir under the run's throwaway
    # home cache (codex-review-dir contract), not in the workdir.
    command-succeeds "grep -rq 'FIXTURE-IDEA-7Q4' \"$QUORUM_RUN_DIR/home/.cache/hyperpowers/codex-review\""
    # Note: exclusion-of-own-approaches and provenance-tagging are graded by
    # the Gauntlet-Agent's AC evaluation — the check DSL has no deterministic
    # verb for "does not contain approaches the agent invented at runtime."
}
