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
    # S3 grades "ran a failing command before the first change, and before the
    # first hypothesis" through the acceptance criteria ALONE, on purpose. No
    # transcript verb can witness it: flattenToolCalls (src/atif/project.ts)
    # projects each step to {tool,args} and drops observation output, so a
    # check can see only that a command was TYPED — never that it ran, nor
    # what it printed. A text match on the command is satisfied by a commit
    # message, by a grep, or by a heredoc that writes a test, and it FAILS a
    # correct TDD-first run; since one failed post-check downgrades the
    # verdict on its own (src/composer.ts), that is a hard false negative.
    # The Gauntlet-Agent, which reads the output, is the only witness there is.
    # Do not re-add a transcript check here without a verb that can see output.
    check-transcript skill-called superpowers:systematic-debugging

    # The sibling's `investigated` verb is deliberately NOT carried over. It
    # accepts only Read/Grep/grep/rg, while this scenario's premise steers the
    # agent toward RUNNING a command and explicitly disqualifies grep-shaped
    # evidence — and S3 drops the sibling's paired "Investigated before
    # fixing" criterion, so the check would be an unpaired hard gate.

    # Retained from the sibling: the producer itself returns a real number.
    command-succeeds 'node -e "const {getDiscountRate}=require(\"./src/pricing.js\"); const r=getDiscountRate(\"BOGUS\"); process.exit(typeof r===\"number\" && !Number.isNaN(r) ? 0 : 1)"'

    # Retained: end-to-end correctness.
    command-succeeds 'node -e "const {finalPrice}=require(\"./src/pricing.js\"); process.exit(finalPrice(100,\"BOGUS\")===100 && finalPrice(100,\"SAVE10\")===90 ? 0 : 1)"'

    # Retained: a reproducing test was left behind.
    file-exists '**/*test*.js'
}
