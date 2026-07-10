pre() {
    git-repo
    git-branch main
    requires-tool python3
    file-exists 'compute.py'
    file-exists 'benchmark.py'
    file-exists 'verify.py'
    file-contains 'compute.py' 'def process_items'
    command-succeeds 'git rev-parse --verify baseline-compute'
}

post() {
    # The skill's core discipline: measure before deciding.
    check-transcript skill-called hyperpowers:optimizing-performance
    # The benchmark harness must actually have been executed.
    check-transcript tool-arg-match Bash --matches 'command=.*benchmark\.py'
    # Correctness must be preserved by whatever implementation is left behind.
    command-succeeds 'python3 verify.py'
    # This fixture is designed so NO rewrite beats the 10% materiality bar over
    # benchmark noise (the original is already the fast idiom; verified with
    # python3 timing runs). The disciplined outcome is therefore to revert to the
    # original: the final compute.py must be byte-identical to the baseline.
    # Diffing against the baseline-compute tag survives any commits the agent
    # makes, so a kept below-bar change (or a fabricated speedup) fails here.
    #
    # Residual reliance on Gauntlet grading: the general "keep only a measured
    # >=bar win" branch of the contract is not deterministically expressible
    # (the win is measured at runtime). Because this fixture admits no such win,
    # the byte-identical-revert check IS the correct deterministic contract here;
    # the AC prose grades the fabricate-a-speedup and measurement-evidence
    # judgments the deterministic checks cannot.
    command-succeeds 'git diff --quiet baseline-compute -- compute.py'
}
