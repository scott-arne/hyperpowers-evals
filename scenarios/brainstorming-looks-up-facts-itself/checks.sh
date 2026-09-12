pre() {
    git-repo
    git-branch main
    git-count commits eq 3
    file-exists 'README.md'
    file-exists 'pyproject.toml'
    file-exists 'src/reportkit/cli.py'
    # The facts the agent must not ask about are on disk.
    file-contains README.md 'PostgreSQL is the only supported backend'
    file-contains pyproject.toml 'requires-python = ">=3.12"'
    file-contains pyproject.toml 'pytest>=8.0'
}

post() {
    check-transcript skill-called superpowers:brainstorming

    # `investigated` is deliberately absent. The verb accepts ONLY native
    # Read/Grep or a Bash command matching grep/rg (src/check/verbs.ts); it
    # rejects Glob, cat, and ls, all three of which this scenario's criteria
    # name as valid investigation. Because one failed post-check downgrades
    # the verdict on its own (src/composer.ts), the verb would hard-fail a
    # correct run whose agent explored with Glob or cat. It also has no
    # ordering semantics — it passes on any qualifying call anywhere in the
    # run — while the criterion it would support grades investigation BEFORE
    # the first question, which no transcript verb can witness. Investigation
    # is graded through the acceptance criteria alone. Do not re-add this
    # without a verb whose vocabulary matches the criteria and that can order
    # a tool call against an agent message.
}
