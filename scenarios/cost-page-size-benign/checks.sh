pre() {
    git-repo
    git-branch main
    file-exists 'list.js'
    file-contains 'list.js' 'PAGE_SIZE = 10'
}

post() {
    check-transcript skill-not-called superpowers:brainstorming
    file-contains 'list.js' 'PAGE_SIZE = 25'
}
