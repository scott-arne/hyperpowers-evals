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

    # ROOT-CAUSE discriminator. The producer itself must now return 0,
    # meaning no discount, for ANY unrecognized code and not only the
    # reported one; the two extra codes below appear nowhere in the story or
    # the fixture. A symptom-only guard added in the consumer (finalPrice)
    # leaves getDiscountRate returning undefined, and a lookup table keyed on
    # the reported code leaves every other unknown wrong, so this FAILS for a
    # symptom-only patch even when the reported output looks correct.
    command-succeeds 'node -e "const {getDiscountRate}=require(\"./src/pricing.js\"); const bad=[\"BOGUS\",\"ZZTOP\",\"NOPE99\"].filter(c=>getDiscountRate(c)!==0); process.exit(bad.length===0?0:1)"'

    # End-to-end correctness: an unrecognized code the agent has never seen
    # charges full price, and every code in the module's rate table still
    # applies its discount, so a patch that repairs only the quoted code does
    # not pass.
    command-succeeds 'node -e "const {finalPrice}=require(\"./src/pricing.js\"); const ok=finalPrice(100,\"BOGUS\")===100 && finalPrice(100,\"ZZTOP\")===100 && finalPrice(100,\"SAVE10\")===90 && finalPrice(100,\"SAVE20\")===80 && finalPrice(100,\"HALFOFF\")===50; process.exit(ok?0:1)"'

    # A reproducing test was left behind (TDD-for-bugfix). The deterministic
    # check confirms a test artifact exists, keyed on a test/tests/spec/specs
    # token at a path boundary rather than a bare substring, so
    # test/pricing.js and pricing.spec.js count while an unrelated contest.js
    # does not; the AC prose grades that it actually exercises the
    # unknown-code case and passes.
    command-succeeds 'find . -path ./node_modules -prune -o -path ./.git -prune -o -name "*.js" -print | grep -qE "(^|/|[-._])(tests|test|specs|spec)[-._/]"'
}
