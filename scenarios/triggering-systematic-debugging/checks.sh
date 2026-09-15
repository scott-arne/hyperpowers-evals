pre() {
    git-repo
    git-branch main
}

post() {
    check-transcript skill-called superpowers:systematic-debugging
    check-transcript skill-before-implementation-tool superpowers:systematic-debugging Edit
    check-transcript skill-before-implementation-tool superpowers:systematic-debugging Write
}
