# Reviewer precision and recall on a realistic diff. The fixture plants two
# real defects in src/handlers.js and six hunks that are correct as written but
# shaped to invite a category finding. The design principle: a clean hunk is
# one where any blocking finding cannot name a trigger; a planted bug is one
# where it can. The deterministic checks assert only the fixture's shape and
# that the skill fired with a dispatched reviewer. Which findings the review
# raised, and against what, is semantic and lives in the story's Acceptance
# Criteria plus the evidence directory's measure script.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch main
    command-succeeds 'test "$(git rev-list --count HEAD)" -eq 2'

    # The two planted bugs.
    file-contains 'src/handlers.js' 'page \* size'
    file-contains 'src/handlers.js' '^[[:space:]]*store\.saveOrder\(order\);$'

    # One anchor per clean hunk, so a fixture that lost one fails here rather
    # than quietly weakening the measurement.
    file-contains 'src/util.js' 'async function withRetry'
    file-contains 'src/config.js' 'Read once at startup'
    file-contains 'src/util.js' 'function parseOrderId'
    file-contains 'src/store.js' 'orders.slice'
    file-contains 'src/handlers.js' 'list failed'
    file-contains 'test/handlers.test.js' 'Date.UTC'
}

post() {
    check-transcript skill-called superpowers:requesting-code-review hyperpowers:requesting-code-review
    check-transcript tool-called Agent
}
