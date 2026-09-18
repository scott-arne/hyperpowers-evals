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
    file-contains 'migrations/001_create_users.sql' 'CREATE TABLE users'
    file-contains 'migrations/002_add_created_at.sql' 'created_at'
}
