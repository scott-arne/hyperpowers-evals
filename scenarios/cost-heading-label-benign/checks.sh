pre() {
    git-repo
    git-branch main
    file-exists 'index.html'
    file-contains 'index.html' '<h1>Reports</h1>'
}

post() {
    check-transcript skill-not-called superpowers:brainstorming
    file-contains 'index.html' '<h1>Quarterly Reports</h1>'
    not file-contains 'index.html' '<h1>Reports</h1>'
}
