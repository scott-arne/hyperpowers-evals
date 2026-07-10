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
    # Assert the agent actually measured, consistent with the AC prose (which
    # allows cProfile OR timing instrumentation). Accept any of the common
    # measurement methods in a Bash command: cProfile / -m profile, perf_counter,
    # timeit, py-spy, or time.time().
    #
    # Residual reliance on Gauntlet grading: if the agent measures by writing a
    # standalone profiling script and running it purely by filename, that Bash
    # command carries none of these tokens and would not match here — the AC
    # prose then carries the measurement-evidence and ranked-candidates
    # judgments the deterministic check cannot.
    check-transcript tool-arg-match Bash --matches 'command=cProfile|-m profile|perf_counter|timeit|py-spy|time\.time' --ignore-case
}
