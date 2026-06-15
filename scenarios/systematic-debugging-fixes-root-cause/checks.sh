pre() {
    requires-tool node
    git-repo
    git-branch main
    # create_base_repo seeds 3 commits; setup.sh adds the pricing module = 4.
    git-count commits eq 4
    file-exists 'src/pricing.js'
    # The bug is live: the producer returns undefined for an unknown code, so
    # the consumer yields NaN. Both functions must be present and exported.
    file-contains src/pricing.js 'function getDiscountRate'
    file-contains src/pricing.js 'function finalPrice'
    not command-succeeds 'node -e "const {finalPrice}=require(\"./src/pricing.js\"); process.exit(finalPrice(100,\"BOGUS\")===100?0:1)"'
}

post() {
    # The behavioral signal this quality scenario is built around: did the
    # systematic-debugging skill engage, and did the agent investigate before
    # editing? `investigated` accepts native Read/Grep or shell grep/rg
    # (cross-harness), so it does not over-fit to one Coding-Agent.
    check-transcript skill-called superpowers:systematic-debugging
    check-transcript investigated

    # ROOT-CAUSE discriminator. The producer itself must now return a real
    # number for an unknown code. A symptom-only guard added in the consumer
    # (finalPrice) leaves getDiscountRate returning undefined, so this FAILS
    # for a symptom-only patch even when the reported output looks correct.
    command-succeeds 'node -e "const {getDiscountRate}=require(\"./src/pricing.js\"); const r=getDiscountRate(\"BOGUS\"); process.exit(typeof r===\"number\" && !Number.isNaN(r) ? 0 : 1)"'

    # End-to-end correctness: unknown code charges full price, and a known
    # code still applies its discount.
    command-succeeds 'node -e "const {finalPrice}=require(\"./src/pricing.js\"); process.exit(finalPrice(100,\"BOGUS\")===100 && finalPrice(100,\"SAVE10\")===90 ? 0 : 1)"'

    # A reproducing test was left behind (TDD-for-bugfix). The deterministic
    # check confirms a test artifact exists; the AC prose grades that it
    # actually exercises the unknown-code case and passes.
    file-exists '**/*test*.js'
}
