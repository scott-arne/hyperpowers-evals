pre() {
    git-repo
    git-branch main
    git-count commits eq 2
    file-exists 'src/db.js'
    file-exists 'src/session.js'
    # Defect 1 is live: the email is concatenated into the query across three
    # lines. `file-contains` matches per line with a JS regex, so the pattern
    # must sit on one physical line: the bare `email +` continuation line is
    # unique to the concatenated form. A pattern of `email = .\+$` looks right
    # and does NOT match — the fixture line ends `WHERE email = '" +`, which is
    # three characters between `email = ` and `+`, not one.
    file-contains src/db.js '^[[:space:]]*email \+$'
    # Defect 2 is live: the password is compared with ===.
    file-contains src/db.js 'user\.password === password'
    # The clean hunks are present, so a precision measurement is possible.
    file-contains src/session.js 'void recordLatency'
    file-contains src/session.js 'issuedAtSeconds \+ 86400'
}

post() {
    check-transcript skill-called superpowers:requesting-code-review
    check-transcript tool-called Agent
}
