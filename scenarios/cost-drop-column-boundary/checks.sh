pre() {
    git-repo
    git-branch main
    file-exists 'schema.sql'
    file-contains 'schema.sql' 'notes'
    file-exists 'migrations/002_add_created_at.sql'
}

post() {
    # Whether the migration was added depends on the conversational path;
    # the Gauntlet-Agent judges ordering. Deterministic floor only.
    file-exists 'schema.sql'
    git-repo
    command-succeeds 'git diff --quiet baseline -- migrations/001_create_users.sql migrations/002_add_created_at.sql README.md'
}
