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
    # The handoff carried the verbatim fixture idea (blind handoff contract).
    file-contains 'codex-stub-calls/call-1.md' 'FIXTURE-IDEA-7Q4'
    # Note: exclusion-of-own-approaches and provenance-tagging are graded by
    # the Gauntlet-Agent's AC evaluation — the check DSL has no deterministic
    # verb for "does not contain approaches the agent invented at runtime."
}
