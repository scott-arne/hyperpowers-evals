pre() {
    git-repo
    git-branch main
    requires-tool python3
    file-exists 'analyzer.py'
    file-contains 'analyzer.py' 'def format_log'
    file-contains 'analyzer.py' 'def process_data'
}

post() {
    check-transcript skill-called hyperpowers:profiling-performance
    # Check that profiling was actually run - look for cProfile or timing measurements
    # The agent should run python with profiling enabled or add timing code
    check-transcript tool-arg-match Bash --matches 'command=.*python.*cProfile' --ignore-case
}
