# coding-agents: claude, claude-vertex, claude-bedrock, claude-auto, claude-sonnet, claude-haiku
pre() {
    git-repo
    git-branch main
    requires-tool node
    file-exists 'spec.md'
    file-contains 'spec.md' 'nested loop scan'
}

post() {
    # The skill fired.
    check-transcript skill-called hyperpowers:writing-plans
    # A second Codex call (confirming re-review) actually ran.
    file-exists 'codex-stub-calls/call-2.md'
    # The round-2 prompt contains the lock preamble line.
    file-contains 'codex-stub-calls/call-2.md' 'locked per the ledger'
    # The round-2 prompt omits the Algorithm Assessment section (one-shot contract).
    not file-contains 'codex-stub-calls/call-2.md' 'Algorithm Assessment (round 1 only)'
    # The ledger lock exists in this run's throwaway-home cache. Checks run
    # host-side, so $HOME here is the HOST home — grep the pinned run home via
    # QUORUM_RUN_DIR instead (a bare $HOME grep can pass on stale state left
    # by unrelated sessions on this machine).
    command-succeeds "grep -rq 'Algorithm locked:' \"$QUORUM_RUN_DIR/home/.cache/hyperpowers/codex-review\""
}
