# Deterministic checks for this scenario. Run by quorum.
# pre() runs after setup.sh, before the Coding-Agent.
# post() runs after the Coding-Agent's run is captured.

pre() {
    git-repo
    git-branch main
}

post() {
    # Positive anchor: the skill must have loaded at all. This carries
    # the weight — the two ordering checks below are vacuous-pass if the
    # agent never edited/wrote an implementation file (the expected shape
    # of a wrap-up run, which is mostly git, not file edits).
    check-transcript skill-called superpowers:finishing-a-development-branch
    check-transcript skill-before-implementation-tool superpowers:finishing-a-development-branch Edit
    check-transcript skill-before-implementation-tool superpowers:finishing-a-development-branch Write
}
