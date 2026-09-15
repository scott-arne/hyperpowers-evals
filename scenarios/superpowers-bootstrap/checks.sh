pre() {
    git-repo
    git-branch main
    bootstrap-installed
}

post() {
    check-transcript skill-called superpowers:brainstorming
    check-transcript skill-before-implementation-tool superpowers:brainstorming Write
    check-transcript skill-before-implementation-tool superpowers:brainstorming Edit
}
