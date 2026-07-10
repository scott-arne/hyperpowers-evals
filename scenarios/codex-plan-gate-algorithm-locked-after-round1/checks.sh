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
    # The ledger lock exists in the per-run home cache (quorum pins $HOME to the
    # run's throwaway home, so this greps only this run's gate scratch).
    command-succeeds "grep -rq 'Algorithm locked:' \"$HOME/.cache/hyperpowers/codex-review\""
}
