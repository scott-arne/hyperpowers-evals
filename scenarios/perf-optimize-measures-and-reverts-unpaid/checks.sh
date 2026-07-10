pre() {
    git-repo
    git-branch main
    requires-tool python3
    file-exists 'compute.py'
    file-exists 'benchmark.py'
    file-contains 'compute.py' 'def process_items'
}

post() {
    check-transcript skill-called hyperpowers:optimizing-performance
    check-transcript tool-arg-match Bash --matches 'command=.*benchmark\.py'
    # The agent must either keep the original implementation (reverted) OR
    # have a measured improvement. We can't deterministically verify the
    # measured improvement here, but we can verify the benchmark ran and
    # the function still exists.
    file-exists 'compute.py'
    file-contains 'compute.py' 'def process_items'
}
