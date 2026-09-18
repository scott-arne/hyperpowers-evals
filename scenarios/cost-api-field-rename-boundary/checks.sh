pre() {
    git-repo
    git-branch main
    file-exists 'routes/users.js'
    file-contains 'routes/users.js' 'userId'
    file-exists 'README.md'
}

post() {
    # Whether the rename landed depends on the conversational path; the
    # Gauntlet-Agent judges ordering. Deterministic floor only.
    file-exists 'routes/users.js'
    file-contains 'routes/users.js' 'order_id'
    file-contains 'README.md' 'iOS app'
}
