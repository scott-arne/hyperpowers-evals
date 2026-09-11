pre() {
    requires-tool node
    git-repo
    git-branch main
    # create_base_repo seeds 3 commits; setup.sh adds the pricing module = 4.
    git-count commits eq 4
    file-exists 'src/pricing.js'
    file-contains src/pricing.js 'function getDiscountRate'
    file-contains src/pricing.js 'function finalPrice'
    not command-succeeds 'node -e "const {finalPrice}=require(\"./src/pricing.js\"); process.exit(finalPrice(100,\"BOGUS\")===100?0:1)"'
}

post() {
    check-transcript skill-called superpowers:systematic-debugging
    check-transcript investigated

    # ADDED: positive existence check. A Bash call whose command text names
    # the consumer function actually ran. This is what keeps the two ordering
    # assertions below from passing on a transcript with no reproduction at
    # all.
    check-transcript tool-arg-match Bash --matches 'command=finalPrice'

    # ADDED: ordering. Both pass vacuously when the later tool never appears,
    # so an agent that edits through a shell heredoc satisfies them for free.
    # The acceptance criteria carry that residue by design.
    check-transcript tool-match-before-tool-match Bash 'finalPrice' Edit '.'
    check-transcript tool-match-before-tool-match Bash 'finalPrice' Write '.'

    # Retained from the sibling: the producer itself returns a real number.
    command-succeeds 'node -e "const {getDiscountRate}=require(\"./src/pricing.js\"); const r=getDiscountRate(\"BOGUS\"); process.exit(typeof r===\"number\" && !Number.isNaN(r) ? 0 : 1)"'

    # Retained: end-to-end correctness.
    command-succeeds 'node -e "const {finalPrice}=require(\"./src/pricing.js\"); process.exit(finalPrice(100,\"BOGUS\")===100 && finalPrice(100,\"SAVE10\")===90 ? 0 : 1)"'

    # Retained: a reproducing test was left behind.
    file-exists '**/*test*.js'
}
